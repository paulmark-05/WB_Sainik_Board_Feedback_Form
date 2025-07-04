require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { google } = require('googleapis');
const nodemailer = require('nodemailer');
const fs = require('fs');
const { format } = require('date-fns');

const app = express();
const PORT = process.env.PORT || 3000;

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
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON),
    scopes: [
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/spreadsheets'
    ]
  });
  const client = await auth.getClient();
  drive = google.drive({ version: 'v3', auth: client });
  sheets = google.sheets({ version: 'v4', auth: client });
  console.log('✅ Google APIs ready');
})();

const recent = new Map();
function isDuplicate(key) {
  const now = Date.now();
  const last = recent.get(key);
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

async function sendMail(data, sheetURL, driveURL, originURL) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.NOTIFY_EMAIL,
      pass: process.env.APP_PASSWORD
    }
  });

  await transporter.verify();

  const now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  const logoURL = `${originURL}/logo.jpg`;

  const htmlForAdmin = `
    <div style="font-family:Arial,sans-serif;font-size:14px;">
      <h2 style="color:rgb(48,48,172);margin-bottom:10px">📥 New Submission Received</h2>
      <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-size:14px;background:#fff">
        <tr><td><b>Name</b></td><td>${data.name}</td></tr>
        <tr><td><b>Rank</b></td><td>${data.rank}</td></tr>
        <tr><td><b>Relationship</b></td><td>${data.relationship}</td></tr>
        <tr><td><b>Branch</b></td><td>${data.branch}</td></tr>
        <tr><td><b>Phone</b></td><td>${data.phone}</td></tr>
        <tr><td><b>Email</b></td><td>${data.email || '—'}</td></tr>
        <tr><td><b>ID</b></td><td>${data.id || '—'}</td></tr>
        <tr><td><b>Feedback</b></td><td>${data.sugg || '—'}</td></tr>
        <tr><td><b>Submitted At</b></td><td>${now}</td></tr>
      </table>
      <div style="margin-top:15px;">
        <a href="${sheetURL}" target="_blank" style="background:rgb(224,60,60);color:white;padding:10px 16px;border-radius:5px;text-decoration:none;margin-right:10px">📊 View Sheet</a>
        ${driveURL ? `<a href="${driveURL}" target="_blank" style="background:rgb(39,170,214);color:white;padding:10px 16px;border-radius:5px;text-decoration:none">📁 View Files</a>` : ''}
      </div>
    </div>
  `;

  const htmlForUser = `
    <div style="font-family:Arial,sans-serif;font-size:15px;background:#f7f9fc;padding:20px;border-radius:10px;border:1px solid #ddd;max-width:600px;margin:auto">
      <div style="text-align:center;margin-bottom:20px">
        <img src="${logoURL}" alt="WB Sainik Board" height="80" style="margin:auto">
      </div>
      <h2 style="color:rgb(48,48,172);text-align:center">✅ Submission Successful</h2>
      <p>Dear <strong>${data.name}</strong>,</p>
      <p>We’ve received your form successfully on <strong>${now}</strong>.</p>
      <p>Thank you for submitting your feedback to the <b>WB Sainik Board</b>.</p>
      <p style="margin-top:20px;color:#333">You may close this email. No further action is required.</p>
      <hr style="margin:30px 0; border:none; border-top:1px solid #ccc">
      <p style="font-size:13px;color:#666;text-align:center">This is an automated confirmation.<br>– WB Sainik Board</p>
    </div>
  `;

  const subject = `New Submission: ${data.rank}-${data.name} (${data.branch})`;

  await transporter.sendMail({
    from: `WB Sainik Board <${process.env.NOTIFY_EMAIL}>`,
    to: process.env.NOTIFY_EMAIL,
    subject,
    html: htmlForAdmin
  });

  if (data.email && data.email.includes('@')) {
    await transporter.sendMail({
      from: `WB Sainik Board <${process.env.NOTIFY_EMAIL}>`,
      to: data.email,
      subject: '✅ Your form has been received – WB Sainik Board',
      html: htmlForUser
    });
  }
}

app.post('/submit', upload.array('upload', 10), async (req, res) => {
  const data = req.body;
  const files = req.files || [];

  if (!data.name || !data.phone || !data.rank || !data.branch || !data.relationship) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  if (isDuplicate(`${data.name}_${data.phone}`)) {
    return res.status(429).json({ success: false, error: 'Please wait 30 seconds before resubmitting' });
  }

  try {
    let driveFolderLink = '-';

    if (files.length > 0) {
      const branchFolder = await ensureFolder(process.env.DRIVE_FOLDER_ID, branchClean(data.branch));
      const personFolder = await ensureFolder(branchFolder, clean(`${data.rank}-${data.name}`));
      const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
      const tsFolder = await ensureFolder(personFolder, timestamp);

      for (const f of files) {
        await drive.files.create({
          resource: { name: f.originalname, parents: [tsFolder] },
          media: { mimeType: f.mimetype, body: fs.createReadStream(f.path) },
          fields: 'webViewLink'
        });
        fs.unlinkSync(f.path);
      }

      driveFolderLink = `https://drive.google.com/drive/folders/${tsFolder}`;
    }

    const sheetRow = [
      new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      data.rank,
      data.name,
      data.relationship,
      '',
      data.email || '',
      data.phone,
      data.branch,
      data.id || '',
      data.sugg || '',
      driveFolderLink
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SHEET_ID,
      range: 'Sheet1',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [sheetRow] }
    });

    const sheetURL = `https://docs.google.com/spreadsheets/d/${process.env.SHEET_ID}/edit`;
    const origin = `${req.protocol}://${req.get('host')}`;
    await sendMail(data, sheetURL, driveFolderLink !== '-' ? driveFolderLink : null, origin);

    res.json({ success: true, message: 'Form submitted successfully' });
  } catch (err) {
    console.error('❌ Submission Error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', time: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
