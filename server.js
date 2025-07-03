require('dotenv').config();
const express    = require('express');
const multer     = require('multer');
const cors       = require('cors');
const { google } = require('googleapis');
const nodemailer = require('nodemailer');
const fs         = require('fs');
const { format } = require('date-fns');

const app = express(), PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024, files: 10 }
});

let drive, sheets;
(async () => {
  if (!process.env.GOOGLE_CREDENTIALS_JSON) return;
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
  if (!process.env.NOTIFY_EMAIL || !process.env.APP_PASSWORD) throw new Error('Email not configured');
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
      <tr><td><b>Email</b></td><td>${data.email||'—'}</td></tr>
      <tr><td><b>ID Card</b></td><td>${data.id||'—'}</td></tr>
      <tr><td><b>Feedback</b></td><td>${data.sugg||'—'}</td></tr>
    </table><br>
    <p><a href="${sheetURL}" target="_blank">📊 View Spreadsheet</a> | 
       <a href="${driveURL}" target="_blank">📁 View Drive Folder</a></p>`;
  await transporter.sendMail({
    from: `"WB Sainik Board"<${process.env.NOTIFY_EMAIL}>`,
    to: process.env.NOTIFY_EMAIL,
    subject: `New Submission: ${data.rank}-${data.name} (${data.branch})`,
    html
  });
}

app.post('/submit', upload.array('upload', 10), async (req, res) => {
  const d = req.body, files = req.files || [];
  if (!d.name || !d.phone || !d.rank || !d.branch || !d.relationship) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }
  if (isDuplicate(`${d.name}_${d.phone}`)) {
    return res.status(429).json({ success: false, error: 'Please wait 30 seconds before re-submitting' });
  }
  try {
    const br = branchClean(d.branch);
    const bf = await ensureFolder(process.env.DRIVE_FOLDER_ID, br);
    const pf = await ensureFolder(bf, clean(`${d.rank}-${d.name}`));
    const ts = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
    const tf = await ensureFolder(pf, ts);

    for (const f of files) {
      await drive.files.create({
        resource: { name: f.originalname, parents: [tf] },
        media: { mimeType: f.mimetype, body: fs.createReadStream(f.path) },
        fields: 'webViewLink'
      });
      fs.unlinkSync(f.path);
    }

    const row = [
      new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      d.rank, d.name, d.relationship, '',
      d.email||'', d.phone, d.branch, d.id||'', d.sugg||'',
      `https://drive.google.com/drive/folders/${tf}`
    ];
    const sheetURL = `https://docs.google.com/spreadsheets/d/${process.env.SHEET_ID}/edit`;
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SHEET_ID,
      range: 'Sheet1',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [row] }
    });

    await sendMail(d, sheetURL, `https://drive.google.com/drive/folders/${tf}`);
    res.json({ success: true, message: 'Form submitted successfully' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', time: new Date().toISOString() });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
