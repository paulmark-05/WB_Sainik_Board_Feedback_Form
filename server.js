/********************************************************************
 *  West Bengal Sainik Board –  Feedback / Grievance  API (Node + Express)
 *******************************************************************/
const express      = require('express');
const multer       = require('multer');
const cors         = require('cors');
const { google }   = require('googleapis');
const nodemailer   = require('nodemailer');
const fs           = require('fs');

const app  = express();
const PORT = process.env.PORT || 3000;

/* ─────────────────────────  MIDDLEWARE  ───────────────────────── */
app.use(cors());
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ─────────────────────────  MULTER (10 files ≤ 10 MB) ─────────── */
const upload = multer({
  dest   : 'uploads/',
  limits : { fileSize: 10 * 1024 * 1024, files: 10 },
  fileFilter: (req, file, cb) => {
    console.log(`File upload ▶︎ ${file.originalname}`);
    cb(null, true);
  }
});

/* ───────────────────────  GOOGLE  DRIVE / SHEETS  ─────────────── */
let drive, sheets;
(async () => {
  try {
    if (!process.env.GOOGLE_CREDENTIALS_JSON) {
      console.log('⚠️  No Google credentials – Drive/Sheets disabled');
      return;
    }
    const creds  = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
    const auth   = new google.auth.GoogleAuth({
      credentials: creds,
      scopes: [
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/spreadsheets'
      ]
    });
    const client = await auth.getClient();
    drive  = google.drive({  version: 'v3', auth: client });
    sheets = google.sheets({ version: 'v4', auth: client });
    console.log('✅  Google APIs initialised');
  } catch (err) {
    console.error('❌ Google API init failed:', err.message);
  }
})();

/* ─────────────────────  DUPLICATE-SUBMIT GUARD (30 s) ─────────── */
const recent = new Map();
function isRecent(key) {
  const now = Date.now();
  const last = recent.get(key);
  if (last && now - last < 30_000) return true;
  recent.set(key, now);
  // trim cache > 60 s
  for (const [k, t] of recent)
    if (now - t > 60_000) recent.delete(k);
  return false;
}

/* ─────────────────────────  POST /submit  ─────────────────────── */
app.post('/submit', upload.array('upload', 10), async (req, res) => {
  const data  = req.body;
  const files = req.files || [];

  /* 1️⃣  VALIDATE REQUIRED FIELDS  */
  if (!data.name || !data.phone || !data.rank || !data.branch || !data.relationship) {
    return res.status(400).json({
      success:false,
      error:'Missing required fields (name / phone / rank / branch / relationship)'
    });
  }

  /* 2️⃣  DUPLICATE WITHIN 30 s  */
  if (isRecent(`${data.name}_${data.phone}`))
    return res.status(429).json({ success:false, error:'Please wait 30 s before re-submitting' });

  let uploadedLinks = [];
  let userFolderId  = null;

  /* 3️⃣  GOOGLE  (if enabled)  */
  if (drive && sheets) {
    try {
      const branchFolder = await ensureFolder(process.env.DRIVE_FOLDER_ID, cleanName(data.branch||'Uncategorised'));
      userFolderId       = await ensureFolder(branchFolder, cleanName(`${data.rank} - ${data.name}`));

      for (const f of files) {
        const meta  = { name:f.originalname, parents:[userFolderId] };
        const media = { mimeType:f.mimetype, body: fs.createReadStream(f.path) };
        const up    = await drive.files.create({ resource:meta, media, fields:'id,webViewLink' });
        uploadedLinks.push(up.data.webViewLink);
      }

      /*  SHEET columns :  A Time | B Rank | C Name | D Relationship | E blank |
                          F Email | G Phone | H Branch | I ID | J Feedback | K Links  */
      const row = [
        new Date().toLocaleString('en-IN',{ timeZone:'Asia/Kolkata' }),
        data.rank,
        data.name,
        data.relationship,
        data.email || '',
        data.phone,
        data.branch,
        data.id || '',
        data.sugg || '',
        uploadedLinks.join(', ')
      ];
      await sheets.spreadsheets.values.append({
        spreadsheetId : process.env.SHEET_ID,
        range          : 'Sheet1',
        valueInputOption:'USER_ENTERED',
        requestBody    : { values:[row] }
      });
      console.log('📊 Sheet updated');
    } catch (gErr) { console.error('❌ Google error:', gErr.message); }
  }

  /* 4️⃣  EMAIL  */
  try { await emailNotify(data, uploadedLinks, userFolderId); }
  catch (e) { console.error('❌ Email fail:', e.message); }

  /* 5️⃣  CLEAN TEMP FILES  */
  files.forEach(f => fs.existsSync(f.path) && fs.unlinkSync(f.path));

  res.json({ success:true, message:'Form submitted 👍' });
});

/* ────────────────────  EMAIL NOTIFICATION  ────────────────────── */
async function emailNotify(d, links, folderId) {
  if (!process.env.NOTIFY_EMAIL || !process.env.APP_PASSWORD)
    throw new Error('Email env-vars not set');

  const trans = nodemailer.createTransport({
    service:'gmail',
    auth:{ user:process.env.NOTIFY_EMAIL, pass:process.env.APP_PASSWORD }
  });
  await trans.verify();

  const sheetURL  = `https://docs.google.com/spreadsheets/d/${process.env.SHEET_ID}/edit`;
  const driveURL  = folderId ? `https://drive.google.com/drive/folders/${folderId}` : '—';

  const html = `
  <table border="1" cellpadding="6" style="border-collapse:collapse;font-family:Arial;font-size:14px">
    <tr><td><b>Name</b></td><td>${d.name}</td></tr>
    <tr><td><b>Rank</b></td><td>${d.rank}</td></tr>
    <tr><td><b>Relationship</b></td><td>${d.relationship}</td></tr>
    <tr><td><b>Branch</b></td><td>${d.branch}</td></tr>
    <tr><td><b>Phone</b></td><td>${d.phone}</td></tr>
    <tr><td><b>Email</b></td><td>${d.email||'—'}</td></tr>
    <tr><td><b>ID Card</b></td><td>${d.id||'—'}</td></tr>
    <tr><td><b>Feedback</b></td><td>${d.sugg||'—'}</td></tr>
  </table><br>
  <p><a href="${sheetURL}">Google Sheet</a> | <a href="${driveURL}">Drive folder</a></p>`;

  await trans.sendMail({
    from   : `"WB Sainik Board" <${process.env.NOTIFY_EMAIL}>`,
    to     :  process.env.NOTIFY_EMAIL,
    subject: `New Submission: ${d.rank}-${d.name} (${d.branch})`,
    html
  });
}

/* ─────────────────────  GOOGLE DRIVE HELPERS  ─────────────────── */
async function ensureFolder(parentId, name){
  const q=`'${parentId}' in parents and name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const r=await drive.files.list({ q, fields:'files(id)' });
  if (r.data.files.length) return r.data.files[0].id;
  const nf=await drive.files.create({
    resource:{ name, mimeType:'application/vnd.google-apps.folder', parents:[parentId] },
    fields:'id'
  });
  return nf.data.id;
}
const cleanName = s => s.replace(/[^\w\s-]/g,'').replace(/\s+/g,' ').trim();

/* ─────────────────────────  HEALTH  ───────────────────────────── */
app.get('/health', (req,res)=>res.json({ status:'OK', time:new Date().toISOString() }));

/* ─────────────────────────  START  ────────────────────────────── */
app.listen(PORT, ()=>console.log(`🚀  Server running @ ${PORT}`));
