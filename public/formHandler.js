let selectedFiles = [];
let confirmPending = false;

// Helpers
const qs = s => document.querySelector(s);
const qsa = s => document.querySelectorAll(s);
const fmt = b => {
  const k = 1024;
  if (b < k) return b + ' bytes';
  if (b < k*k) return (b/k).toFixed(2) + ' KB';
  if (b < k*k*k) return (b/(k*k)).toFixed(2) + ' MB';
  return (b/(k*k*k)).toFixed(2) + ' GB';
};

// Modal
function showModal(html, type='info', title='Notification', footerHTML='<button class="modal-btn-primary" onclick="closeModal()">OK</button>') {
  const m = qs('#customModal');
  m.classList.add('active');
  qs('.modal-container').className = 'modal-container ' + type;
  qs('.modal-title').textContent = title;
  qs('#modalMessage').innerHTML = html;
  qs('.modal-footer').innerHTML = footerHTML;
  document.body.style.overflow = 'hidden';
}
function closeModal() {
  qs('#customModal').classList.remove('active');
  document.body.style.overflow = 'auto';
  confirmPending = false;
}

// Validate relationship
function checkRelationship() {
  const chosen = [...qsa('input[name="relationship"]')].some(r => r.checked);
  const label = qs('#relationshipLabel');
  if (chosen) {
    label.classList.remove('required-error');
    return true;
  }
  label.classList.add('required-error');
  qs('#relationshipSection').scrollIntoView({ behavior:'smooth', block:'center' });
  return false;
}

// Phone validation
function validPhone(p) { return /^[6-9]\d{9}$/.test(p.replace(/\D/g,'')); }

// Preview
function updateInput() {
  const dt = new DataTransfer();
  selectedFiles.forEach(f => dt.items.add(f));
  qs('#upload').files = dt.files;
}
function preview() {
  const box = qs('#file-preview'); box.innerHTML = '';
  const over = selectedFiles.filter(f => f.size > 10*1024*1024).length;
  if (over) box.innerHTML = `<div class="oversized-warning"><span class="warning-icon">⚠️</span><span class="warning-text">${over} file(s) >10MB - click to manage.</span></div>`;
  selectedFiles.forEach((f,i) => {
    const d = document.createElement('div');
    d.className = 'file-box' + (f.size>10*1024*1024?' file-oversized':'');
    const x = document.createElement('span');
    x.className = 'remove-btn'; x.textContent = '×';
    x.onclick = e => { e.stopPropagation(); selectedFiles.splice(i,1); updateInput(); preview(); };
    d.appendChild(x);
    if (f.type.startsWith('image/')) {
      const img = document.createElement('img');
      img.src = URL.createObjectURL(f); img.className = 'file-thumb';
      img.onload = ()=>URL.revokeObjectURL(img.src);
      d.appendChild(img);
    } else {
      const ic = document.createElement('div'); ic.className='file-icon';
      ic.textContent = f.name.split('.').pop().toUpperCase();
      d.appendChild(ic);
    }
    const sb = document.createElement('div');
    sb.className = 'file-size-badge'+(f.size>10*1024*1024?' oversized':'');
    sb.textContent = fmt(f.size);
    d.appendChild(sb);
    if (f.size>10*1024*1024) d.onclick=()=>manageOversize(i);
    box.appendChild(d);
  });
  updateInput();
  const valid = selectedFiles.filter(f=>f.size<=10*1024*1024).length;
  qs('#upload-count').textContent = selectedFiles.length
    ? `${valid} ready${over?`, ${over} need compression`:''}`
    : 'No files selected';
}

// Oversize handling
function manageOversize(i) {
  const f = selectedFiles[i];
  showModal(
    `<p><strong>${f.name}</strong><br>Size: ${fmt(f.size)} (limit 10MB)</p><p>Remove or compress?</p>`,
    'warning','Oversized File',
    `<button class="modal-btn-secondary" onclick="closeModal()">Cancel</button>
     <button class="modal-btn-primary" onclick="openCompression()">Compress</button>`
  );
}
function openCompression(){
  showModal(
    `<p>Select a free compression service; then re-upload.</p>
     <button class="modal-btn-primary" onclick="window.open('https://www.ilovepdf.com/compress_pdf','_blank')">iLovePDF</button>
     <button class="modal-btn-primary" onclick="window.open('https://compressjpeg.com/','_blank')">CompressJPEG</button>
     <button class="modal-btn-primary" onclick="window.open('https://smallpdf.com/compress-pdf','_blank')">SmallPDF</button>`,
    'info','Online Compression',
    `<button class="modal-btn-secondary" onclick="closeModal()">Close</button>`
  );
}

// Help
function showFormHelp(){
  showModal(
    `<ul style="text-align:left">
       <li>Name, Relationship, Rank, Phone & Branch are required.</li>
       <li>Up to 10 files, each ≤10MB.</li>
       <li>Remove: ×. Oversized: click to compress.</li>
     </ul>`,
    'info','Help'
  );
}

// Init
document.addEventListener('DOMContentLoaded',()=>{
  const inp=qs('#upload'), form=qs('#feedbackForm'),
        sb=qs('#submitBtn'), c=qs('#consentCheckbox');

  c.onchange = ()=>{ sb.disabled=!c.checked; sb.classList.toggle('disabled',!c.checked) };
  qs('#phone').oninput = e=>{ const pe=qs('#phone-error'); if(!e.target.value) return pe.style.display='none';
    pe.textContent = validPhone(e.target.value)?'':'Invalid number'; pe.style.display = pe.textContent?'block':'none';
  };
  inp.onchange = e=>{
    const nf=[...e.target.files].filter(f=>!selectedFiles.find(x=>x.name===f.name));
    if(selectedFiles.length+nf.length>10){ nf.splice(10-selectedFiles.length); showModal('Max 10 files; extras ignored.','warning','Limit') }
    selectedFiles=[...selectedFiles,...nf]; e.target.value=''; preview();
  };

  form.onsubmit = e=>{
    e.preventDefault();
    if(!checkRelationship()){ showModal('Please select Relationship.','error','Required'); return; }
    if(!validPhone(qs('#phone').value)){ showModal('Enter a valid phone.','error','Phone'); return; }
    if(selectedFiles.some(f=>f.size>10*1024*1024)){ showModal('Compress files >10MB first.','error','Oversized'); return; }
    showModal(
      'If all information is correct and not violating norms, click Confirm.',
      'confirm','Confirm Submission',
      `<button class="modal-btn-secondary" onclick="closeModal()">Cancel</button>
       <button class="modal-btn-primary" onclick="submitForm()">Confirm</button>`
    );
  };
  preview();
});

function submitForm(){
  closeModal();
  const form = qs('#feedbackForm'), sb=qs('#submitBtn');
  sb.disabled=true; sb.textContent='Submitting…';
  const fd=new FormData(form); selectedFiles.forEach(f=>fd.append('upload',f));
  fetch('/submit',{method:'POST',body:fd})
    .then(r=>r.json()).then(j=>{
      if(j.success) showModal('Form submitted successfully.','success','Done'), form.reset(),selectedFiles=[],preview();
      else throw new Error(j.error||'Error');
    })
    .catch(e=>showModal('Submission failed: '+e.message,'error','Error'))
    .finally(()=>{sb.disabled=false; sb.textContent='SUBMIT';});
}
