require('dotenv').config();
const express    = require('express');
const multer     = require('multer');
const cors       = require('cors');
const { google } = require('googleapis');
const nodemailer = require('nodemailer');
const fs         = require('fs');

const app = express(), PORT = process.env.PORT||3000;

app.use(cors());
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({extended:true}));

const upload = multer({dest:'uploads/',limits:{fileSize:10*1024*1024,files:10}});

let drive,sheets;
(async()=>{
  if(!process.env.GOOGLE_CREDENTIALS_JSON) return;
  const auth=new google.auth.GoogleAuth({
    credentials:JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON),
    scopes:['https://www.googleapis.com/auth/drive','https://www.googleapis.com/auth/spreadsheets']
  });
  const client=await auth.getClient();
  drive=google.drive({version:'v3',auth:client});
  sheets=google.sheets({version:'v4',auth:client});
})();

const recent=new Map();
function dup(key){
  const n=Date.now(),l=recent.get(key);
  if(l&&n-l<30000) return true;
  recent.set(key,n); return false;
}
const clean=s=>s.replace(/[^\w\s-]/g,'').replace(/\s+/g,' ').trim();
const branchClean=s=>clean(s.split('(')[0]);

async function ensureFolder(parent,name){
  const q=`'${parent}' in parents and name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const r=await drive.files.list({q,fields:'files(id)'});
  if(r.data.files.length) return r.data.files[0].id;
  const f=await drive.files.create({resource:{name,parents:[parent],mimeType:'application/vnd.google-apps.folder'},fields:'id'});
  return f.data.id;
}

async function sendMail(d,sheetURL,driveURL){
  const tr=nodemailer.createTransport({service:'gmail',auth:{user:process.env.NOTIFY_EMAIL,pass:process.env.APP_PASSWORD}});
  await tr.verify();
  const html=`
  <table border="1" cellpadding="6" style="font-family:Arial;font-size:14px;border-collapse:collapse">
    <tr><td><b>Name</b></td><td>${d.name}</td></tr>
    <tr><td><b>Rank</b></td><td>${d.rank}</td></tr>
    <tr><td><b>Relationship</b></td><td>${d.relationship}</td></tr>
    <tr><td><b>Branch</b></td><td>${d.branch}</td></tr>
    <tr><td><b>Phone</b></td><td>${d.phone}</td></tr>
    <tr><td><b>Email</b></td><td>${d.email||'—'}</td></tr>
    <tr><td><b>ID Card</b></td><td>${d.id||'—'}</td></tr>
    <tr><td><b>Feedback</b></td><td>${d.sugg||'—'}</td></tr>
  </table><br>
  <p><a href="${sheetURL}" target="_blank">Spreadsheet</a> | <a href="${driveURL}" target="_blank">Drive Folder</a></p>`;
  await tr.sendMail({from:`"${process.env.NOTIFY_EMAIL}"<${process.env.NOTIFY_EMAIL}>`,to:process.env.NOTIFY_EMAIL,subject:`New Submission: ${d.rank}-${d.name}(${d.branch})`,html});
}

app.post('/submit', upload.array('upload',10), async(req,res)=>{
  const d=req.body,files=req.files||[];
  if(!d.name||!d.phone||!d.rank||!d.branch||!d.relationship)
    return res.status(400).json({success:false,error:'Missing required fields'});
  if(dup(`${d.name}_${d.phone}`))
    return res.status(429).json({success:false,error:'Wait 30s'});
  try{
    const br=branchClean(d.branch);
    const bf=await ensureFolder(process.env.DRIVE_FOLDER_ID,br);
    const pf=await ensureFolder(bf,clean(`${d.rank}-${d.name}`));
    const ts=new Date().toISOString().replace(/[:T]/g,'_').split('.')[0];
    const tf=await ensureFolder(pf,ts);
    for(const f of files){
      const meta={name:f.originalname,parents:[tf]};
      const media={mimeType:f.mimetype,body:fs.createReadStream(f.path)};
      await drive.files.create({resource:meta,media,fields:'webViewLink'});
      fs.unlinkSync(f.path);
    }
    const row=[new Date().toLocaleString('en-IN',{timeZone:'Asia/Kolkata'}),d.rank,d.name,d.relationship,'',d.email||'',d.phone,d.branch,d.id||'',d.sugg||'',`https://drive.google.com/drive/folders/${tf}`];
    const sheetURL=`https://docs.google.com/spreadsheets/d/${process.env.SHEET_ID}/edit`;
    await sheets.spreadsheets.values.append({spreadsheetId:process.env.SHEET_ID,range:'Sheet1',valueInputOption:'USER_ENTERED',requestBody:{values:[row]}});
    await sendMail(d,sheetURL,`https://drive.google.com/drive/folders/${tf}`);
    res.json({success:true,message:'Submitted'});
  }catch(e){console.error(e);res.status(500).json({success:false,error:'Server error'})}
});

app.get('/health',(r,s)=>s.json({status:'OK',time:new Date().toISOString()}));
app.listen(PORT,()=>console.log(`Server on ${PORT}`));
