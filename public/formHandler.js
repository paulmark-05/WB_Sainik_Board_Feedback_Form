// formHandler.js

document.addEventListener('DOMContentLoaded', () => {
  // Overlay elements
  const overlay      = document.getElementById('submittingOverlay');
  const overlayMsg   = document.getElementById('overlayMessage');
  const overlaySpin  = document.getElementById('overlaySpinner');

  let isSubmitting = false;
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

  // Modal controls
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

  // Relationship validation
  function setupRelationshipToggle() {
    const radios = qsa('input[name="relationship"]');
    radios.forEach(radio => {
      let sel = false;
      radio.addEventListener('click', () => {
        if (sel && radio.checked) {
          radio.checked = false; sel = false;
        } else {
          radios.forEach(r => r.parentElement.isSelected = false);
          radio.checked = true; sel = true;
        }
        qs('#relationshipLabel').classList.remove('required-error');
      });
    });
  }
  function validateRelationshipField() {
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

  // Consent
  const submitBtn = qs('#submitBtn'), consentCheckbox = qs('#consentCheckbox');
  consentCheckbox.addEventListener('change', () => {
    submitBtn.disabled = !consentCheckbox.checked;
    submitBtn.classList.toggle('disabled', !consentCheckbox.checked);
  });

  // Phone validation
  function validPhone(p) { return /^[6-9]\d{9}$/.test(p.replace(/\D/g,'')); }
  qs('#phone').addEventListener('input', e => {
    const err = qs('#phone-error');
    if (!e.target.value) return err.style.display='none';
    const ok = validPhone(e.target.value);
    err.textContent = ok ? '' : 'Invalid 10-digit number';
    err.style.display = ok ? 'none' : 'block';
  });

  // File preview
  function updateFileInput() {
    const inp = qs('#upload'), dt = new DataTransfer();
    selectedFiles.forEach(f => dt.items.add(f));
    inp.files = dt.files;
  }
  function renderPreviews() {
    const box = qs('#file-preview'); box.innerHTML = '';
    const over = selectedFiles.filter(f=>f.size>10*1024*1024).length;
    if (over) {
      box.innerHTML = `<div class="oversized-warning">
        <span class="warning-icon">⚠️</span>
        <span class="warning-text">${over} file(s) >10MB — click to manage.</span>
      </div>`;
    }
    selectedFiles.forEach((f,i) => {
      const d = document.createElement('div');
      d.className = 'file-box' + (f.size>10*1024*1024 ? ' file-oversized' : '');
      const x = document.createElement('span');
      x.className = 'remove-btn'; x.textContent = '×';
      x.onclick = e => { e.stopPropagation(); selectedFiles.splice(i,1); updateFileInput(); renderPreviews(); };
      d.appendChild(x);

      if (f.type.startsWith('image/')) {
        const img = document.createElement('img');
        img.className = 'file-thumb'; img.src = URL.createObjectURL(f);
        img.onload = () => URL.revokeObjectURL(img.src);
        d.appendChild(img);
      } else {
        const ic = document.createElement('div');
        ic.className = 'file-icon'; ic.textContent = f.name.split('.').pop().toUpperCase();
        d.appendChild(ic);
      }

      const nameDiv = document.createElement('div');
      nameDiv.className = 'file-name'; nameDiv.textContent = f.name;
      d.appendChild(nameDiv);

      const sb = document.createElement('div');
      sb.className = 'file-size-badge' + (f.size>10*1024*1024 ? ' oversized' : '');
      sb.textContent = fmt(f.size);
      d.appendChild(sb);

      if (f.size>10*1024*1024) d.onclick = () => showCompressionConfirmation(i);
      box.appendChild(d);
    });
    updateFileCount();
  }
  function updateFileCount() {
    const valid = selectedFiles.filter(f=>f.size<=10*1024*1024).length;
    const over = selectedFiles.length - valid;
    qs('#upload-count').textContent = selectedFiles.length
      ? `${valid} ready${over ? `, ${over} need compression` : ''}`
      : 'No files selected';
  }
  qs('#upload').addEventListener('change', e => {
    const nf = [...e.target.files].filter(f => !selectedFiles.find(x=>x.name===f.name));
    if (selectedFiles.length + nf.length > 10) {
      showModal('Maximum 10 files allowed; extras ignored.', 'warning', 'File Limit');
      nf.splice(10 - selectedFiles.length);
    }
    selectedFiles = [...selectedFiles, ...nf];
    e.target.value = '';
    renderPreviews();
  });

  // Compression dialogs
  function showCompressionConfirmation(index) {
    const f = selectedFiles[index];
    currentCompressFileIndex = index;
    showModal(
      `<p><strong>${f.name}</strong><br>Size: ${fmt(f.size)} (limit 10 MB)</p>
       <p>Remove or compress?</p>`,
      'warning', 'Compress File Confirmation',
      `<button class="modal-btn-secondary" onclick="closeModal()">No, close this message</button>
       <button class="modal-btn-primary" onclick="proceedToCompression()">Yes, I want to compress</button>`
    );
  }
  function proceedToCompression() {
    closeModal();
    const f = selectedFiles[currentCompressFileIndex];
    if (!f) return;
    showModal(
      `<div class="compression-modal white-bg">
         <h4 class="compression-title">File Compression Services</h4>
         <p>Compress <strong>${f.name}</strong> using:</p>
         <div class="service-cards">
           <div class="service-card">
             <button onclick="window.open('https://www.youcompress.com/','_blank')">YouCompress</button>
             <p>No registration • Multiple formats</p>
           </div>
           <div class="service-card recommended">
             <button onclick="window.open('https://www.ilovepdf.com/compress_pdf','_blank')">iLovePDF <span class="recommended-text">(Recommended)</span></button>
             <p>PDF specialist • High quality</p>
           </div>
           <div class="service-card">
             <button onclick="window.open('https://smallpdf.com/compress-pdf','_blank')">SmallPDF</button>
             <p>Easy • Quick processing</p>
           </div>
         </div>
         <p class="compression-instructions">💡 After compressing, download & re-upload the new file here.</p>
       </div>`,
      'info', '',
      `<button class="modal-btn-secondary" onclick="closeModal()">Close</button>`
    );
  }
  window.proceedToCompression = proceedToCompression;

  // Help dialog
  function showFormHelp() {
    showModal(
      `<ul style="text-align:left">
         <li>Name, Relationship, Rank, Phone & Branch are required.</li>
         <li>Up to 10 files, each ≤ 10 MB.</li>
         <li>Remove file: click ×. Oversized: click to compress.</li>
         <li>Check consent box to enable SUBMIT.</li>
       </ul>`,
      'info', 'Form Help'
    );
  }

  // Submit handling with overlay
  function submitForm() {
    closeModal();
    overlay.classList.remove('hidden','success');
    overlaySpin.style.display = 'block';
    overlayMsg.textContent = 'Submitting…';
    const form = qs('#feedbackForm');
    const btn  = qs('#submitBtn');
    btn.disabled = true;

    const fd = new FormData(form);
    selectedFiles.forEach(f=>fd.append('upload',f));

    fetch('/submit',{method:'POST',body:fd})
      .then(r=>r.json().then(j=>{ if(!r.ok) throw new Error(j.error||'Submission failed'); return j }))
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

  // Form onsubmit
  qs('#feedbackForm').addEventListener('submit', e => {
    e.preventDefault();
    if (!validateRelationshipField()) { showModal('Please select Relationship.','error','Required'); return; }
    if (!validPhone(qs('#phone').value)) { showModal('Enter valid phone.','error','Phone'); return; }
    if (selectedFiles.some(f=>f.size>10*1024*1024)) { showModal('Compress files >10MB first.','error','Oversized'); return; }
    if (!confirmPending) {
      confirmPending = true;
      showModal(
        'If all information is correct, click Confirm to submit.',
        'confirm','Confirm Submission',
        `<button class="modal-btn-secondary" onclick="closeModal()">Cancel</button>
         <button class="modal-btn-primary" onclick="submitForm()">Confirm</button>`
      );
    }
  });

  // Initialize
  setupRelationshipToggle();
  renderPreviews();
});
