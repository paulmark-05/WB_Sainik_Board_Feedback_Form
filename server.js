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

// Helper function to clean folder names and extract branch name
function cleanFolderName(name) {
    return name.replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ').trim();
}

function extractBranchName(branchFullName) {
    // Extract branch name without the district names in parentheses
    const branchName = branchFullName.split('(')[0].trim();
    return cleanFolderName(branchName);
}

// Helper functions for Google Drive folder management
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

// Enhanced form submission endpoint
app.post('/submit', upload.array('upload', 10), async (req, res) => {
    console.log('📝 Form submission received');
    console.log('Body:', req.body);
    console.log('Files:', req.files ? req.files.length : 0);
    
    try {
        const data = req.body;
        const files = req.files || [];
        
        // Validate required fields INCLUDING RELATIONSHIP
        if (!data.name || !data.phone || !data.rank || !data.branch || !data.relationship) {
            console.error('❌ Missing required fields');
            return res.status(400).json({ 
                success: false, 
                error: "Missing required fields: name, phone, rank, branch, or relationship" 
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

        // Process Google Drive upload with hierarchical folder structure
        let uploadedFileLinks = [];
        let timestampFolderId = null;
        if (drive && sheets) {
            try {
                // Create folder hierarchy: Branch -> Rank-Name -> Timestamp
                const branchName = extractBranchName(data.branch);
                const personFolderName = cleanFolderName(`${data.rank}-${data.name}`);
                
                // Create timestamp folder name (YYYY-MM-DD_HH-MM-SS)
                const now = new Date();
                const timestamp = now.toISOString()
                    .replace(/T/, '_')
                    .replace(/:/g, '-')
                    .split('.')[0];

                // Ensure branch folder exists
                const branchFolderId = await ensureFolder(process.env.DRIVE_FOLDER_ID, branchName);
                
                // Ensure person folder exists within branch
                const personFolderId = await ensureFolder(branchFolderId, personFolderName);
                
                // Create timestamp folder within person folder
                timestampFolderId = await ensureFolder(personFolderId, timestamp);

                // Upload files to timestamp folder
                for (const file of files) {
                    try {
                        const fileMeta = {
                            name: file.originalname,
                            parents: [timestampFolderId]
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

                // Update Google Sheet with timestamp folder link
                const sheetValues = [
                    new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }), // A - Timestamp
                    data.rank,           // B - Rank
                    data.name,           // C - Name
                    data.relationship,   // D - Relationship
                    '',                  // E - Blank column
                    data.email || '',    // F - Email
                    data.phone,          // G - Phone
                    data.branch,         // H - Branch
                    data.id || '',       // I - ID
                    data.sugg || '',     // J - Feedback
                    timestampFolderId ? `https://drive.google.com/drive/folders/${timestampFolderId}` : '' // K - Drive folder link
                ];

                await sheets.spreadsheets.values.append({
                    spreadsheetId: process.env.SHEET_ID,
                    range: "Sheet1",
                    valueInputOption: "USER_ENTERED",
                    requestBody: { values: [sheetValues] }
                });

                console.log('📊 Google Sheet updated with timestamp folder link');
            } catch (googleError) {
                console.error('❌ Google services error:', googleError.message);
            }
        }

        // Send email notification
        try {
            await sendEmailNotification(data, uploadedFileLinks, timestampFolderId);
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

// Email notification function with RELATIONSHIP and view-only links
async function sendEmailNotification(data, uploadedFileLinks, timestampFolderId) {
    console.log('📧 Starting email notification process...');
    
    // Check environment variables
    if (!process.env.NOTIFY_EMAIL) {
        throw new Error('NOTIFY_EMAIL environment variable not set');
    }
    if (!process.env.APP_PASSWORD) {
        throw new Error('APP_PASSWORD environment variable not set');
    }
    
    console.log(`Email from: ${process.env.NOTIFY_EMAIL}`);

    const transporter = nodemailer.createTransporter({
        service: 'gmail',
        auth: {
            user: process.env.NOTIFY_EMAIL,
            pass: process.env.APP_PASSWORD
        }
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

    // Generate view-only links
    const googleSheetLink = process.env.SHEET_ID ? 
        `https://docs.google.com/spreadsheets/d/${process.env.SHEET_ID}/edit` : 
        'Not available';
    
    const driveFolderLink = timestampFolderId ? 
        `https://drive.google.com/drive/folders/${timestampFolderId}` : 
        'Not available';

    // Email subject
    const emailSubject = `New Feedback/Grievance Submission: ${data.rank}-${data.name} (${data.branch})`;

    const mailOptions = {
        from: `"WB Sainik Board" <${process.env.NOTIFY_EMAIL}>`,
        to: process.env.NOTIFY_EMAIL,
        subject: emailSubject,
        html: `
        <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; border: 1px solid #ddd;">
            <!-- Header -->
            <div style="background: linear-gradient(to right, #e03c3c, #303030ac, #27aad6); padding: 20px; text-align: center; color: white;">
                <h2 style="margin: 0; font-size: 24px;">West Bengal Sainik Board</h2>
                <p style="margin: 5px 0 0 0; font-size: 16px;">New Feedback/Grievance Submission</p>
            </div>
            
            <!-- Submission Details -->
            <div style="padding: 20px;">
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                    <tr style="background-color: #f8f9fa;">
                        <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: bold; width: 30%;">Name:</td>
                        <td style="padding: 12px; border: 1px solid #dee2e6;">${data.name}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: bold;">Rank:</td>
                        <td style="padding: 12px; border: 1px solid #dee2e6;">${data.rank}</td>
                    </tr>
                    <tr style="background-color: #f8f9fa;">
                        <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: bold;">Relationship:</td>
                        <td style="padding: 12px; border: 1px solid #dee2e6;">${data.relationship}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: bold;">Branch:</td>
                        <td style="padding: 12px; border: 1px solid #dee2e6;">${data.branch}</td>
                    </tr>
                    <tr style="background-color: #f8f9fa;">
                        <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: bold;">Phone:</td>
                        <td style="padding: 12px; border: 1px solid #dee2e6;">${data.phone}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: bold;">Email:</td>
                        <td style="padding: 12px; border: 1px solid #dee2e6;">${data.email || 'Not provided'}</td>
                    </tr>
                    <tr style="background-color: #f8f9fa;">
                        <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: bold;">ID Card:</td>
                        <td style="padding: 12px; border: 1px solid #dee2e6;">${data.id || 'Not provided'}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: bold; vertical-align: top;">Feedback:</td>
                        <td style="padding: 12px; border: 1px solid #dee2e6;">${data.sugg || 'No feedback provided'}</td>
                    </tr>
                </table>
                
                <!-- Quick Access Links Section -->
                <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 5px solid #ffc107;">
                    <h3 style="color: #856404; margin: 0 0 15px 0;">🔗 Quick Access Links (View Only)</h3>
                    <div style="display: flex; flex-wrap: wrap; gap: 15px;">
                        <div style="flex: 1; min-width: 250px;">
                            <h4 style="color: #495057; margin: 0 0 8px 0; font-size: 16px;">📊 Google Sheet (All Submissions)</h4>
                            <a href="${googleSheetLink}" target="_blank" 
                               style="display: inline-block; background: #28a745; color: white; padding: 10px 15px; 
                                      text-decoration: none; border-radius: 5px; font-weight: bold;">
                                View Spreadsheet
                            </a>
                        </div>
                        <div style="flex: 1; min-width: 250px;">
                            <h4 style="color: #495057; margin: 0 0 8px 0; font-size: 16px;">📁 Google Drive Folder (This Submission)</h4>
                            <a href="${driveFolderLink}" target="_blank" 
                               style="display: inline-block; background: #007bff; color: white; padding: 10px 15px; 
                                      text-decoration: none; border-radius: 5px; font-weight: bold;">
                                View Files
                            </a>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Footer -->
            <div style="background: #f8f9fa; padding: 20px; border-top: 1px solid #dee2e6; text-align: center;">
                <p style="margin: 0; color: #6c757d; font-size: 14px;">
                    <strong>Submitted:</strong> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                </p>
                <p style="margin: 8px 0 0 0; color: #6c757d; font-size: 12px;">
                    This is an automated notification from the WB Sainik Board Feedback System.
                </p>
            </div>
        </div>
        `
    };

    try {
        console.log('📤 Sending email with subject:', emailSubject);
        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email sent successfully:', info.messageId);
        return info;
    } catch (sendError) {
        console.error('❌ Email sending failed:', sendError);
        throw new Error(`Failed to send email: ${sendError.message}`);
    }
}

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
    console.log(`📧 Email: ${process.env.NOTIFY_EMAIL ? 'Configured' : 'Not configured'}`);
    console.log(`🔑 App Password: ${process.env.APP_PASSWORD ? 'Set' : 'Missing'}`);
});
