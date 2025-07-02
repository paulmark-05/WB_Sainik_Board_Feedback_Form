const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { google } = require('googleapis');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Multer config for file uploads
const upload = multer({ dest: 'uploads/' });

// Google Auth
const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON),
  scopes: [
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/spreadsheets'
  ]
});

// Load APIs
let drive, sheets;
auth.getClient().then(authClient => {
  drive = google.drive({ version: 'v3', auth: authClient });
  sheets = google.sheets({ version: 'v4', auth: authClient });
});

// Main POST /submit route
app.post('/submit', upload.array('upload', 10), async (req, res) => {
  try {
    const data = req.body;
    const files = req.files || [];

    // Create Drive folder structure
    const branchName = cleanFolderName(data.branch || "Uncategorized");
    const subFolderName = cleanFolderName(`${data.rank} - ${data.name}`);
    const parentFolderId = await ensureFolder(process.env.DRIVE_FOLDER_ID, branchName);
    const userFolderId = await ensureFolder(parentFolderId, subFolderName);

    // Upload files to Google Drive
    const uploadedFileLinks = [];
    for (let file of files) {
      const fileMeta = {
        name: file.originalname,
        parents: [userFolderId]
      };
      const media = {
        mimeType: file.mimetype,
        body: fs.createReadStream(file.path)
      };
      const uploadedFile = await drive.files.create({
        resource: fileMeta,
        media: media,
        fields: 'id, webViewLink'
      });
      uploadedFileLinks.push(uploadedFile.data.webViewLink);
      fs.unlinkSync(file.path); // delete local file
    }

    // Append form data to Google Sheet
    const sheetValues = [
      new Date().toLocaleString(),
      data.rank,
      data.name,
      data.email,
      data.phone,
      data.branch,
      data.id,
      data.sugg,
      uploadedFileLinks.join(', ')
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SHEET_ID,
      range: "Sheet1",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [sheetValues]
      }
    });

    // Send Email Notification via Nodemailer
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.NOTIFY_EMAIL,
        pass: process.env.APP_PASSWORD
      }
    });

    const mailOptions = {
      from: `"Feedback Form" <${process.env.NOTIFY_EMAIL}>`,
      to: process.env.NOTIFY_EMAIL,
      subject: `📬 New Form Submission from ${data.name}`,
      text: `
You have a new form submission.

Name: ${data.name}
Rank: ${data.rank}
Branch: ${data.branch}
Phone: ${data.phone}
Email: ${data.email}
Suggestion: ${data.sugg || 'N/A'}

📎 Files: ${uploadedFileLinks.join('\n')}
🔗 View all submissions: https://docs.google.com/spreadsheets/d/${process.env.SHEET_ID}/edit
`
    };

    await transporter.sendMail(mailOptions);

    res.json({ message: "✅ Form submitted successfully!" });

  } catch (err) {
    console.error("❌ Error in /submit:", err);
    res.status(500).json({ message: "❌ Failed to submit form" });
  }
});

// Utility: create folder in Drive if it doesn’t exist
async function ensureFolder(parentId, folderName) {
  const search = await drive.files.list({
    q: `'${parentId}' in parents and name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name)'
  });
  if (search.data.files.length > 0) {
    return search.data.files[0].id;
  }

  const folder = await drive.files.create({
    resource: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId]
    },
    fields: 'id'
  });
  return folder.data.id;
}

// Utility: cleanup folder name
function cleanFolderName(name) {
  return name.replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ').trim();
}

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
