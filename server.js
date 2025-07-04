require('dotenv').config()

const express    = require('express')
const multer     = require('multer')
const cors       = require('cors')
const { google } = require('googleapis')
const nodemailer = require('nodemailer')
const fs         = require('fs')
const { format } = require('date-fns')

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

let drive, sheets

// Initialize Google APIs
;(async () => {
  if (!process.env.GOOGLE_CREDENTIALS_JSON) {
    console.warn('⚠️  GOOGLE_CREDENTIALS_JSON not set; Drive/Sheets disabled')
    return
  }
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON),
    scopes: [
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/spreadsheets'
    ]
  })
  const client = await auth.getClient()
  drive  = google.drive({ version: 'v3', auth: client })
  sheets = google.sheets({ version: 'v4', auth: client })
  console.log('✅ Google Drive & Sheets initialized')
})()

// Prevent rapid re-submission
const recent = new Map()
function isDuplicate(key) {
  const now = Date.now()
  const last = recent.get(key)
  if (last && now - last < 30000) return true
  recent.set(key, now)
  return false
}

// Helpers to clean folder names
function clean(str) {
  return str.replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ').trim()
}
function branchClean(full) {
  return clean(full.split('(')[0])
}

// Ensure a Drive folder exists (or create it), returns its ID
async function ensureFolder(parentId, name) {
  const q = `'${parentId}' in parents and name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
  const res = await drive.files.list({ q, fields: 'files(id)' })
  if (res.data.files.length) return res.data.files[0].id
  const folder = await drive.files.create({
    resource: { name, parents: [parentId], mimeType: 'application/vnd.google-apps.folder' },
    fields: 'id'
  })
  return folder.data.id
}

// Send email to admin and user
async function sendMail(data, sheetURL, driveURL) {
  if (!process.env.NOTIFY_EMAIL || !process.env.APP_PASSWORD) {
    throw new Error('Email environment variables NOTIFY_EMAIL or APP_PASSWORD not set')
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.NOTIFY_EMAIL, pass: process.env.APP_PASSWORD }
  })

  await transporter.verify()

  const html = `
    <table border="1" cellpadding="6" style="border-collapse:collapse;font-family:Arial;font-size:14px">
      <tr><td><b>Name</b></td><td>${data.name}</td></tr>
      <tr><td><b>Rank</b></td><td>${data.rank}</td></tr>
      <tr><td><b>Relationship</b></td><td>${data.relationship}</td></tr>
      <tr><td><b>Branch</b></td><td>${data.branch}</td></tr>
      <tr><td><b>Phone</b></td><td>${data.phone}</td></tr>
      <tr><td><b>Email</b></td><td>${data.email || '—'}</td></tr>
      <tr><td><b>ID</b></td><td>${data.id || '—'}</td></tr>
      <tr><td><b>Feedback</b></td><td>${data.sugg || '—'}</td></tr>
    </table>
    <p><a href="${sheetURL}" target="_blank">📊 View Spreadsheet</a>${driveURL ? ` | <a href="${driveURL}" target="_blank">📁 View Drive Folder</a>` : ''}</p>
  `

  const subject = `New Submission: ${data.rank}-${data.name} (${data.branch})`

  // Send to admin
  await transporter.sendMail({
    from: `"WB Sainik Board" <${process.env.NOTIFY_EMAIL}>`,
    to: process.env.NOTIFY_EMAIL,
    subject,
    html
  })

  // Also send a copy to the user if they provided a valid email
  if (data.email && data.email.includes('@')) {
    await transporter.sendMail({
      from: `"WB Sainik Board" <${process.env.NOTIFY_EMAIL}>`,
      to: data.email,
      subject: 'Copy of Your Feedback Submission to WB Sainik Board',
      html
    })
  }
}

// Submission endpoint
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
    let driveFolderLink = '-'

    if (files.length > 0) {
      // Create folder path: Branch → Rank-Name → Timestamp
      const branchFolder = await ensureFolder(process.env.DRIVE_FOLDER_ID, branchClean(data.branch))
      const personFolder = await ensureFolder(branchFolder, clean(`${data.rank}-${data.name}`))
      const timestamp    = format(new Date(), 'yyyy-MM-dd_HH-mm-ss')
      const tsFolder     = await ensureFolder(personFolder, timestamp)

      for (const f of files) {
        await drive.files.create({
          resource: { name: f.originalname, parents: [tsFolder] },
          media:    { mimeType: f.mimetype, body: fs.createReadStream(f.path) },
          fields:   'webViewLink'
        })
        fs.unlinkSync(f.path)
      }

      driveFolderLink = `https://drive.google.com/drive/folders/${tsFolder}`
    }

    // Append to Google Sheet
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
    ]

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SHEET_ID,
      range: 'Sheet1',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [sheetRow] }
    })

    const sheetURL = `https://docs.google.com/spreadsheets/d/${process.env.SHEET_ID}/edit`

    // Email both admin and user
    await sendMail(data, sheetURL, driveFolderLink !== '-' ? driveFolderLink : null)

    return res.json({ success: true, message: 'Form submitted successfully' })
  }
  catch (err) {
    console.error('Submission error:', err)
    return res.status(500).json({ success: false, error: 'Server error' })
  }
})

app.get('/health', (req, res) => {
  res.json({ status: 'OK', time: new Date().toISOString() })
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
