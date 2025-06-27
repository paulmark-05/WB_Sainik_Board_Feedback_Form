# WB Sainik Board Feedback & Grievance Form

A professional feedback and grievance collection system built for the West Bengal Sainik Board.

---

## 📝 Description

This project is a full-stack feedback form that allows users (veterans/ex-servicemen) to:
- Submit feedback and complaints
- Upload up to 10 related documents or photos
- Auto-preview, delete, and manage uploaded files
- Automatically update all form data in a central Google Sheet
- Organize uploads into a Google Drive folder structure
- Trigger automatic email notifications to the admin

---

## 🔧 Features

✅ Responsive frontend using **HTML, CSS, JavaScript**  
✅ Backend powered by **Node.js + Express**  
✅ File upload using **Multer**  
✅ Data export using **xlsx** package  
✅ Google Sheets integration (auto data save)  
✅ Google Drive integration (auto folder creation & file storage)  
✅ Email notification on each form submission  
✅ Organized folder structure:  
Main Drive Folder
├── ZSB Branch Name
│ ├── Rank - Full Name
│ │ └── [Uploaded Files]


---

## 🌐 Deployment

This project is deployed on **Render** and continuously updated via GitHub.

---

## 📁 Folder Structure

📦WB-Sainik-Board-Feedback-Form
┣ 📂public
┃ ┣ 📜index.html
┃ ┣ 📜style.css
┃ ┗ 📜formHandler.js
┣ 📂uploads
┣ 📜server.js
┣ 📜credentials.json (ignored)
┣ 📜.gitignore
┗ 📜README.md


---

## 🛠 Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JS
- **Backend**: Node.js, Express.js
- **Google APIs**: Google Drive API, Google Sheets API
- **File Handling**: Multer
- **Excel Handling**: xlsx
- **Emailing**: nodemailer

---

## 🔒 Security

- `.gitignore` protects `credentials.json` and `node_modules`
- Credentials are handled via Google Cloud Service Accounts
- File uploads are limited to 10 files with validations

---

## 📬 Email Notification Example

> **Subject**: New Feedback Form Submitted  
> **Body**:
> You have received a new form submission.
>
> **Name**: Rajesh Sharma  
> **Rank**: Havildar  
> **Phone**: 9876543210  
> **Branch**: ZSB Jalpaiguri  
> 📎 [Link to Drive Folder]  
> 📄 [Link to Google Sheet]

---

## 📌 Setup Instructions

1. Clone the repo  
2. Run `npm install`  
3. Place your `credentials.json` file in the root  
4. Run with `node server.js`  
5. Deploy via GitHub + Render  
6. Enable Google APIs and share the sheet with your service account email

---

## 📍 Credits

Developed for **West Bengal Sainik Board**  
Developed by **Nayani Paul**
