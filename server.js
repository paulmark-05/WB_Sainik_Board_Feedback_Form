// Requires
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const { google } = require("googleapis");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

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

const SHEET_ID = process.env.SHEET_ID;
const DRIVE_PARENT_ID = process.env.DRIVE_FOLDER_ID || "";
const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL;

// Clean branch name
function cleanBranchName(branch) {
  return branch.replace(/\s*\([^)]*\)/g, "").trim();
}

// Email notification
async function sendEmail(authClient, data) {
  const gmail = google.gmail({ version: "v1", auth: authClient });
  const body = `
To: ${NOTIFY_EMAIL}
Subject: 📝 New Form Submission Received

You have a new submission:

Rank: ${data.rank}
Name: ${data.name}
Email: ${data.email}
Phone: ${data.phone}
Branch: ${data.branch}
ID: ${data.id}
Suggestions: ${data.sugg}

View All Submissions: https://docs.google.com/spreadsheets/d/${SHEET_ID}
`;

const encoded = Buffer.from(body)
    .toString("base64")
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw: encoded }
  });
}

app.post("/submit", upload.array("files", 10), async (req, res) => {
  try {
    const { rank, name, email, phone, branch, id, sugg } = req.body;
    const files = req.files;

    const authClient = await auth.getClient();
    const drive = google.drive({ version: "v3", auth: authClient });
    const sheets = google.sheets({ version: "v4", auth: authClient });

   
    const branchFolder = cleanBranchName(branch);
    const userFolder = `${rank} - ${name}`;

    // Main -> Branch -> User folder creation
    async function ensureFolder(parentId, name) {
      const q = `'${parentId}' in parents and name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
      const res = await drive.files.list({ q, fields: "files(id)" });
      if (res.data.files[0]) return res.data.files[0].id;
      const create = await drive.files.create({
        requestBody: { name, parents: [parentId], mimeType: "application/vnd.google-apps.folder" },
        fields: "id"
      });
      return create.data.id;
    }

    const rootId = DRIVE_PARENT_ID;
    const branchId = await ensureFolder(rootId, branchFolder);
    const userId = await ensureFolder(branchId, userFolder);

    for (const file of files) {
      await drive.files.create({
        requestBody: { name: file.originalname, parents: [userId] },
        media: { mimeType: file.mimetype, body: Buffer.from(file.buffer) }
      });
    }

    const date = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    const folderLink = `https://drive.google.com/drive/folders/${userId}`;

    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: "Sheet1!A2",
      valueInputOption: "USER_ENTERED",
      resource: { values: [[rank, name, email, phone, branch, id, sugg, date, folderLink]] }
    });

    await sendEmail(authClient, { rank, name, email, phone, branch, id, sugg });
    res.json({ message: "Submitted & processed successfully!" });
  } catch (err) {
    console.error("Submission error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
