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

// Enhanced Multer configuration
const upload = multer({ 
    dest: 'uploads/',
    limits: {
        fileSize: 10 * 1024 * 1024,
        files: 10
    },
    fileFilter: (req, file, cb) => {
        console.log(`File upload: ${file.fieldname} - ${file.originalname}`);
        cb(null, true);
    }
});

// Google Auth initialization with error handling
let auth, drive, sheets;

const initializeGoogleAPIs = async () => {
    try {
        if (!process.env.GOOGLE_CREDENTIALS_JSON) {
            console.log('⚠️ Google credentials not found, skipping Google services');
            return false;
        }
        
        const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
        
        auth = new google.auth.GoogleAuth({
            credentials: credentials,
            scopes: [
                'https://www.googleapis.com/auth/drive',
                'https://www.googleapis.com/auth/spreadsheets'
            ]
        });

        const authClient = await auth.getClient();
        drive = google.drive({ version: 'v3', auth: authClient });
        sheets = google.sheets({ version: 'v4', auth: authClient });
        
        console.log('✅ Google APIs initialized');
        return true;
    } catch (error) {
        console.error('❌ Google API initialization failed:', error.message);
        return false;
    }
};

initializeGoogleAPIs();

// Improved duplicate submission prevention
const recentSubmissions = new Map();

const isRecentSubmission = (key) => {
    const now = Date.now();
    const recentTime = recentSubmissions.get(key);
    
    if (recentTime && (now - recentTime) < 30000) {
        return true;
    }
    
    recentSubmissions.set(key, now);
    
    // Clean up old entries
    for (const [k, time] of recentSubmissions.entries()) {
        if (now - time > 60000) {
            recentSubmissions.delete(k);
        }
    }
    
    return false;
};

// Enhanced form submission endpoint
app.post('/submit', upload.array('upload', 10), async (req, res) => {
    console.log('📝 Form submission received');
    console.log('Body:', req.body);
    console.log('Files:', req.files ? req.files.length : 0);
    
    try {
        const data = req.body;
        const files = req.files || [];
        
        // Validate required fields
        if (!data.name || !data.phone || !data.rank || !data.branch) {
            console.error('❌ Missing required fields');
            return res.status(400).json({ 
                success: false, 
                error: "Missing required fields: name, phone, rank, or branch" 
            });
        }

        // Check for recent duplicate submission
        const submissionKey = `${data.name}_${data.phone}`;
        if (isRecentSubmission(submissionKey)) {
            console.log('⚠️ Recent duplicate submission detected');
            return res.status(429).json({ 
                success: false, 
                error: "Please wait 30 seconds before submitting again" 
            });
        }

        console.log(`✅ Processing submission for: ${data.name}`);

        // Process Google Drive upload (if available)
        let uploadedFileLinks = [];
        if (drive && sheets) {
            try {
                const branchName = cleanFolderName(data.branch || "Uncategorized");
                const subFolderName = cleanFolderName(`${data.rank} - ${data.name}`);

                const parentFolderId = await ensureFolder(process.env.DRIVE_FOLDER_ID, branchName);
                const userFolderId = await ensureFolder(parentFolderId, subFolderName);

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
                        
                    } catch (fileError) {
                        console.error(`❌ File upload error for ${file.originalname}:`, fileError.message);
                    }
                }

                // Update Google Sheet
                const sheetValues = [
                    new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
                    data.rank, data.name, data.email || '', data.phone,
                    data.branch, data.id || '', data.sugg || '',
                    uploadedFileLinks.join(', ')
                ];

                await sheets.spreadsheets.values.append({
                    spreadsheetId: process.env.SHEET_ID,
                    range: "Sheet1",
                    valueInputOption: "USER_ENTERED",
                    requestBody: { values: [sheetValues] }
                });

                console.log('📊 Google Sheet updated');
            } catch (googleError) {
                console.error('❌ Google services error:', googleError.message);
            }
        }

        // Send email notification
        try {
            await sendEmailNotification(data, uploadedFileLinks);
            console.log('📧 Email notification sent');
        } catch (emailError) {
            console.error('❌ Email notification failed:', emailError.message);
        }

        // Clean up temporary files
        files.forEach(file => {
            if (fs.existsSync(file.path)) {
                fs.unlinkSync(file.path);
            }
        });

        console.log('✅ Form submission processed successfully');
        res.json({ 
            success: true, 
            message: "✅ Form submitted successfully!" 
        });

    } catch (error) {
        console.error("❌ Form submission error:", error);
        
        if (req.files) {
            req.files.forEach(file => {
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            });
        }
        
        res.status(500).json({ 
            success: false, 
            error: "Form submission failed. Please try again." 
        });
    }
});

// Enhanced email notification function with detailed debugging
async function sendEmailNotification(data, uploadedFileLinks) {
    console.log('📧 Starting email notification process...');
    
    // Check environment variables
    if (!process.env.NOTIFY_EMAIL) {
        throw new Error('NOTIFY_EMAIL environment variable not set');
    }
    if (!process.env.APP_PASSWORD) {
        throw new Error('APP_PASSWORD environment variable not set');
    }
    
    console.log(`Email from: ${process.env.NOTIFY_EMAIL}`);
    console.log(`App password length: ${process.env.APP_PASSWORD ? process.env.APP_PASSWORD.length : 'undefined'}`);

    const transporter = nodemailer.createTransporter({
        service: 'gmail',
        auth: {
            user: process.env.NOTIFY_EMAIL,
            pass: process.env.APP_PASSWORD
        },
        debug: true, // Enable debug logs
        logger: true // Enable logger
    });

    // Test connection first
    try {
        console.log('🔍 Verifying SMTP connection...');
        await transporter.verify();
        console.log('✅ SMTP connection verified');
    } catch (verifyError) {
        console.error('❌ SMTP verification failed:', verifyError.message);
        throw new Error(`Email configuration error: ${verifyError.message}`);
    }

    const mailOptions = {
        from: `"WB Sainik Board" <${process.env.NOTIFY_EMAIL}>`,
        to: process.env.NOTIFY_EMAIL,
        subject: `📬 New Feedback Submission - ${data.name} (${data.branch})`,
        html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">
                New Feedback Form Submission
            </h2>
            
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr style="background-color: #f8f9fa;">
                    <td style="padding: 10px; border: 1px solid #dee2e6; font-weight: bold;">Name:</td>
                    <td style="padding: 10px; border: 1px solid #dee2e6;">${data.name}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border: 1px solid #dee2e6; font-weight: bold;">Rank:</td>
                    <td style="padding: 10px; border: 1px solid #dee2e6;">${data.rank}</td>
                </tr>
                <tr style="background-color: #f8f9fa;">
                    <td style="padding: 10px; border: 1px solid #dee2e6; font-weight: bold;">Branch:</td>
                    <td style="padding: 10px; border: 1px solid #dee2e6;">${data.branch}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border: 1px solid #dee2e6; font-weight: bold;">Phone:</td>
                    <td style="padding: 10px; border: 1px solid #dee2e6;">${data.phone}</td>
                </tr>
                <tr style="background-color: #f8f9fa;">
                    <td style="padding: 10px; border: 1px solid #dee2e6; font-weight: bold;">Email:</td>
                    <td style="padding: 10px; border: 1px solid #dee2e6;">${data.email || 'Not provided'}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border: 1px solid #dee2e6; font-weight: bold;">ID Card:</td>
                    <td style="padding: 10px; border: 1px solid #dee2e6;">${data.id || 'Not provided'}</td>
                </tr>
                <tr style="background-color: #f8f9fa;">
                    <td style="padding: 10px; border: 1px solid #dee2e6; font-weight: bold; vertical-align: top;">Feedback:</td>
                    <td style="padding: 10px; border: 1px solid #dee2e6;">${data.sugg || 'No feedback provided'}</td>
                </tr>
            </table>
            
            ${uploadedFileLinks.length > 0 ? `
                <h3 style="color: #2c3e50;">Uploaded Files (${uploadedFileLinks.length}):</h3>
                <ul style="list-style-type: none; padding: 0;">
                    ${uploadedFileLinks.map((link, index) => 
                        `<li style="margin: 5px 0;"><a href="${link}" target="_blank" style="color: #3498db; text-decoration: none;">📎 File ${index + 1}</a></li>`
                    ).join('')}
                </ul>
            ` : '<p><em>No files uploaded</em></p>'}
            
            <div style="margin-top: 30px; padding: 15px; background-color: #e8f4fd; border-left: 4px solid #3498db;">
                <p style="margin: 0; color: #2c3e50;">
                    <strong>Submitted:</strong> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                </p>
            </div>
        </div>
        `
    };

    try {
        console.log('📤 Sending email...');
        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email sent successfully:', info.messageId);
        return info;
    } catch (sendError) {
        console.error('❌ Email sending failed:', sendError);
        throw new Error(`Failed to send email: ${sendError.message}`);
    }
}

// Helper functions
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

function cleanFolderName(name) {
    return name.replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ').trim();
}

// Add email test endpoint for debugging
app.get('/test-email', async (req, res) => {
    try {
        const testData = {
            name: 'Test User',
            rank: 'Major',
            branch: 'Test Branch',
            phone: '1234567890',
            email: 'test@example.com',
            id: 'TEST123',
            sugg: 'This is a test submission'
        };
        
        await sendEmailNotification(testData, []);
        res.json({ success: true, message: 'Test email sent successfully!' });
    } catch (error) {
        console.error('Test email failed:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        googleAPIs: !!(drive && sheets),
        emailConfig: !!(process.env.NOTIFY_EMAIL && process.env.APP_PASSWORD)
    });
});

app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
});
