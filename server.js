const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { google } = require('googleapis');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Multer configuration
const upload = multer({ 
    dest: 'uploads/',
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB per file
        files: 10 // Max 10 files
    }
});

// Google Auth
const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON),
    scopes: [
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/spreadsheets'
    ]
});

let drive, sheets;

// Initialize Google APIs
auth.getClient().then(authClient => {
    drive = google.drive({ version: 'v3', auth: authClient });
    sheets = google.sheets({ version: 'v4', auth: authClient });
    console.log('✅ Google APIs initialized');
}).catch(err => {
    console.error('❌ Google API initialization failed:', err);
});

// Submission tracking to prevent duplicates
const submissionTracker = new Map();

app.post('/submit', upload.array('upload', 10), async (req, res) => {
    let submissionId = null;
    
    try {
        const data = req.body;
        const files = req.files || [];
        
        // Create unique submission ID
        submissionId = `${data.name}_${data.phone}_${Date.now()}`;
        
        // Check for duplicate submission (within 30 seconds)
        if (submissionTracker.has(submissionId.substring(0, submissionId.lastIndexOf('_')))) {
            return res.status(400).json({ error: "Duplicate submission detected. Please wait before submitting again." });
        }
        
        // Mark submission as in progress
        submissionTracker.set(submissionId.substring(0, submissionId.lastIndexOf('_')), Date.now());
        
        console.log("Processing submission:", submissionId);

        if (!data.name || !data.phone || !data.rank || !data.branch) {
            throw new Error("Missing required fields");
        }

        // Clean folder names
        const branchName = cleanFolderName(data.branch || "Uncategorized");
        const subFolderName = cleanFolderName(`${data.rank} - ${data.name}`);

        // Create folders
        const parentFolderId = await ensureFolder(process.env.DRIVE_FOLDER_ID, branchName);
        const userFolderId = await ensureFolder(parentFolderId, subFolderName);

        // Upload files
        const uploadedFileLinks = [];
        for (const file of files) {
            try {
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
                
                // Clean up temporary file
                fs.unlinkSync(file.path);
            } catch (fileError) {
                console.error("File upload error:", fileError);
                // Clean up temporary file on error
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            }
        }

        // Update Google Sheet
        const sheetValues = [
            new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
            data.rank,
            data.name,
            data.email || '',
            data.phone,
            data.branch,
            data.id || '',
            data.sugg || '',
            uploadedFileLinks.join(', ')
        ];

        await sheets.spreadsheets.values.append({
            spreadsheetId: process.env.SHEET_ID,
            range: "Sheet1",
            valueInputOption: "USER_ENTERED",
            requestBody: { values: [sheetValues] }
        });

        // Send email notification
        const transporter = nodemailer.createTransporter({
            service: 'gmail',
            auth: {
                user: process.env.NOTIFY_EMAIL,
                pass: process.env.APP_PASSWORD
            }
        });

        await transporter.sendMail({
            from: `WB Sainik Board <${process.env.NOTIFY_EMAIL}>`,
            to: process.env.NOTIFY_EMAIL,
            subject: `📬 New Feedback - ${data.name} (${data.branch})`,
            text: `
New form submission received:

Name: ${data.name}
Rank: ${data.rank}
Branch: ${data.branch}
Phone: ${data.phone}
Email: ${data.email || 'Not provided'}
ID Card: ${data.id || 'Not provided'}
Feedback: ${data.sugg || 'No feedback provided'}

Files Uploaded: ${uploadedFileLinks.length}
${uploadedFileLinks.length > 0 ? 'File Links:\n' + uploadedFileLinks.join('\n') : ''}

View all submissions: https://docs.google.com/spreadsheets/d/${process.env.SHEET_ID}/edit
            `
        });

        console.log("✅ Submission processed successfully:", submissionId);
        res.json({ message: "✅ Form submitted successfully!" });

    } catch (error) {
        console.error("❌ Submission error:", error);
        
        // Clean up any temporary files on error
        if (req.files) {
            req.files.forEach(file => {
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            });
        }
        
        res.status(500).json({ error: "❌ Failed to submit form. Please try again." });
    } finally {
        // Clean up submission tracker after 30 seconds
        if (submissionId) {
            setTimeout(() => {
                submissionTracker.delete(submissionId.substring(0, submissionId.lastIndexOf('_')));
            }, 30000);
        }
    }
});

async function ensureFolder(parentId, folderName) {
    try {
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
    } catch (error) {
        console.error("Folder creation error:", error);
        throw error;
    }
}

function cleanFolderName(name) {
    return name.replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ').trim();
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
});
