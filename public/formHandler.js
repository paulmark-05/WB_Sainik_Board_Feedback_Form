let selectedFiles = [];
let isSubmitting = false;

// Show modal
function showModal(message, type = 'info', title = 'Notification') {
    const modal = document.getElementById('customModal');
    const container = modal.querySelector('.modal-container');
    const titleElement = modal.querySelector('.modal-title');
    const messageElement = document.getElementById('modalMessage');
    const footerElement = modal.querySelector('.modal-footer');
    container.className = 'modal-container ' + type;
    titleElement.textContent = title;
    messageElement.innerHTML = message;
    footerElement.innerHTML = '<button class="modal-btn-primary" onclick="closeModal()">OK</button>';
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}
function closeModal() {
    const modal = document.getElementById('customModal');
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

// Remove file from uploads
function removeFile(fileIndex) {
    if (fileIndex >= 0 && fileIndex < selectedFiles.length) {
        selectedFiles.splice(fileIndex, 1);
        updateFileInput();
        renderPreviews();
        updateFileCount();
        closeModal();
    }
}

// Show compress confirmation dialog (like your screenshot)
function showCompressConfirmation(fileIndex) {
    const file = selectedFiles[fileIndex];
    if (!file) return;
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    const html = `
        <div style="padding:16px 0;">
            <div style="background:#fff;border-radius:8px;padding:16px 0 10px 0;margin-bottom:18px;">
                <div style="font-weight:600;font-size:15px;margin-bottom:6px;">
                    <span style="color:#222;">File:</span> ${file.name}
                </div>
                <div style="font-size:14px;color:#444;">
                    <b>Current Size:</b> ${sizeMB} MB<br>
                    <b>Size Limit:</b> 10 MB
                </div>
            </div>
            <div style="font-weight:500;font-size:16px;text-align:center;margin:10px 0 18px 0;">
                What would you like to do with this oversized file?
            </div>
        </div>
    `;
    showModal(html, 'warning', 'Compress File Confirmation');
    setTimeout(() => {
        const footer = document.querySelector('.modal-footer');
        footer.innerHTML = `
            <button class="modal-btn-secondary" onclick="closeModal()">No, close this message</button>
            <button class="modal-btn-primary" onclick="showCompressionServices(${fileIndex})">Yes, I want to compress</button>
        `;
    }, 10);
}

// Show online compression services
function showCompressionServices(fileIndex) {
    const file = selectedFiles[fileIndex];
    if (!file) return;
    showModal(`
        <div style="padding:10px 0 0 0;">
            <div style="font-weight:600;font-size:15px;margin-bottom:8px;">Choose a compression service</div>
            <div style="margin-bottom:16px;">
                <button class="modal-btn-primary" style="margin:3px 0;" onclick="window.open('https://www.ilovepdf.com/compress_pdf','_blank')">iLovePDF (PDFs, <span style='color:green;font-size:12px;'>Recommended</span>)</button><br>
                <button class="modal-btn-primary" style="margin:3px 0;" onclick="window.open('https://compressjpeg.com/','_blank')">CompressJPEG (Images)</button><br>
                <button class="modal-btn-primary" style="margin:3px 0;" onclick="window.open('https://smallpdf.com/compress-pdf','_blank')">SmallPDF (PDFs/Docs)</button>
            </div>
            <div style="color:#555;font-size:14px;">
                After compressing, download the file and upload the new version here.
            </div>
        </div>
    `, 'info', 'Online Compression');
    setTimeout(() => {
        const footer = document.querySelector('.modal-footer');
        footer.innerHTML = `<button class="modal-btn-secondary" onclick="closeModal()">Close</button>`;
    }, 10);
}

// File input update
function updateFileInput() {
    const uploadInput = document.getElementById('upload');
    if (!uploadInput) return;
    const dt = new DataTransfer();
    selectedFiles.forEach(file => dt.items.add(file));
    uploadInput.files = dt.files;
}

// File preview rendering
function renderPreviews() {
    const previewContainer = document.getElementById("file-preview");
    if (!previewContainer) return;
    previewContainer.innerHTML = "";
    selectedFiles.forEach((file, index) => {
        const fileBox = document.createElement("div");
        fileBox.className = "file-box";
        const isOversized = file.size > 10 * 1024 * 1024;
        if (isOversized) fileBox.classList.add('file-oversized');
        // Remove button
        const removeBtn = document.createElement("span");
        removeBtn.innerHTML = "×";
        removeBtn.className = "remove-btn";
        removeBtn.title = "Remove this file";
        removeBtn.onclick = function(e) {
            e.preventDefault(); e.stopPropagation();
            removeFile(index);
        };
        fileBox.appendChild(removeBtn);
        // Preview
        if (file.type.startsWith("image/")) {
            const img = document.createElement("img");
            img.src = URL.createObjectURL(file);
            img.className = "file-thumb";
            img.onload = () => URL.revokeObjectURL(img.src);
            fileBox.appendChild(img);
        } else {
            const icon = document.createElement("div");
            icon.className = "file-icon";
            icon.textContent = file.name.split(".").pop().toUpperCase();
            fileBox.appendChild(icon);
            const fileName = document.createElement("div");
            fileName.className = "file-name";
            fileName.textContent = file.name;
            fileBox.appendChild(fileName);
        }
        // Size badge
        const sizeBadge = document.createElement("div");
        sizeBadge.className = isOversized ? "file-size-badge oversized" : "file-size-badge";
        sizeBadge.textContent = formatFileSize(file.size);
        fileBox.appendChild(sizeBadge);
        // Oversized: click anywhere to get compress/remove options
        if (isOversized) {
            fileBox.style.cursor = "pointer";
            fileBox.onclick = function(e) {
                e.preventDefault();
                showCompressConfirmation(index);
            };
        }
        previewContainer.appendChild(fileBox);
    });
    updateFileCount();
}

// File count
function updateFileCount() {
    const validFiles = selectedFiles.filter(f => f.size <= 10 * 1024 * 1024).length;
    const oversizedFiles = selectedFiles.filter(f => f.size > 10 * 1024 * 1024).length;
    let countText = "";
    if (validFiles > 0 && oversizedFiles > 0) {
        countText = `${validFiles} ready, ${oversizedFiles} need compression`;
    } else if (validFiles > 0) {
        countText = `${validFiles} file(s) ready`;
    } else if (oversizedFiles > 0) {
        countText = `${oversizedFiles} file(s) need compression`;
    } else {
        countText = "No files selected";
    }
    const uploadCountElement = document.getElementById("upload-count");
    if (uploadCountElement) uploadCountElement.textContent = countText;
}

// File upload handling
document.addEventListener("DOMContentLoaded", function() {
    const uploadInput = document.getElementById("upload");
    if (!uploadInput) return;
    uploadInput.addEventListener("change", function(e) {
        e.preventDefault(); e.stopPropagation();
        const newFiles = Array.from(this.files);
        const existingNames = selectedFiles.map(file => file.name);
        const uniqueFiles = newFiles.filter(file => !existingNames.includes(file.name));
        if (selectedFiles.length + uniqueFiles.length > 10) {
            const allowedCount = 10 - selectedFiles.length;
            showModal(`Maximum 10 files allowed. Only the first ${allowedCount} files will be added.`, 'warning', 'File Limit');
            uniqueFiles.splice(allowedCount);
        }
        selectedFiles = [...selectedFiles, ...uniqueFiles];
        this.value = "";
        renderPreviews();
    });
    renderPreviews();
});

// Block form submission if oversized files remain
document.addEventListener("DOMContentLoaded", function() {
    const form = document.getElementById("feedbackForm");
    if (!form) return;
    form.addEventListener("submit", function(e) {
        const oversizedFiles = selectedFiles.filter(f => f.size > 10 * 1024 * 1024);
        if (oversizedFiles.length > 0) {
            e.preventDefault();
            showModal(
                `Cannot submit with oversized files. Please compress or remove these files:<br><br>${oversizedFiles.map(f => `<strong>${f.name}</strong> (${formatFileSize(f.size)})`).join('<br>')}`,
                'error',
                'Oversized Files Present'
            );
        }
    });
});

// Help/guidelines working
function showFormHelp() {
    showModal(`
        <div>
            <h4>Form Submission Guidelines</h4>
            <ul style="text-align:left;">
                <li>Required fields: Rank, ESM Name, Relationship, Phone (10 digits), Branch</li>
                <li>File upload: Max 10 files, each under 10MB</li>
                <li>Supported: Images (JPG, PNG), PDFs, DOC/DOCX</li>
                <li>Remove files: Click the red cross or oversized file to remove</li>
                <li>Compress files: Click oversized file, then "Compress"</li>
            </ul>
        </div>
    `, 'info', 'Form Help & Guidelines');
}
