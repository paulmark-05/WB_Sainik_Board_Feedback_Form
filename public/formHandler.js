document.addEventListener('DOMContentLoaded', () => {
  // Overlay elements
  const overlay      = document.getElementById('submittingOverlay');
  const overlayMsg   = document.getElementById('overlayMessage');
  const overlaySpin  = document.getElementById('overlaySpinner');

  let selectedFiles = [];
  let currentCompressFileIndex = -1;
  let confirmPending = false;

  const qs  = s => document.querySelector(s);
  const qsa = s => document.querySelectorAll(s);
  const fmt = bytes => {
    const k = 1024;
    if (bytes < k) return bytes + ' bytes';
    if (bytes < k*k) return (bytes/k).toFixed(2) + ' KB';
    if (bytes < k*k*k) return (bytes/(k*k)).toFixed(2) + ' MB';
    return (bytes/(k*k*k)).toFixed(2) + ' GB';
  };

  // Add red‐border CSS for invalid inputs
  const style = document.createElement('style');
  style.textContent = `
    .input-error { border-color: #e53935 !important; }
    .label-error { color: #e53935 !important; }
  `;
  document.head.appendChild(style);

  // Modal
  function showModal(html, type='info', title='Notification', footerHTML='<button class="modal-btn-primary" onclick="closeModal()">OK</button>') {
    const m = qs('#customModal'); m.classList.add('active');
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

  // Highlight empty required fields on blur
  ['#esmName','#rank','#branch','#phone'].forEach(sel => {
    const el = qs(sel);
    el.addEventListener('blur', () => {
      if (!el.value.trim()) el.classList.add('input-error');
      else el.classList.remove('input-error');
    });
  });

  // Relationship
  function setupRelationshipToggle() {
    qsa('input[name="relationship"]').forEach(radio => {
      radio.addEventListener('change', () => {
        qs('#relationshipLabel').classList.remove('label-error');
      });
    });
  }
  function validateRelationshipField() {
    const chosen = [...qsa('input[name="relationship"]')].some(r=>r.checked);
    const label = qs('#relationshipLabel');
    if (chosen) return true;
    label.classList.add('label-error');
    qs('#relationshipSection').scrollIntoView({behavior:'smooth', block:'center'});
    return false;
  }

  // Consent
  const submitBtn = qs('#submitBtn'), consentCheckbox = qs('#consentCheckbox');
  submitBtn.disabled = true;
  consentCheckbox.addEventListener('change', () => {
    submitBtn.disabled = !consentCheckbox.checked;
    submitBtn.classList.toggle('disabled', !consentCheckbox.checked);
  });

  // Phone validation
  function validPhone(p) { return /^[6-9]\d{9}$/.test(p.replace(/\D/g,'')); }
  qs('#phone').addEventListener('input', e => {
    const err = qs('#phone-error');
    const ok = validPhone(e.target.value);
    err.textContent = ok ? '' : 'Invalid 10-digit number';
    err.style.display = ok ? 'none' : 'block';
    if (ok) qs('#phone').classList.remove('input-error');
  });

  // File preview
  function updateFileInput() {
    const inp = qs('#upload'), dt = new DataTransfer();
    selectedFiles.forEach(f=>dt.items.add(f));
    inp.files = dt.files;
  }
  function renderPreviews() {
    const box = qs('#file-preview');
    box.innerHTML = '';
    const over = selectedFiles.filter(f=>f.size>10*1024*1024).length;
    if (over) box.innerHTML = `<div class="oversized-warning">⚠️ ${over} file(s) >10MB</div>`;
    selectedFiles.forEach((f,i) => {
      const d = document.createElement('div');
      d.className = 'file-box' + (f.size>10*1024*1024?' file-oversized':'');
      const x = document.createElement('span');
      x.className='remove-btn'; x.textContent='×';
      x.onclick=e=>{e.stopPropagation();selectedFiles.splice(i,1);updateFileInput();renderPreviews()};
      d.appendChild(x);
      if (f.type.startsWith('image/')) {
        const img = document.createElement('img');
        img.className='file-thumb'; img.src=URL.createObjectURL(f);
        img.onload=()=>URL.revokeObjectURL(img.src);
        d.appendChild(img);
      } else {
        const ic = document.createElement('div');
        ic.className='file-icon'; ic.textContent=f.name.split('.').pop().toUpperCase();
        d.appendChild(ic);
      }
      const nameDiv = document.createElement('div');
      nameDiv.className='file-name'; nameDiv.textContent=f.name;
      d.appendChild(nameDiv);
      const sb = document.createElement('div');
      sb.className='file-size-badge'+(f.size>10*1024*1024?' oversized':'');
      sb.textContent=fmt(f.size);
      d.appendChild(sb);
      if (f.size>10*1024*1024) d.onclick=()=>showCompressionConfirmation(i);
      box.appendChild(d);
    });
    updateFileCount();
  }
  function updateFileCount() {
    const valid = selectedFiles.filter(f=>f.size<=10*1024*1024).length;
    const over = selectedFiles.length - valid;
    qs('#upload-count').textContent = selectedFiles.length
      ? `${valid} ready${over?`, ${over} need compression`:''}`
      : 'No files selected';
  }
  qs('#upload').addEventListener('change', e => {
    const nf=[...e.target.files].filter(f=>!selectedFiles.find(x=>x.name===f.name));
    if (selectedFiles.length+nf.length>10) {
      showModal('Max 10 files; extras ignored.','warning','File Limit');
      nf.splice(10-selectedFiles.length);
    }
    selectedFiles=[...selectedFiles,...nf];
    e.target.value=''; renderPreviews();
  });

  // Compression dialogs
  function showCompressionConfirmation(i) {
    const f = selectedFiles[i];
    currentCompressFileIndex = i;
    showModal(
      `<p><strong>${f.name}</strong><br>Size: ${fmt(f.size)} (limit 10 MB)</p>
       <p>Remove or compress?</p>`,
      'warning','Compress File Confirmation',
      `<button class="modal-btn-secondary" onclick="closeModal()">No, close</button>
       <button class="modal-btn-primary" onclick="proceedToCompression()">Yes, I want to compress</button>`
    );
  }
  function proceedToCompression() {
    closeModal();
    const f=selectedFiles[currentCompressFileIndex];
    if (!f) return;
    showModal(
      `<div class="compression-modal white-bg">
         <h4 class="compression-title">File Compression Services</h4>
         <p>Compress <strong>${f.name}</strong> using:</p>
         <div class="service-cards">
           <div class="service-card"><button onclick="window.open('https://www.youcompress.com/','_blank')">YouCompress</button><p>No signup • Multi-format</p></div>
           <div class="service-card recommended"><button onclick="window.open('https://www.ilovepdf.com/compress_pdf','_blank')">iLovePDF<span class="recommended-text">(Recommended)</span></button><p>PDF specialist • High quality</p></div>
           <div class="service-card"><button onclick="window.open('https://smallpdf.com/compress-pdf','_blank')">SmallPDF</button><p>Easy • Quick</p></div>
         </div>
         <p class="compression-instructions">💡 After compressing, re-upload the new file here.</p>
       </div>`,
       'info','',
       `<button class="modal-btn-secondary" onclick="closeModal()">Close</button>`
    );
  }
  window.proceedToCompression = proceedToCompression;

  // Help
  function showFormHelp() {
    showModal(
      `<ul style="text-align:left">
         <li><strong>Name</strong>, <strong>Relationship</strong>, <strong>Rank</strong>, <strong>Phone</strong> & <strong>Branch</strong> are required.</li>
         <li>Up to 10 files, each ≤ 10 MB.</li>
         <li>Remove file: click ×. Oversized: click to compress.</li>
         <li>Check consent box to enable SUBMIT.</li>
       </ul>`,
      'info','Form Guidelines & Help'
    );
  }
  qs('.guidelines-btn').addEventListener('click', showFormHelp);

  // Submit logic
  function submitForm() {
    closeModal();
    overlay.classList.remove('hidden','success');
    overlaySpin.style.display = 'block';
    overlayMsg.textContent = 'Submitting…';
    const form = qs('#feedbackForm'), btn = qs('#submitBtn');
    btn.disabled = true;

    const fd = new FormData(form);
    selectedFiles.forEach(f=>fd.append('upload',f));

    fetch('/submit',{method:'POST',body:fd})
      .then(r=>r.json().then(json=>{ if(!r.ok) throw new Error(json.error||'Failed'); return json }))
      .then(()=>{
        overlaySpin.style.display = 'none';
        overlay.classList.add('success');
        overlayMsg.textContent = '✔️ Submitted';
        setTimeout(()=>{
          overlay.classList.add('hidden');
          overlay.classList.remove('success');
          form.reset();
          selectedFiles = [];
          renderPreviews();
          submitBtn.disabled = true;
        },1500);
      })
      .catch(err=>{
        overlay.classList.add('hidden');
        showModal('Submission error: '+err.message,'error','Error');
        btn.disabled = false;
      });
  }

  qs('#feedbackForm').addEventListener('submit', e => {
    e.preventDefault();
    ['#esmName','#rank','#branch','#phone'].forEach(sel=>{
      const el=qs(sel);
      if(!el.value.trim()) el.classList.add('input-error');
    });
    if(!validateRelationshipField()) return;
    if(!validPhone(qs('#phone').value)) return showModal('Please enter valid phone','error','Invalid Phone');
    if(selectedFiles.some(f=>f.size>10*1024*1024)) return showModal('Compress files >10MB first','error','Oversized');
    if(!confirmPending) {
      confirmPending = true;
      showModal(
        'All set? Click Confirm to submit.',
        'confirm','Confirm Submission',
        `<button class="modal-btn-secondary" onclick="closeModal()">Cancel</button>
         <button class="modal-btn-primary" onclick="submitForm()">Confirm</button>`
      );
    }
  });

  // Init
  setupRelationshipToggle();
  renderPreviews();
});
