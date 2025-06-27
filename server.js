// Requires
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const { google } = require("googleapis");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

const upload = multer({ storage: multer.memoryStorage() });

// Google Auth
const auth = new google.auth.GoogleAuth({
  keyFile: "credentials.json",
  scopes: [
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/gmail.send",
  ],
});

const spreadsheetId = "1K-BOrpm64U18GFmvy03U2A-vJWreviVIv8qTd4kB_ac";
const mainDriveFolder = "WB Sainik Board Submissions";

// Clean branch name
function cleanBranchName(branch) {
  return branch.replace(/\s*\([^)]*\)/g, "").trim();
}

// Email notification
async function sendEmail(auth, formData, sheetUrl) {
  const gmail = google.gmail({ version: "v1", auth });
  const email = `
To: paulamit001@gmail.com
Subject: 📝 New Submission Received

✅ A new form was submitted:

Rank: ${formData.rank}
Name: ${formData.name}
Email: ${formData.email}
Phone: ${formData.phone}
Branch: ${formData.branch}
ID: ${formData.id}
Suggestions: ${formData.sugg}

📄 View all submissions: ${sheetUrl}
`;

  const encoded = Buffer.from(email).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw: encoded },
  });
}

app.post("/submit", upload.array("files", 10), async (req, res) => {
  try {
    const { rank, name, email, phone, branch, id, sugg } = req.body;
    const files = req.files;

    const authClient = await auth.getClient();
    const drive = google.drive({ version: "v3", auth: authClient });
    const sheets = google.sheets({ version: "v4", auth: authClient });

    const cleanBranch = cleanBranchName(branch);
    const userFolderName = `${rank} - ${name}`;

    // Main folder
    const mainSearch = await drive.files.list({
      q: `name='${mainDriveFolder}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: "files(id)",
    });
    let mainId = mainSearch.data.files[0]?.id;
    if (!mainId) {
      const create = await drive.files.create({
        requestBody: {
          name: mainDriveFolder,
          mimeType: "application/vnd.google-apps.folder",
        },
        fields: "id",
      });
      mainId = create.data.id;
    }

    // Branch folder
    const branchSearch = await drive.files.list({
      q: `'${mainId}' in parents and name='${cleanBranch}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: "files(id)",
    });
    let branchId = branchSearch.data.files[0]?.id;
    if (!branchId) {
      const create = await drive.files.create({
        requestBody: {
          name: cleanBranch,
          mimeType: "application/vnd.google-apps.folder",
          parents: [mainId],
        },
        fields: "id",
      });
      branchId = create.data.id;
    }

    // User folder
    const userSearch = await drive.files.list({
      q: `'${branchId}' in parents and name='${userFolderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: "files(id)",
    });
    let userId = userSearch.data.files[0]?.id;
    if (!userId) {
      const create = await drive.files.create({
        requestBody: {
          name: userFolderName,
          mimeType: "application/vnd.google-apps.folder",
          parents: [branchId],
        },
        fields: "id",
      });
      userId = create.data.id;
    }

    // Upload files
    for (const file of files) {
      await drive.files.create({
        requestBody: {
          name: file.originalname,
          parents: [userId],
        },
        media: {
          mimeType: file.mimetype,
          body: Buffer.from(file.buffer),
        },
      });
    }

    // Append to sheet
    const date = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    const folderLink = `https://drive.google.com/drive/folders/${userId}`;
    const values = [[rank, name, email, phone, branch, id, sugg, date, folderLink]];

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "Sheet1!A2",
      valueInputOption: "USER_ENTERED",
      resource: { values },
    });

    const sheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
    await sendEmail(authClient, { rank, name, email, phone, branch, id, sugg }, sheetUrl);

    res.status(200).json({ message: "Submitted successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error submitting form." });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running: http://localhost:${PORT}`);
});
