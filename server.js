const express = require("express");
const multer = require("multer");
const { google } = require("googleapis");
const cors = require("cors");

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
app.use(cors());
app.use(express.static("public"));

// AUTH SETUP
const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON),
  scopes: [
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/gmail.send"
  ]
});

// HARDCODED VALUES
const SHEET_ID = "1K-BOrpm64U18GFmvy03U2A-vJWreviVIv8qTd4kB_ac";
const DRIVE_FOLDER_ID = "1ZgZu36dopu2kwEefJ4uVCEvkgwWF20DG";
const NOTIFY_EMAIL = "paulamit001@gmail.com";

// CLEAN BRANCH NAME (removes content in brackets)
function cleanName(name) {
  return name.replace(/\s*\([^)]*\)/g, "").trim();
}

// EMAIL SENDER FUNCTION
async function sendEmail(authClient, form) {
  const gmail = google.gmail({ version: "v1", auth: authClient });

  const body = `
To: ${NOTIFY_EMAIL}
Subject: 📝 New Feedback Submission Received

Rank: ${form.rank}
Name: ${form.name}
Email: ${form.email}
Phone: ${form.phone}
Branch: ${form.branch}
ID No: ${form.id}
Suggestions: ${form.sugg}

📄 View Sheet: https://docs.google.com/spreadsheets/d/${SHEET_ID}
`;

  const encoded = Buffer.from(body)
    .toString("base64")
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw: encoded }
  });
}

// FORM SUBMISSION HANDLER
app.post("/submit", upload.array("files", 10), async (req, res) => {
  try {
    const authClient = await auth.getClient();
    const drive = google.drive({ version: "v3", auth: authClient });
    const sheets = google.sheets({ version: "v4", auth: authClient });

    const { rank, name, email, phone, branch, id, sugg } = req.body;
    const files = req.files;

    const branchName = cleanName(branch);
    const userFolderName = `${rank} - ${name}`;

    // Ensure parent folders exist
    async function ensureFolder(parentId, name) {
      const query = `'${parentId}' in parents and name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
      const result = await drive.files.list({ q: query, fields: "files(id)" });

      if (result.data.files.length > 0) return result.data.files[0].id;

      const folder = await drive.files.create({
        requestBody: {
          name,
          mimeType: "application/vnd.google-apps.folder",
          parents: [parentId]
        },
        fields: "id"
      });

      return folder.data.id;
    }

    // Create folder structure: Branch → Rank - Name
    const branchFolderId = await ensureFolder(DRIVE_FOLDER_ID, branchName);
    const userFolderId = await ensureFolder(branchFolderId, userFolderName);

    // Upload files
    for (const file of files) {
      await drive.files.create({
        requestBody: {
          name: file.originalname,
          parents: [userFolderId]
        },
        media: {
          mimeType: file.mimetype,
          body: Buffer.from(file.buffer)
        }
      });
    }

    // Append to sheet
    const timestamp = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    const folderLink = `https://drive.google.com/drive/folders/${userFolderId}`;

    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: "Sheet1!A1",
      valueInputOption: "USER_ENTERED",
      resource: {
        values: [[rank, name, email, phone, branch, id, sugg, timestamp, folderLink]]
      }
    });

    // Send email
    await sendEmail(authClient, { rank, name, email, phone, branch, id, sugg });

    res.json({ message: "Submission successful!" });
  } catch (err) {
    console.error("Submission failed:", err);
    res.status(500).json({ error: "Server error during submission." });
  }
});

// START SERVER
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("✅ Server running on port", PORT));
