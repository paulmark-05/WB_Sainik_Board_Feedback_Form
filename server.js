require('dotenv').config();

const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');

const { google } = require('googleapis');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Multer config - max 10 files, each max 10MB
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024, files: 10 }
});

// Branch emails mapping
const BRANCH_EMAILS = {
  'Rajya Sainik Board': 'rsb-wb@gov.in',
  'ZSB Burdwan': 'secy.zsb-burdwan@bangla.gov.in',
  'ZSB Coochbehar': 'secyzsb-wb.cbr@coochbehar.gov.in',
  'ZSB Dakshin Dinajpur': 'secy.zsbdd-wb@gov.in',
  'ZSB Darjeeling': 'zsbd-wb@gov.in',
  'ZSB Howrah': 'secy.zsb-howrah@bangla.gov.in',
  'ZSB Jalpaiguri': 'zsb-jalpaiguri@bangla.gov.in',
  'ZSB Kalimpong': 'zsb-kpg@bangla.gov.in',
  'ZSB Kolkata': 'zsb-kolkata@bangla.gov.in',
  'ZSB Malda': 'secy.zsb-malda@bangla.gov.in',
  'ZSB Midnapore': 'secy.zsb-midnapore@bangla.gov.in',
  'ZSB Murshidabad': 'zsb-murshidabad@bangla.gov.in',
  'ZSB Nadia': 'zsb-nadiawb@bangla.gov.in',
  'ZSB North 24 Parganas': 'zsb-barasat@nic.in',
  'ZSB South 24 Parganas': 'secy.zsb-wb.s24pgs@nic.in'
};

// Prevent rapid re-submission within 5 seconds
const recent = new Map();
function isDuplicate(key) {
  const now = Date.now();
  const last = recent.get(key);
  if (last && (now - last < 5000)) return true;
  recent.set(key, now);
  return false;
}

// Branch key helper
function getBranchKey(branchValue) {
  return branchValue.split(' (')[0].trim();
}

// Generate email HTML template
function generateEmailTemplate(data, forUser = false) {
  const logoURL = 'https://feedback-form-b24b.onrender.com/logo.jpg'; // Update if needed
  const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>WB Sainik Board - Feedback Submission</title>
</head>
<body style="margin:0; padding:0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <!-- ID: ${uniqueId} -->
  <div style="max-width:600px; margin:0 auto; background:#fff; border-radius:10px; overflow:hidden; box-shadow:0 4px 6px rgba(0,0,0,0.1);">
    <div style="background: linear-gradient(to bottom, rgb(224, 60, 60), rgb(48, 48, 172), rgb(39, 170, 214)); padding:20px; text-align:center;">
      <img src="${logoURL}" alt="WB Sainik Board Logo" style="max-height:100px; margin-bottom:10px;" />
      <h1 style="color:#fff; margin:0; font-size:19px; font-weight:bold;">West Bengal Sainik Board</h1>
      <p style="color:#e8f4f8; margin:5px 0 0 0; font-size:14px;">
        ${forUser ? "Thank you for your submission. Your information has been noted for suitable action." : "New Submission Received"}
      </p>
    </div>

    <div style="padding:8px; text-align:center;">
      <h2 style="color: rgb(48, 48, 172); margin:0 0 8px 0; font-size:14px;">Submission Details</h2>
    </div>

    <table style="width:100%; border-collapse: collapse; margin-bottom: 25px; border:1px solid #dee2e6; border-radius: 5px; overflow: hidden;">
      <tr style="background-color:#f8f9fa;">
        <td style="padding:12px; border-bottom:1px solid #dee2e6; font-weight:bold; color:#495057; width:30%;">Rank</td>
        <td style="padding:12px; border-bottom:1px solid #dee2e6; color:#212529;">${data.rank}</td>
      </tr>
      <tr>
        <td style="padding:12px; border-bottom:1px solid #dee2e6; font-weight:bold; color:#495057; background:#f8f9fa;">Serving / ESM Name</td>
        <td style="padding:12px; border-bottom:1px solid #dee2e6; color:#212529;">${data.name}</td>
      </tr>
      <tr>
        <td style="padding:12px; border-bottom:1px solid #dee2e6; font-weight:bold; color:#495057; background:#f8f9fa;">Relationship</td>
        <td style="padding:12px; border-bottom:1px solid #dee2e6; color:#212529;">${data.relationship}</td>
      </tr>
      <tr>
        <td style="padding:12px; border-bottom:1px solid #dee2e6; font-weight:bold; color:#495057; background:#f8f9fa;">Parent ZSB Branch</td>
        <td style="padding:12px; border-bottom:1px solid #dee2e6; color:#212529;">${data.branch}</td>
      </tr>
      <tr>
        <td style="padding:12px; border-bottom:1px solid #dee2e6; font-weight:bold; color:#495057; background:#f8f9fa;">Phone No.</td>
        <td style="padding:12px; border-bottom:1px solid #dee2e6; color:#212529;">${data.phone}</td>
      </tr>
      <tr>
        <td style="padding:12px; border-bottom:1px solid #dee2e6; font-weight:bold; color:#495057; background:#f8f9fa;">Email</td>
        <td style="padding:12px; border-bottom:1px solid #dee2e6; color:#212529;">${data.email || '-'}</td>
      </tr>
      <tr>
        <td style="padding:12px; border-bottom:1px solid #dee2e6; font-weight:bold; color:#495057; background:#f8f9fa;">ZSB ID Card No.</td>
        <td style="padding:12px; border-bottom:1px solid #dee2e6; color:#212529;">${data.id || '-'}</td>
      </tr>
      <tr>
        <td style="padding:12px; font-weight:bold; color:#495057; background:#f8f9fa; vertical-align:top;">Feedback / Grievance</td>
        <td style="padding:12px; color:#212529;">${data.sugg || '-'}</td>
      </tr>
    </table>

    <div style="background-color: #e9ecef; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
      <p style="margin: 0; font-size: 14px; color: #6c757d;">
        <strong>Submission Time:</strong> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'full', timeStyle: 'medium' })}
      </p>
      ${data.attachmentCount > 0 ? `<p style="margin: 10px 0 0 0; font-size: 14px; color: #6c757d;"><strong>Attachments:</strong> ${data.attachmentCount} file(s) attached</p>` : ''}
    </div>

    ${forUser ? `
    <div style="background-color:rgb(54, 60, 66); color: #ffffff; padding: 20px; text-align: center;">
      <p style="margin: 0 0 10px 0; font-size: 14px;">This is an automated notification from West Bengal Sainik Board.</p>
      <p style="margin: 0 0 10px 0; font-size: 12px; color: #adb5bd;">
         Do not reply to this mail. For further support please contact your ZSB branch.
      </p>
      <hr style="border: none; border-top: 1px solid #495057; margin: 10px 0;">
      <p style="margin: 0; font-size: 12px; color: #6c757d;">
        Government of West Bengal | Serving Our Veterans and Families with Pride
      </p>
    </div>
    ` : ''}
  </div>
</body>
</html>
`;
}



const oAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'https://developers.google.com/oauthplayground' // Your redirect_uri
);

oAuth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });

async function createTransporter() {
  const { token } = await oAuth2Client.getAccessToken();
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: process.env.NOTIFY_EMAIL,
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
      accessToken: token
    }
  });
}

  await transporter.verify();

  data.attachmentCount = files.length;

  const emailHTML = generateEmailTemplate(data, false);
  const subject = `New Feedback/Grievance: ${data.rank} ${data.name} - ${getBranchKey(data.branch)}`;

  const attachments = files.map(file => ({
    filename: file.originalname,
    path: file.path,
    contentType: file.mimetype
  }));

  const branchKey = getBranchKey(data.branch);
  const branchEmail = BRANCH_EMAILS[branchKey];
  const recipients = [process.env.NOTIFY_EMAIL];
  if (branchEmail) {
    recipients.push(branchEmail);
  }

  // Send to admin and branch
  await transporter.sendMail({
    from: `"WB Sainik Board System" <${process.env.NOTIFY_EMAIL}>`,
    to: recipients,
    subject,
    html: emailHTML,
    attachments
  });

  // Send confirmation to user email if provided
  if (data.email && data.email.includes('@')) {
    const userHTML = generateEmailTemplate(data, true);
    await transporter.sendMail({
      from: `"WB Sainik Board" <${process.env.NOTIFY_EMAIL}>`,
      to: data.email,
      subject: 'Thank you for your submission - West Bengal Sainik Board',
      html: userHTML,
      attachments
    });
  }
}

// Form submission endpoint
app.post('/submit', upload.array('upload', 10), async (req, res) => {
  const data = req.body;
  const files = req.files || [];

  if (!data.name || !data.phone || !data.rank || !data.branch || !data.relationship) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  if (isDuplicate(`${data.name}_${data.phone}`)) {
    return res.status(429).json({ success: false, error: 'Please wait 5 seconds before resubmitting' });
  }

  try {
    await sendMail(data, files);

    // Cleanup uploaded files after sending
    files.forEach(file => {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    });

    res.json({ success: true, message: 'Form submitted successfully and notifications sent' });
  } catch (error) {
    console.error('Submission error:', error);

    // Cleanup on error too
    files.forEach(file => {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    });

    res.status(500).json({ success: false, error: 'Server error. Please try again later.' });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', time: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
