// formHandler.js

let selectedFiles = [];
let currentCompressFileIndex = -1;
let confirmPending = false;

// Helper functions
const qs = selector => document.querySelector(selector);
const qsa = selector => document.querySelectorAll(selector);
const formatFileSize = bytes => {
    const k = 1024;
    if (bytes === 0) return '0 KB';
    if (bytes < k) return bytes + ' bytes';
    if (bytes < k * k) return (bytes / k).toFixed(2) + ' KB';
    if (bytes < k * k * k) return (bytes / (k * k)).toFixed(2) + ' MB';
    return (bytes / (k * k * k)).toFixed(2) + ' GB';
};

// Modal functions
function showModal(html, type = 'info', title = 'Notification', footerHTML = '<button class="modal-btn-primary" onclick="closeModal()">OK</button>') {
    const modal = qs('#customModal');
    modal.classList.add('active');
    const container = modal.querySelector('.modal-container');
    container.className = 'modal-container ' + type;
    qs('.modal-title').textContent = title;
    qs('#modalMessage').innerHTML = html;
    qs('.modal-footer').innerHTML = footerHTML;
    document.body.style.overflow = 'hidden';
}
function closeModal() {
    const modal = qs('#customModal');
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
    confirmPending = false;
}

// Relationship validation
function checkRelationship() {
    const chosen = [...qsa('input[name="relationship"]')].some(r => r.checked);
    const label = qs('#relationshipLabel');
    if (chosen) {
        label.classList.remove('required-error');
        return true;
    }
    label.classList.add('required-error');
    qs('#relationshipSection').scrollIntoView({ behavior: 'smooth', block: 'center' });
    return false;
}

// Phone validation
function validPhone(phone) {
    return /^[6-9]\d{9}$/.test(phone.replace(/\D/g, ''));
}

// File preview & management
function updateFileInput() {
    const input = qs('#upload');
    const dt = new DataTransfer();
    selectedFiles.forEach(file => dt.items.add(file));
    input.files = dt.files;
}
function renderPreviews() {
    const preview = qs('#file-preview');
    preview.innerHTML = '';
    const oversizedCount = selectedFiles.filter(f => f.size > 10 * 1024 * 1024).length;
    if (oversizedCount) {
        preview.innerHTML = `
            <div class="oversized-warning">
                <span class="warning-icon">⚠️</span>
                <span class="warning-text">${oversizedCount} file(s) exceed 10 MB - click to manage.</span>
            </div>
        `;
    }
    selectedFiles.forEach((file, index) => {
        const box = document.createElement('div');
        box.className = 'file-box' + (file.size > 10 * 1024 * 1024 ? ' file-oversized' : '');
        const removeBtn = document.createElement('span');
        removeBtn.className = 'remove-btn';
        removeBtn.textContent = '×';
        removeBtn.onclick = e => {
            e.stopPropagation();
            selectedFiles.splice(index, 1);
            updateFileInput();
            renderPreviews();
        };
        box.appendChild(removeBtn);

        if (file.type.startsWith('image/')) {
            const img = document.createElement('img');
            img.className = 'file-thumb';
            img.src = URL.createObjectURL(file);
            img.onload = () => URL.revokeObjectURL(img.src);
            box.appendChild(img);
        } else {
            const icon = document.createElement('div');
            icon.className = 'file-icon';
            icon.textContent = file.name.split('.').pop().toUpperCase();
            box.appendChild(icon);
        }

        const badge = document.createElement('div');
        badge.className = 'file-size-badge' + (file.size > 10 * 1024 * 1024 ? ' oversized' : '');
        badge.textContent = formatFileSize(file.size);
        box.appendChild(badge);

        if (file.size > 10 * 1024 * 1024) {
            box.onclick = () => showCompressConfirmation(index);
        }

        preview.appendChild(box);
    });

    const validCount = selectedFiles.filter(f => f.size <= 10 * 1024 * 1024).length;
    qs('#upload-count').textContent = selectedFiles.length
        ? `${validCount} ready${oversizedCount ? `, ${oversizedCount} need compression` : ''}`
        : 'No files selected';
}

// Oversize file dialog
function showCompressConfirmation(index) {
    const file = selectedFiles[index];
    currentCompressFileIndex = index;
    showModal(
        `<p><strong>${file.name}</strong><br>Size: ${formatFileSize(file.size)} (limit 10 MB)</p>
         <p>Remove or compress?</p>`,
        'warning', 'Oversized File',
        `<button class="modal-btn-secondary" onclick="closeModal()">Cancel</button>
         <button class="modal-btn-primary" onclick="proceedToCompression()">Yes, I want to compress</button>`
    );
}

// White-background compression services dialog
function proceedToCompression() {
    closeModal();
    const file = selectedFiles[currentCompressFileIndex];
    showModal(
        `<div class="compression-modal white-bg">
            <h4 class="compression-title">File Compression Services</h4>
            <p class="compression-subtitle">Compress <strong>${file.name}</strong> using:</p>
            <div class="service-cards">
                <div class="service-card">
                    <button onclick="window.open('https://www.youcompress.com/','_blank')">YouCompress</button>
                    <p>Free • No Registration • Multiple Formats</p>
                </div>
                <div class="service-card recommended">
                    <button onclick="window.open('https://www.ilovepdf.com/compress_pdf','_blank')">iLovePDF</button>
                    <p>Free • PDF Specialist • High Quality</p>
                </div>
                <div class="service-card">
                    <button onclick="window.open('https://smallpdf.com/compress-pdf','_blank')">SmallPDF</button>
                    <p>Free • Easy to Use • Quick Processing</p>
                </div>
            </div>
            <p class="compression-instructions">💡 After compressing, download and re-upload the new file here.</p>
        </div>`,
        'info', '', 
        `<button class="modal-btn-secondary" onclick="closeModal()">Close</button>`
    );
}

// Form Guidelines & Help
function showFormHelp() {
    showModal(
        `<ul style="text-align:left">
           <li>ESM Name, Relationship, Rank, Phone & Branch are required.</li>
           <li>Up to 10 files, each ≤ 10 MB.</li>
           <li>Remove file: click ×. Oversized: click to compress.</li>
           <li>Check consent box to enable SUBMIT.</li>
         </ul>`,
        'info', 'Form Help'
    );
}

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    const uploadInput = qs('#upload');
    const form = qs('#feedbackForm');
    const submitBtn = qs('#submitBtn');
    const consentCheckbox = qs('#consentCheckbox');

    // Consent enables submit
    consentCheckbox.onchange = () => {
        submitBtn.disabled = !consentCheckbox.checked;
        submitBtn.classList.toggle('disabled', !consentCheckbox.checked);
    };

    // Phone validation
    qs('#phone').oninput = e => {
        const err = qs('#phone-error');
        if (!e.target.value.trim()) return err.style.display = 'none';
        err.textContent = validPhone(e.target.value) ? '' : 'Please enter a valid 10-digit number';
        err.style.display = err.textContent ? 'block' : 'none';
    };

    // File input
    uploadInput.onchange = e => {
        const newFiles = [...e.target.files].filter(f => !selectedFiles.find(x => x.name === f.name));
        if (selectedFiles.length + newFiles.length > 10) {
            showModal('Maximum 10 files allowed; extras ignored.', 'warning', 'File Limit');
            newFiles.splice(10 - selectedFiles.length);
        }
        selectedFiles = [...selectedFiles, ...newFiles];
        e.target.value = '';
        renderPreviews();
    };

    // Form submit
    form.onsubmit = e => {
        e.preventDefault();
        if (!checkRelationship()) {
            showModal('Please select your relationship.', 'error', 'Required');
            return;
        }
        if (!validPhone(qs('#phone').value)) {
            showModal('Please enter a valid phone number.', 'error', 'Invalid Phone');
            return;
        }
        if (selectedFiles.some(f => f.size > 10 * 1024 * 1024)) {
            showModal('Please compress files over 10 MB first.', 'error', 'Oversized Files');
            return;
        }
        if (!confirmPending) {
            confirmPending = true;
            showModal(
                'If all information is correct and not violating norms, click Confirm.',
                'confirm', 'Confirm Submission',
                `<button class="modal-btn-secondary" onclick="closeModal()">Cancel</button>
                 <button class="modal-btn-primary" onclick="submitForm()">Confirm</button>`
            );
        }
    };

    renderPreviews();
});

// Actual form submission
function submitForm() {
    closeModal();
    const form = qs('#feedbackForm');
    const submitBtn = qs('#submitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting…';

    const formData = new FormData(form);
    selectedFiles.forEach(f => formData.append('upload', f));

    fetch('/submit', { method: 'POST', body: formData })
        .then(res => res.json())
        .then(json => {
            if (json.success) {
                showModal('Form submitted successfully.', 'success', 'Done');
                form.reset();
                selectedFiles = [];
                renderPreviews();
            } else {
                throw new Error(json.error || 'Submission failed');
            }
        })
        .catch(err => {
            showModal('Submission error: ' + err.message, 'error', 'Error');
        })
        .finally(() => {
            submitBtn.disabled = false;
            submitBtn.textContent = 'SUBMIT';
        });
}
