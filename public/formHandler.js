/* -----------------------------  Globals -------------------------------- */
let selectedFiles = [];

/* -----------------------------  Utilities ------------------------------ */
function formatFileSize(bytes){
  if(bytes===0) return '0 KB';
  const k=1024;
  if(bytes<k) return bytes+' bytes';
  if(bytes<k*k) return (bytes/k).toFixed(2)+' KB';
  if(bytes<k*k*k) return (bytes/(k*k)).toFixed(2)+' MB';
  return (bytes/(k*k*k)).toFixed(2)+' GB';
}

/* -----------------------------  Modal ---------------------------------- */
function showModal(html, type='info', title='Notification'){
  const modal=document.getElementById('customModal');
  const container=modal.querySelector('.modal-container');
  container.className='modal-container '+type;
  modal.querySelector('.modal-title').textContent=title;
  document.getElementById('modalMessage').innerHTML=html;
  modal.querySelector('.modal-footer').innerHTML=
    '<button class="modal-btn-primary" onclick="closeModal()">OK</button>';
  modal.classList.add('active');
  document.body.style.overflow='hidden';
}
function closeModal(){
  document.getElementById('customModal').classList.remove('active');
  document.body.style.overflow='auto';
}

/* ------------------------  Oversized File Modal ------------------------ */
function showCompressConfirmation(index){
  const f=selectedFiles[index];
  if(!f) return;
  const body=`
    <div>
      <div style="background:#fff;border-radius:12px;padding:20px 24px 14px;box-shadow:0 1px 2px #eee;border-left:6px solid #ff9800;margin-bottom:18px">
        <div style="font-weight:700;font-size:15px;margin-bottom:6px">File: ${f.name}</div>
        <div style="font-size:15px"><b>Current Size:</b> ${(f.size/1048576).toFixed(2)} MB<br><b>Size Limit:</b> 10 MB</div>
      </div>
      <div style="font-weight:500;font-size:17px;text-align:center;margin:10px 0 18px">
        What would you like to do with this oversized file?
      </div>
    </div>`;
  showModal(body,'warning','Oversized File');
  setTimeout(()=>{
    document.querySelector('.modal-footer').innerHTML=
      `<button class="modal-btn-secondary" onclick="closeModal()">No, close this message</button>
       <button class="modal-btn-primary" onclick="showCompressionServices(${index})">Yes, I want to compress</button>`;
  },10);
}

function showCompressionServices(){
  const body=`
    <div>
      <div style="font-weight:600;font-size:15px;margin-bottom:8px">Choose a compression service</div>
      <div style="margin-bottom:16px">
        <button class="modal-btn-primary" style="margin:3px 0" onclick="window.open('https://www.ilovepdf.com/compress_pdf','_blank')">
          iLovePDF (PDFs) <span style="font-size:12px;color:#c8e6c9">Recommended</span>
        </button><br>
        <button class="modal-btn-primary" style="margin:3px 0" onclick="window.open('https://compressjpeg.com/','_blank')">
          CompressJPEG (Images)
        </button><br>
        <button class="modal-btn-primary" style="margin:3px 0" onclick="window.open('https://smallpdf.com/compress-pdf','_blank')">
          SmallPDF (PDFs / Docs)
        </button>
      </div>
      <div style="color:#555;font-size:14px">After compressing, download the file and upload the new version here.</div>
    </div>`;
  showModal(body,'info','Online Compression');
  setTimeout(()=>{
    document.querySelector('.modal-footer').innerHTML=
      '<button class="modal-btn-secondary" onclick="closeModal()">Close</button>';
  },10);
}

/* -------------------------  Preview / Remove --------------------------- */
function renderPreviews(){
  const box=document.getElementById('file-preview');
  box.innerHTML='';
  const oversized=selectedFiles.filter(f=>f.size>10485760);
  if(oversized.length){
    box.innerHTML=`<div class="oversized-warning">
                     <span class="warning-icon">⚠️</span>
                     <span class="warning-text">${oversized.length} file(s) exceed 10 MB — click to compress or remove.</span>
                   </div>`;
  }
  selectedFiles.forEach((file,i)=>{
    const div=document.createElement('div');
    div.className='file-box'+(file.size>10485760?' file-oversized':'');
    // remove btn
    const x=document.createElement('span');
    x.className='remove-btn'; x.textContent='×';
    x.onclick=e=>{e.stopPropagation(); removeFile(i);};
    div.appendChild(x);
    // preview icon/thumb
    if(file.type.startsWith('image/')){
      const img=document.createElement('img');
      img.src=URL.createObjectURL(file); img.className='file-thumb';
      img.onload=()=>URL.revokeObjectURL(img.src);
      div.appendChild(img);
    }else{
      const ic=document.createElement('div');
      ic.className='file-icon'; ic.textContent=file.name.split('.').pop().toUpperCase();
      div.appendChild(ic);
    }
    // name + size
    const name=document.createElement('div');
    name.className='file-name'; name.textContent=file.name;
    div.appendChild(name);
    const badge=document.createElement('div');
    badge.className='file-size-badge'+(file.size>10485760?' oversized':'');
    badge.textContent=formatFileSize(file.size);
    div.appendChild(badge);
    // click for options
    if(file.size>10485760){
      div.style.cursor='pointer';
      div.onclick=e=>showCompressConfirmation(i);
    }
    box.appendChild(div);
  });
  updateFileInput(); updateCount();
}
function updateCount(){
  const valid=selectedFiles.filter(f=>f.size<=10485760).length;
  const over=selectedFiles.length-valid;
  document.getElementById('upload-count').textContent=
    selectedFiles.length?`${valid} ready${over?`, ${over} need compression`:''}`:'No files selected';
}

/* ----------------------------  Init ----------------------------------- */
document.addEventListener('DOMContentLoaded',()=>{
  const input=document.getElementById('upload');
  input.addEventListener('change',e=>{
    const files=Array.from(e.target.files);
    const existing=selectedFiles.map(f=>f.name);
    const unique=files.filter(f=>!existing.includes(f.name));
    if(selectedFiles.length+unique.length>10){
      unique.splice(10-selectedFiles.length);
      showModal('Maximum 10 files allowed. Extras were ignored.','warning','Limit');
    }
    selectedFiles=[...selectedFiles,...unique];
    input.value=''; renderPreviews();
  });

  // block submit if oversized
  document.getElementById('feedbackForm').addEventListener('submit',e=>{
    if(selectedFiles.some(f=>f.size>10485760)){
      e.preventDefault();
      showModal('Please compress or remove all files over 10 MB before submitting.','error','Oversized Files');
    }
  });

  renderPreviews();
});

/* -------------------------  Help / README ------------------------------ */
function showFormHelp(){
  showModal(`
    <div>
      <h4>Form Guidelines</h4>
      <ul style="text-align:left">
        <li>Max 10 files, each ≤ 10 MB.</li>
        <li>Red × removes a file.</li>
        <li>Orange border = oversized. Click it → compress/remove dialog.</li>
        <li>Submit is blocked while any oversized file remains.</li>
      </ul>
    </div>`, 'info','Help');
}
