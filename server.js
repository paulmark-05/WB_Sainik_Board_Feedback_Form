require('dotenv').config()

const express    = require('express')
const multer     = require('multer')
const cors       = require('cors')
const nodemailer = require('nodemailer')
const fs         = require('fs')
const path       = require('path')

const app  = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.static('public'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Multer config: up to 10 files, each ≤10MB
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024, files: 10 }
})

// ZSB Branch email mapping - Update these with actual branch emails
const BRANCH_EMAILS = {
  'Rajya Sainik Board': 'paulamit001@gmail.com',
  'ZSB Burdwan': 'nayanipaul001@gmail.com',
  'ZSB Coochbehar': 'nayanipaul.24@gmail.com',
  'ZSB Dakshin Dinajpur': 'nayanipaul001@gmail.com',
  'ZSB Darjeeling': 'nayanipaul.24@gmail.com',
  'ZSB Howrah': 'nayanipaul001@gmail.com',
  'ZSB Jalpaiguri': 'nayanipaul.24@gmail.com',
  'ZSB Kalimpong': 'nayanipaul001@gmail.com',
  'ZSB Kolkata': 'nayanipaul.24@gmail.com',
  'ZSB Malda': 'nayanipaul001@gmail.com',
  'ZSB Midnapore': 'nayanipaul.24@gmail.com',
  'ZSB Murshidabad': 'nayanipaul001@gmail.com',
  'ZSB Nadia': 'nayanipaul.24@gmail.com',
  'ZSB North 24 Parganas': 'nayanipaul001@gmail.com',
  'ZSB South 24 Parganas': 'nayanipaul.24@gmail.com'
}

// Prevent rapid re-submission
const recent = new Map()
function isDuplicate(key) {
  const now = Date.now()
  const last = recent.get(key)
  if (last && now - last < 5000) return true
  recent.set(key, now)
  return false
}

// Helper to clean branch names for mapping
function getBranchKey(branchValue) {
  return branchValue.split(' (')[0].trim()
}

// Enhanced email template with logo and professional styling
function generateEmailTemplate(data, forUser = false) {
  const logoURL = 'https://feedback-form-b24b.onrender.com/logo.jpg' // Update with actual logo URL
  const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>WB Sainik Board - New Feedback Submission</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
      <!-- ID: ${uniqueId} -->
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        
        <!-- Header with Logo -->
        <div style="background: linear-gradient(to bottom, rgb(224, 60, 60), rgb(48, 48, 172), rgb(39, 170, 214)); padding: 20px; text-align: center;">
          <img src="${logoURL}" alt="WB Sainik Board Logo" style="max-height: 100px; margin-bottom: 10px;">
          <h1 style="color: #ffffff; margin: 0; font-size: 19px; font-weight: bold;">West Bengal Sainik Board</h1>
       ${forUser ? `
          <p style="color: #e8f4f8; margin: 5px 0 0 0; font-size: 14px;">Thank you for your submission. Your information has been noted for suitable action. 
</p>
          `:`
          <p style="color: #e8f4f8; margin: 5px 0 0 0; font-size: 14px;">New Submission Received</p> `}
        </div>

        <!-- Main Content -->
        <div style="padding: 8px; text-align: center;">
            <h2 style="color:rgb(48, 48, 172); margin: 0 0 8px 0; font-size: 14px;">Submission Details</h2>
          </div>

          <!-- Details Table -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; border: 1px solid #dee2e6; border-radius: 5px; overflow: hidden;">
            <tr style="background-color: #f8f9fa;">
              <td style="padding: 12px; border-bottom: 1px solid #dee2e6; font-weight: bold; color: #495057; width: 30%;">Rank</td>
              <td style="padding: 12px; border-bottom: 1px solid #dee2e6; color: #212529;">${data.rank}</td>
            </tr>
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #dee2e6; font-weight: bold; color: #495057; background-color: #f8f9fa;">Serving / ESM Name</td>
              <td style="padding: 12px; border-bottom: 1px solid #dee2e6; color: #212529;">${data.name}</td>
            </tr>
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #dee2e6; font-weight: bold; color: #495057; background-color: #f8f9fa;">Relationship</td>
              <td style="padding: 12px; border-bottom: 1px solid #dee2e6; color: #212529;">${data.relationship}</td>
            </tr>
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #dee2e6; font-weight: bold; color: #495057; background-color: #f8f9fa;">Parent ZSB Branch</td>
              <td style="padding: 12px; border-bottom: 1px solid #dee2e6; color: #212529;">${data.branch}</td>
            </tr>
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #dee2e6; font-weight: bold; color: #495057; background-color: #f8f9fa;">Phone No.</td>
              <td style="padding: 12px; border-bottom: 1px solid #dee2e6; color: #212529;">${data.phone}</td>
            </tr>
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #dee2e6; font-weight: bold; color: #495057; background-color: #f8f9fa;">Email</td>
              <td style="padding: 12px; border-bottom: 1px solid #dee2e6; color: #212529;">${data.email || '-'}</td>
            </tr>
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #dee2e6; font-weight: bold; color: #495057; background-color: #f8f9fa;">ZSB ID Card No.</td>
              <td style="padding: 12px; border-bottom: 1px solid #dee2e6; color: #212529;">${data.id || '-'}</td>
            </tr>
            <tr>
              <td style="padding: 12px; font-weight: bold; color: #495057; background-color: #f8f9fa; vertical-align: top;">Feedback / Grievance </td>
              <td style="padding: 12px; color: #212529;">${data.sugg || '-'}</td>
            </tr>
          </table>

          <!-- Submission Info -->
          <div style="background-color: #e9ecef; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
            <p style="margin: 0; font-size: 14px; color: #6c757d;">
              <strong>Submission Time:</strong> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'full', timeStyle: 'medium' })}
            </p>
            ${data.attachmentCount > 0 ? `<p style="margin: 10px 0 0 0; font-size: 14px; color: #6c757d;"><strong>Attachments:</strong> ${data.attachmentCount} file(s) attached</p>` : ''}
          </div>
        </div>

        <!-- Footer -->
        ${forUser ? `
        <div style="background-color:rgb(54, 60, 66); color: #ffffff; padding: 20px; text-align: center;">
          <p style="margin: 0 0 10px 0; font-size: 14px;">This is an automated notification from West Bengal Sainik Board.</p>
          <p style="margin: 0 0 10px 0; font-size: 12px; color: #adb5bd;">
             Do not reply to this mail. For further support please contact your ZSB branch.
          </p>
          <hr style="border: none; border-top: 1px solid #495057; margin: 10px 0;">
          <p style="margin: 0; font-size: 10px; color: #6c757d;">
            Government of West Bengal | Serving Our Veterans and Families with Pride
          </p>
        </div>
         `: ``}
      </div>
    </body>
    </html>
  `
}


// Enhanced email function with branch-specific routing and attachments
async function sendMail(data, files = []) {
  if (!process.env.NOTIFY_EMAIL || !process.env.APP_PASSWORD) {
    throw new Error('Email environment variables NOTIFY_EMAIL or APP_PASSWORD not set')
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.NOTIFY_EMAIL, pass: process.env.APP_PASSWORD }
  })

  await transporter.verify()

  // Add attachment count to data for email template
  data.attachmentCount = files.length

  const emailHTML = generateEmailTemplate(data, false)
  const subject = `New Feedback/Grievance: ${data.rank} ${data.name} - ${getBranchKey(data.branch)}`

  // Prepare attachments
  const attachments = files.map(file => ({
    filename: file.originalname,
    path: file.path,
    contentType: file.mimetype
  }))

  // Get branch email
  const branchKey = getBranchKey(data.branch)
  const branchEmail = BRANCH_EMAILS[branchKey]
  const recipients = [process.env.NOTIFY_EMAIL] // Always include admin
  
  if (branchEmail) {
    recipients.push(branchEmail)
  }

  // Send to admin and branch
  await transporter.sendMail({
    from: `"WB Sainik Board System" <${process.env.NOTIFY_EMAIL}>`,
    to: recipients,
    subject: subject,
    html: emailHTML,
    attachments: attachments
  })

  // Send confirmation to user if email provided
  if (data.email && data.email.includes('@')) {
    const userHTML = generateEmailTemplate(data,true)
    await transporter.sendMail({
      from: `"WB Sainik Board" <${process.env.NOTIFY_EMAIL}>`,
      to: data.email,
      subject: 'Thank you for your submission - West Bengal Sainik Board',
      html: userHTML,
      attachments: attachments // Include attachments in user email too
    })
  }
}

// Simplified submission endpoint (no Google Sheets/Drive)
app.post('/submit', upload.array('upload', 10), async (req, res) => {
  const data  = req.body
  const files = req.files || []

  if (!data.name || !data.phone || !data.rank || !data.branch || !data.relationship) {
    return res.status(400).json({ success: false, error: 'Missing required fields' })
  }

  if (isDuplicate(`${data.name}_${data.phone}`)) {
    return res.status(429).json({ success: false, error: 'Please wait 30 seconds before resubmitting' })
  }

  try {
    // Send emails with attachments
    await sendMail(data, files)

    // Clean up uploaded files after sending email
    files.forEach(file => {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path)
      }
    })

    return res.json({ success: true, message: 'Form submitted successfully and notifications sent' })
  }
  catch (err) {
    console.error('Submission error:', err)
    // Clean up files on error
    files.forEach(file => {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path)
      }
    })
    return res.status(500).json({ success: false, error: 'Server error. Please try again.' })
  }
})

app.get('/health', (req, res) => {
  res.json({ status: 'OK', time: new Date().toISOString() })
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
