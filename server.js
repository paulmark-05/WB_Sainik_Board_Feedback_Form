require('dotenv').config();
const express    = require('express');
const multer     = require('multer');
const cors       = require('cors');
const { google } = require('googleapis');
const nodemailer = require('nodemailer');
const fs         = require('fs');
const { format } = require('date-fns');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Multer config: up to 10 files, each ≤ 10MB
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024, files: 10 }
});

let drive, sheets;
(async () => {
  if (!process.env.GOOGLE_CREDENTIALS_JSON) {
    console.warn('⚠️ GOOGLE_CREDENTIALS_JSON not set; Drive/Sheets disabled');
    return;
  }
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON),
    scopes: [
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/spreadsheets'
    ]
  });
  const client = await auth.getClient();
  drive  = google.drive({ version: 'v3', auth: client });
  sheets = google.sheets({ version: 'v4', auth: client });
  console.log('✅ Google Drive & Sheets initialized');
})();

const recent = new Map();
function isDuplicate(key) {
  const now = Date.now(), last = recent.get(key);
  if (last && now - last < 30000) return true;
  recent.set(key, now);
  return false;
}

function clean(str) {
  return str.replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ').trim();
}
function branchClean(full) {
  return clean(full.split('(')[0]);
}

async function ensureFolder(parentId, name) {
  const q = `'${parentId}' in parents and name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const res = await drive.files.list({ q, fields: 'files(id)' });
  if (res.data.files.length) return res.data.files[0].id;
  const folder = await drive.files.create({
    resource: { name, parents: [parentId], mimeType: 'application/vnd.google-apps.folder' },
    fields: 'id'
  });
  return folder.data.id;
}

async function sendMail(data, sheetURL, driveURL) {
  if (!process.env.NOTIFY_EMAIL || !process.env.APP_PASSWORD) {
    throw new Error('Email not configured');
  }
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.NOTIFY_EMAIL, pass: process.env.APP_PASSWORD }
  });
  await transporter.verify();
  const html = `
    <table border="1" cellpadding="6" style="border-collapse:collapse;font-family:Arial;font-size:14px">
      <tr><td><b>Name</b></td><td>${data.name}</td></tr>
      <tr><td><b>Rank</b></td><td>${data.rank}</td></tr>
      <tr><td><b>Relationship</b></td><td>${data.relationship}</td></tr>
      <tr><td><b>Branch</b></td><td>${data.branch}</td></tr>
      <tr><td><b>Phone</b></td><td>${data.phone}</td></tr>
      <tr><td><b>Email</b></td><td>${data.email || '—'}</td></tr>
      <tr><td><b>ID Card</b></td><td>${data.id || '—'}</td></tr>
      <tr><td><b>Feedback</b></td><td>${data.sugg || '—'}</td></tr>
    </table>
    <p><a href="${sheetURL}" target="_blank">📊 View Spreadsheet</a> | 
       <a href="${driveURL}" target="_blank">📁 View Drive Folder</a></p>`;
  await transporter.sendMail({
    from: `"WB Sainik Board" <${process.env.NOTIFY_EMAIL}>`,
    to: process.env.NOTIFY_EMAIL,
    subject: `New Submission: ${data.rank}-${data.name} (${data.branch})`,
    html
  });
}

app.post('/submit', upload.array('upload', 10), async (req, res) => {
  const data  = req.body;
  const files = req.files || [];
  if (!data.name || !data.phone || !data.rank || !data.branch || !data.relationship) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }
  if (isDuplicate(`${data.name}_${data.phone}`)) {
    return res.status(429).json({ success: false, error: 'Please wait 30 seconds before re-submitting' });
  }
  try {
    // Create folder hierarchy: Branch → Rank-Name → Timestamp
    const br = branchClean(data.branch);
    const bf = await ensureFolder(process.env.DRIVE_FOLDER_ID, br);
    const pf = await ensureFolder(bf, clean(`${data.rank}-${data.name}`));
    const ts = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
    const tf = await ensureFolder(pf, ts);

    // Upload files
    for (const f of files) {
      await drive.files.create({
        resource: { name: f.originalname, parents: [tf] },
        media: { mimeType: f.mimetype, body: fs.createReadStream(f.path) },
        fields: 'webViewLink'
      });
      fs.unlinkSync(f.path);
    }

    // Append to Google Sheet
    const row = [
      new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      data.rank, data.name, data.relationship, '',
      data.email || '', data.phone, data.branch,
      data.id || '', data.sugg || '',
      `https://drive.google.com/drive/folders/${tf}`
    ];
    const sheetURL = `https://docs.google.com/spreadsheets/d/${process.env.SHEET_ID}/edit`;
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SHEET_ID,
      range: 'Sheet1',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [row] }
    });

    // Send email
    await sendMail(data, sheetURL, `https://drive.google.com/drive/folders/${tf}`);
    res.json({ success: true, message: 'Form submitted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', time: new Date().toISOString() });
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
