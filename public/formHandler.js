// Prevent multiple submissions
let selectedFiles = [];
let isSubmitting = false;

// File size formatting
function formatFileSize(bytes) {
    if (bytes === 0) return '0 KB';
    const k = 1024;
    if (bytes < k) return bytes + ' bytes';
    if (bytes < k * k) return (bytes / k).toFixed(2) + ' KB';
    if (bytes < k * k * k) return (bytes / (k * k)).toFixed(2) + ' MB';
    return (bytes / (k * k * k)).toFixed(2) + ' GB';
}

// File type detection
function isFullDisplayImage(file) {
    const imageTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    return imageTypes.includes(file.type.toLowerCase());
}

// Modal system
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
        showModal('File removed.', 'info', 'File Removed');
    }
}

// Show compress/remove dialog for oversized file
function showOversizeOptions(fileIndex) {
    const file = selectedFiles[fileIndex];
    if (!file) return;
    showModal(`
        <div>
            <h4>Oversized File</h4>
            <p><strong>${file.name}</strong> (${formatFileSize(file.size)}) exceeds the 10MB limit.</p>
            <div style="margin: 20px 0;">
                <button class="modal-btn-danger" onclick="removeFile(${fileIndex}); closeModal();">Remove File</button>
                <button class="modal-btn-primary" onclick="showCompressionOptions(${fileIndex});">Compress File</button>
            </div>
        </div>
    `, 'warning', 'Oversized File');
    // Remove default footer
    setTimeout(() => {
        document.querySelector('.modal-footer').innerHTML = '';
    }, 10);
}

// Show compression service choices
function showCompressionOptions(fileIndex) {
    const file = selectedFiles[fileIndex];
    if (!file) return;
    showModal(`
        <div>
            <h4>Compress Your File Online</h4>
            <p>Choose a compression service, upload your file, download the compressed version, and re-upload here.</p>
            <div style="margin: 18px 0;">
                <button class="modal-btn-primary" onclick="window.open('https://www.ilovepdf.com/compress_pdf','_blank');">iLovePDF (PDFs)</button>
                <button class="modal-btn-primary" onclick="window.open('https://compressjpeg.com/','_blank');">CompressJPEG (Images)</button>
                <button class="modal-btn-primary" onclick="window.open('https://smallpdf.com/compress-pdf','_blank');">SmallPDF (PDFs/Docs)</button>
            </div>
            <div style="color:#888;font-size:13px;">After compressing, upload the new file here.</div>
        </div>
    `, 'info', 'Online Compression');
    setTimeout(() => {
        document.querySelector('.modal-footer').innerHTML = `<button class="modal-btn-secondary" onclick="closeModal()">Close</button>`;
    }, 10);
}

// Update file input to match selectedFiles array
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
        if (isFullDisplayImage(file)) {
            const img = document.createElement("img");
            img.src = URL.createObjectURL(file);
            img.className = "file-thumb full-image";
            img.onload = () => URL.revokeObjectURL(img.src);
            fileBox.appendChild(img);
        } else if (file.type.startsWith("image/")) {
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
        // Oversized: click anywhere to get options
        if (isOversized) {
            fileBox.style.cursor = "pointer";
            fileBox.onclick = function() {
                showOversizeOptions(index);
            };
        }
        previewContainer.appendChild(fileBox);
    });
    updateFileCount();
}

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
    const submitBtn = document.getElementById("submitBtn");
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
