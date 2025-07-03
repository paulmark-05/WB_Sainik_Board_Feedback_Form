// formHandler.js

// Full‐screen submitting overlay elements
const overlay     = document.getElementById('submittingOverlay');
const overlayMsg  = document.getElementById('overlayMessage');
const overlaySpin = document.getElementById('overlaySpinner');

// Prevent multiple submissions
let isSubmitting = false;
let selectedFiles = [];
let currentCompressFileIndex = -1;

// Helper selectors
const qs = s => document.querySelector(s);
const qsa = s => document.querySelectorAll(s);

// Format file sizes
function formatFileSize(bytes) {
    if (bytes === 0) return '0 KB';
    const k = 1024;
    if (bytes < k) return bytes + ' bytes';
    if (bytes < k*k) return (bytes/k).toFixed(2) + ' KB';
    if (bytes < k*k*k) return (bytes/(k*k)).toFixed(2) + ' MB';
    return (bytes/(k*k*k)).toFixed(2) + ' GB';
}

// Relationship toggle logic
function setupRelationshipToggle() {
    const radios = qsa('input[name="relationship"]');
    radios.forEach(radio => {
        let selected = false;
        radio.addEventListener('click', function() {
            if (selected && this.checked) {
                this.checked = false;
                selected = false;
            } else {
                radios.forEach(r => r.parentElement.isSelected = false);
                this.checked = true;
                selected = true;
            }
            qs('#relationshipLabel').classList.remove('required-error');
        });
        radio.addEventListener('change', function() {
            if (this.checked) {
                radios.forEach(r => { if (r!==this) r.parentElement.isSelected=false });
                selected = true;
                qs('#relationshipLabel').classList.remove('required-error');
            }
        });
    });
}

// Validate relationship selection
function validateRelationshipField() {
    const chosen = [...qsa('input[name="relationship"]')].some(r => r.checked);
    const label = qs('#relationshipLabel');
    if (chosen) {
        label.classList.remove('required-error');
        return true;
    }
    label.classList.add('required-error');
    qs('#relationshipSection').scrollIntoView({behavior:'smooth',block:'center'});
    return false;
}

// Consent checkbox logic
function validateConsent() {
    const cb = qs('#consentCheckbox'), btn = qs('#submitBtn');
    if (cb.checked) {
        btn.disabled = false;
        btn.classList.remove('disabled');
    } else {
        btn.disabled = true;
        btn.classList.add('disabled');
    }
}

// Phone validation
function validatePhoneNumber(phone) {
    return /^[6-9]\d{9}$/.test(phone.replace(/\D/g,''));
}
function setupPhoneValidation() {
    const input = qs('#phone'), err = qs('#phone-error');
    input.addEventListener('input', () => {
        const val = input.value.trim();
        if (!val) { err.style.display='none'; return; }
        if (!validatePhoneNumber(val)) {
            err.textContent = 'Please enter a valid 10-digit mobile number';
            err.style.display = 'block';
        } else {
            err.style.display = 'none';
        }
    });
}

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
}

// Show Remove / Compress confirmation
function showCompressionConfirmation(index) {
    const file = selectedFiles[index];
    if (!file) return;
    currentCompressFileIndex = index;
    showModal(
        `<p><strong>${file.name}</strong><br>Size: ${formatFileSize(file.size)} (limit 10 MB)</p>
         <p>What would you like to do with this oversized file?</p>`,
        'warning',
        'Compress File Confirmation',
        `<button class="modal-btn-secondary" onclick="closeModal()">No, close this message</button>
         <button class="modal-btn-primary" onclick="proceedToCompression()">Yes, I want to compress</button>`
    );
}

// After clicking "Yes, I want to compress"
function proceedToCompression() {
    closeModal();
    const file = selectedFiles[currentCompressFileIndex];
    if (!file) return;
    showModal(
        `<div class="compression-modal white-bg">
            <h4 class="compression-title">File Compression Services</h4>
            <p>Compress <strong>${file.name}</strong> using:</p>
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
            <p class="compression-instructions">💡 After compressing, download the new file and re-upload it here.</p>
        </div>`,
        'info','',
        `<button class="modal-btn-secondary" onclick="closeModal()">Close</button>`
    );
}
window.proceedToCompression = proceedToCompression;

// File preview & removal
function updateFileInput() {
    const inp = qs('#upload'), dt = new DataTransfer();
    selectedFiles.forEach(f=>dt.items.add(f));
    inp.files = dt.files;
}
function renderPreviews() {
    const box = qs('#file-preview');
    box.innerHTML = '';
    const over = selectedFiles.filter(f=>f.size>10*1024*1024).length;
    if (over) {
        box.innerHTML = `<div class="oversized-warning"><span class="warning-icon">⚠️</span><span class="warning-text">${over} file(s) exceed 10MB - click to manage.</span></div>`;
    }
    selectedFiles.forEach((f,i) => {
        const d = document.createElement('div');
        d.className = 'file-box' + (f.size>10*1024*1024?' file-oversized':'');
        const rm = document.createElement('span');
        rm.className='remove-btn'; rm.textContent='×';
        rm.onclick=e=>{e.stopPropagation(); selectedFiles.splice(i,1); updateFileInput(); renderPreviews();};
        d.appendChild(rm);
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
        nameDiv.className='file-name';
        nameDiv.textContent = f.name;
        d.appendChild(nameDiv);
        const sb = document.createElement('div');
        sb.className='file-size-badge'+(f.size>10*1024*1024?' oversized':'');
        sb.textContent = formatFileSize(f.size);
        d.appendChild(sb);
        if (f.size>10*1024*1024) d.onclick=()=>showCompressionConfirmation(i);
        box.appendChild(d);
    });
    updateFileCount();
}

function updateFileCount() {
    const valid = selectedFiles.filter(f=>f.size<=10*1024*1024).length;
    const over  = selectedFiles.length - valid;
    qs('#upload-count').textContent = selectedFiles.length
        ? `${valid} ready${over?`, ${over} need compression`:''}`
        : 'No files selected';
}

// Form Guidelines & Help
function showFormHelp() {
    showModal(
        `<ul style="text-align:left">
           <li>Name, Relationship, Rank, Phone & Branch are required.</li>
           <li>Up to 10 files, each ≤ 10 MB.</li>
           <li>Remove file: click ×. Oversized: click to compress.</li>
           <li>Check consent box to enable SUBMIT.</li>
         </ul>`,
        'info','Form Help'
    );
}

// Main initialization
document.addEventListener('DOMContentLoaded', () => {
    const uploadInput    = qs('#upload');
    const form           = qs('#feedbackForm');
    const submitBtn      = qs('#submitBtn');
    const consentCheckbox= qs('#consentCheckbox');

    // Disable submit until consent
    submitBtn.disabled = true;
    consentCheckbox.onchange = () => {
        submitBtn.disabled = !consentCheckbox.checked;
        submitBtn.classList.toggle('disabled', !consentCheckbox.checked);
    };

    // Phone live validation
    setupPhoneValidation();

    // Relationship toggles
    setupRelationshipToggle();

    // File input handling
    uploadInput.onchange = e => {
        const files = [...e.target.files].filter(f => !selectedFiles.some(x => x.name === f.name));
        if (selectedFiles.length + files.length > 10) {
            showModal('Maximum 10 files allowed; extras ignored.','warning','File Limit');
            files.splice(10 - selectedFiles.length);
        }
        selectedFiles = [...selectedFiles, ...files];
        e.target.value = '';
        renderPreviews();
    };

    // Form submission
    form.onsubmit = e => {
        e.preventDefault();
        if (!checkRelationship()) {
            showModal('Please select your relationship.','error','Required');
            return;
        }
        if (!validatePhoneNumber(qs('#phone').value)) {
            showModal('Please enter a valid 10-digit mobile number.','error','Invalid Phone');
            return;
        }
        if (selectedFiles.some(f=>f.size>10*1024*1024)) {
            showModal('Please compress files over 10 MB first.','error','Oversized Files');
            return;
        }
        if (!confirmPending) {
            confirmPending = true;
            showModal(
                'If all information is correct and not violating norms, click Confirm.',
                'confirm','Confirm Submission',
                `<button class="modal-btn-secondary" onclick="closeModal()">Cancel</button>
                 <button class="modal-btn-primary" onclick="submitForm()">Confirm</button>`
            );
        }
    };

    renderPreviews();
});

// Submit form with full-screen overlay
async function submitForm() {
    closeModal();
    overlay.classList.remove('hidden', 'success');
    overlaySpin.style.display = 'block';
    overlayMsg.textContent = 'Submitting…';
    const form = qs('#feedbackForm');
    const btn  = qs('#submitBtn');
    btn.disabled = true;

    const fd = new FormData(form);
    selectedFiles.forEach(f => fd.append('upload', f));

    try {
        const res = await fetch('/submit', { method: 'POST', body: fd });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Submission failed');

        overlaySpin.style.display = 'none';
        overlay.classList.add('success');
        overlayMsg.textContent = '✔️ Submitted';

        setTimeout(() => {
            overlay.classList.add('hidden');
            overlay.classList.remove('success');
            form.reset();
            selectedFiles = [];
            renderPreviews();
            validateConsent();
        }, 1500);
    } catch (err) {
        overlay.classList.add('hidden');
        showModal('Submission error: ' + err.message, 'error', 'Error');
    } finally {
        btn.disabled = false;
    }
}
