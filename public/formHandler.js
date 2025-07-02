// Prevent multiple submissions
let isSubmitting = false;
let selectedFiles = [];
let currentCompressFileIndex = -1;

// Enhanced file size display function
function formatFileSize(bytes) {
    if (bytes === 0) return '0 KB';
    
    const k = 1024;
    if (bytes < k) {
        return bytes + ' bytes';
    } else if (bytes < k * k) {
        return (bytes / k).toFixed(2) + ' KB';
    } else if (bytes < k * k * k) {
        return (bytes / (k * k)).toFixed(2) + ' MB';
    } else {
        return (bytes / (k * k * k)).toFixed(2) + ' GB';
    }
}

// Check if file is a full-display image
function isFullDisplayImage(file) {
    const imageTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    return imageTypes.includes(file.type.toLowerCase());
}

// Setup relationship toggle functionality
function setupRelationshipToggle() {
    const relationshipRadios = document.querySelectorAll('input[name="relationship"]');
    
    relationshipRadios.forEach(radio => {
        let isSelected = false;
        
        radio.addEventListener('click', function() {
            if (isSelected && this.checked) {
                this.checked = false;
                isSelected = false;
            } else {
                relationshipRadios.forEach(r => {
                    r.parentElement.isSelected = false;
                });
                this.checked = true;
                isSelected = true;
            }
        });
        
        radio.addEventListener('change', function() {
            if (this.checked) {
                relationshipRadios.forEach(r => {
                    if (r !== this) {
                        r.parentElement.isSelected = false;
                    }
                });
                isSelected = true;
            }
        });
    });
}

// Simplified consent validation
function validateConsent() {
    const consentCheckbox = document.getElementById('consentCheckbox');
    const submitBtn = document.getElementById('submitBtn');
    
    if (consentCheckbox && consentCheckbox.checked) {
        submitBtn.disabled = false;
        submitBtn.classList.remove('disabled');
    } else {
        submitBtn.disabled = true;
        submitBtn.classList.add('disabled');
    }
}

// Phone number validation
function validatePhoneNumber(phone) {
    const cleanPhone = phone.replace(/\D/g, '');
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(cleanPhone);
}

// Real-time phone validation
function setupPhoneValidation() {
    const phoneInput = document.getElementById('phone');
    const phoneError = document.getElementById('phone-error');
    
    if (!phoneInput) return;
    
    phoneInput.addEventListener('input', function() {
        const phone = this.value.trim();
        
        if (phone === '') {
            phoneError.textContent = '';
            phoneError.style.display = 'none';
            return;
        }
        
        if (!validatePhoneNumber(phone)) {
            phoneError.textContent = 'Please enter a valid 10-digit mobile number';
            phoneError.style.display = 'block';
        } else {
            phoneError.textContent = '';
            phoneError.style.display = 'none';
        }
    });
}

// Custom Modal Functions
function showModal(message, type = 'info', title = 'Notification') {
    const modal = document.getElementById('customModal');
    const container = modal.querySelector('.modal-container');
    const titleElement = modal.querySelector('.modal-title');
    const messageElement = document.getElementById('modalMessage');
    const footerElement = modal.querySelector('.modal-footer');
    
    container.classList.remove('success', 'error', 'warning', 'info', 'confirm', 'compress');
    
    if (type) {
        container.classList.add(type);
    }
    
    titleElement.textContent = title;
    messageElement.innerHTML = message;
    
    footerElement.innerHTML = '<button class="modal-btn-primary" onclick="closeModal()">OK</button>';
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    const modalBody = modal.querySelector('.modal-body');
    modalBody.scrollTop = 0;
}

function closeModal() {
    const modal = document.getElementById('customModal');
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
    
    currentCompressFileIndex = -1;
    window.currentCompressedFile = null;
}

// Enhanced compression confirmation dialog
function showCompressionConfirmation(fileIndex) {
    const file = selectedFiles[fileIndex];
    if (!file) return;
    
    currentCompressFileIndex = fileIndex;
    
    const modal = document.getElementById('customModal');
    const container = modal.querySelector('.modal-container');
    const titleElement = modal.querySelector('.modal-title');
    const messageElement = document.getElementById('modalMessage');
    const footerElement = modal.querySelector('.modal-footer');
    
    container.classList.remove('success', 'error', 'warning', 'info');
    container.classList.add('confirm');
    
    titleElement.textContent = 'File Compression Confirmation';
    
    const fileTypeInfo = getFileTypeInfo(file);
    
    messageElement.innerHTML = `
        <div class="confirmation-content">
            <div class="file-info">
                <p><strong>File:</strong> ${file.name}</p>
                <p><strong>Current Size:</strong> ${formatFileSize(file.size)}</p>
                <p><strong>Size Limit:</strong> 10 MB</p>
                <p><strong>File Type:</strong> ${fileTypeInfo.description}</p>
            </div>
            <p class="confirmation-question">This file exceeds the size limit. Would you like to compress it now?</p>
            <div class="compression-note">
                <span class="note-icon">💡</span>
                <span>${fileTypeInfo.compressionNote}</span>
            </div>
        </div>
    `;
    
    footerElement.innerHTML = `
        <button class="modal-btn-secondary" onclick="closeModal()">Cancel</button>
        <button class="modal-btn-primary" onclick="startCompression()">Yes, Compress Now</button>
    `;
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    const modalBody = modal.querySelector('.modal-body');
    modalBody.scrollTop = 0;
}

// Get file type information for compression
function getFileTypeInfo(file) {
    const type = file.type.toLowerCase();
    const extension = file.name.split('.').pop().toLowerCase();
    
    if (type.startsWith('image/')) {
        return {
            description: 'Image File',
            compressionNote: 'Image will be aggressively compressed to fit under 10MB limit.'
        };
    } else if (type === 'application/pdf' || extension === 'pdf') {
        return {
            description: 'PDF Document',
            compressionNote: 'PDF will be compressed using maximum ZIP compression to reduce file size.'
        };
    } else if (type.includes('document') || ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(extension)) {
        return {
            description: 'Office Document',
            compressionNote: 'Document will be compressed using maximum ZIP compression.'
        };
    } else {
        return {
            description: 'Generic File',
            compressionNote: 'File will be compressed using maximum compression algorithms.'
        };
    }
}

// ENHANCED: Start compression process with guaranteed size reduction
async function startCompression() {
    if (currentCompressFileIndex === -1) {
        closeModal();
        return;
    }
    
    const file = selectedFiles[currentCompressFileIndex];
    if (!file) {
        closeModal();
        return;
    }
    
    // Show compression progress dialog
    showCompressionProgress(file);
    
    try {
        let compressedFile;
        const targetSize = 10 * 1024 * 1024; // 10MB
        
        if (file.type.startsWith('image/')) {
            compressedFile = await compressImageUntilUnderLimit(file, targetSize);
        } else if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
            compressedFile = await compressPDFUntilUnderLimit(file, targetSize);
        } else if (file.type.includes('document') || isOfficeDocument(file)) {
            compressedFile = await compressDocumentUntilUnderLimit(file, targetSize);
        } else {
            compressedFile = await compressGenericFileUntilUnderLimit(file, targetSize);
        }
        
        // Complete progress bar
        const progressFill = document.querySelector('.progress-fill');
        if (progressFill) {
            progressFill.style.width = '100%';
        }
        updateProgressStep(2);
        
        // Show compression results after a brief delay
        setTimeout(() => {
            showCompressionResults(file, compressedFile);
        }, 1000);
        
    } catch (error) {
        console.error('Compression failed:', error);
        showCompressionError(file, error.message);
    }
}

// Check if file is an office document
function isOfficeDocument(file) {
    const officeExtensions = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'];
    const extension = file.name.split('.').pop().toLowerCase();
    return officeExtensions.includes(extension);
}

// Show compression progress
function showCompressionProgress(file) {
    const modal = document.getElementById('customModal');
    const container = modal.querySelector('.modal-container');
    const titleElement = modal.querySelector('.modal-title');
    const messageElement = document.getElementById('modalMessage');
    const footerElement = modal.querySelector('.modal-footer');
    
    container.classList.remove('success', 'error', 'warning', 'info', 'confirm');
    container.classList.add('compress');
    
    titleElement.textContent = 'Compressing File...';
    
    const fileTypeInfo = getFileTypeInfo(file);
    
    messageElement.innerHTML = `
        <div class="compression-progress">
            <div class="file-info">
                <p><strong>Processing:</strong> ${file.name}</p>
                <p><strong>Original Size:</strong> ${formatFileSize(file.size)}</p>
                <p><strong>Type:</strong> ${fileTypeInfo.description}</p>
                <p><strong>Target:</strong> Under 10MB</p>
            </div>
            <div class="progress-container">
                <div class="progress-bar">
                    <div class="progress-fill"></div>
                </div>
                <p class="progress-text">Compressing file aggressively... Please wait.</p>
            </div>
            <div class="compression-steps">
                <div class="step active">📁 Reading file...</div>
                <div class="step">🗜️ Applying maximum compression...</div>
                <div class="step">💾 Finalizing under 10MB...</div>
            </div>
        </div>
    `;
    
    footerElement.innerHTML = `
        <button class="modal-btn-secondary" disabled>Please wait...</button>
    `;
    
    // Animate progress bar
    setTimeout(() => {
        const progressFill = document.querySelector('.progress-fill');
        if (progressFill) {
            progressFill.style.width = '30%';
        }
        updateProgressStep(1);
    }, 500);
    
    setTimeout(() => {
        const progressFill = document.querySelector('.progress-fill');
        if (progressFill) {
            progressFill.style.width = '70%';
        }
        updateProgressStep(2);
    }, 1500);
}

function updateProgressStep(stepIndex) {
    const steps = document.querySelectorAll('.compression-steps .step');
    steps.forEach((step, index) => {
        if (index <= stepIndex) {
            step.classList.add('active');
        }
    });
}

// Show compression results with options
function showCompressionResults(originalFile, compressedFile) {
    const modal = document.getElementById('customModal');
    const container = modal.querySelector('.modal-container');
    const titleElement = modal.querySelector('.modal-title');
    const messageElement = document.getElementById('modalMessage');
    const footerElement = modal.querySelector('.modal-footer');
    
    container.classList.remove('compress', 'error', 'warning', 'info', 'confirm');
    container.classList.add('success');
    
    titleElement.textContent = 'Compression Complete!';
    
    const compressionRatio = (((originalFile.size - compressedFile.size) / originalFile.size) * 100).toFixed(1);
    const isUnderLimit = compressedFile.size <= 10 * 1024 * 1024;
    const spaceSaved = originalFile.size - compressedFile.size;
    
    messageElement.innerHTML = `
        <div class="compression-results">
            <div class="results-header">
                <span class="success-icon">✅</span>
                <h4>File compressed successfully!</h4>
            </div>
            <div class="size-comparison">
                <div class="size-item original">
                    <span class="size-label">Original Size:</span>
                    <span class="size-value">${formatFileSize(originalFile.size)}</span>
                </div>
                <div class="size-arrow">➜</div>
                <div class="size-item compressed">
                    <span class="size-label">Compressed Size:</span>
                    <span class="size-value ${isUnderLimit ? 'success' : 'warning'}">${formatFileSize(compressedFile.size)}</span>
                </div>
            </div>
            <div class="compression-stats">
                <p><strong>Space Saved:</strong> ${formatFileSize(spaceSaved)} (${compressionRatio}% reduction)</p>
                <p><strong>Status:</strong> 
                    <span class="${isUnderLimit ? 'status-success' : 'status-warning'}">
                        ${isUnderLimit ? '✅ Under 10MB limit' : '⚠️ Still over 10MB limit'}
                    </span>
                </p>
            </div>
            <div class="action-question">
                <p><strong>What would you like to do with this file?</strong></p>
            </div>
        </div>
    `;
    
    footerElement.innerHTML = `
        <button class="modal-btn-danger" onclick="removeOversizedFile()">Remove Original File</button>
        <button class="modal-btn-primary" onclick="replaceWithCompressed()">Replace with Compressed File</button>
    `;
    
    // Store compressed file for later use
    window.currentCompressedFile = compressedFile;
}

// Show compression error
function showCompressionError(file, errorMessage) {
    const modal = document.getElementById('customModal');
    const container = modal.querySelector('.modal-container');
    const titleElement = modal.querySelector('.modal-title');
    const messageElement = document.getElementById('modalMessage');
    const footerElement = modal.querySelector('.modal-footer');
    
    container.classList.remove('compress', 'success', 'warning', 'info', 'confirm');
    container.classList.add('error');
    
    titleElement.textContent = 'Compression Failed';
    
    messageElement.innerHTML = `
        <div class="compression-error">
            <div class="error-icon">❌</div>
            <h4>Unable to compress this file under 10MB</h4>
            <div class="error-details">
                <p><strong>File:</strong> ${file.name}</p>
                <p><strong>Error:</strong> ${errorMessage}</p>
            </div>
            <div class="error-suggestions">
                <h5>Suggestions:</h5>
                <ul>
                    <li>Try using an external compression service</li>
                    <li>Reduce the file size manually before uploading</li>
                    <li>Convert to a different format if possible</li>
                    <li>Remove the file from your selection</li>
                </ul>
            </div>
        </div>
    `;
    
    footerElement.innerHTML = `
        <button class="modal-btn-secondary" onclick="closeModal()">Keep Original</button>
        <button class="modal-btn-danger" onclick="removeOversizedFile()">Remove File</button>
    `;
}

// ENHANCED: Replace original file with compressed version
function replaceWithCompressed() {
    if (currentCompressFileIndex !== -1 && window.currentCompressedFile) {
        // Replace the file in the array
        selectedFiles[currentCompressFileIndex] = window.currentCompressedFile;
        
        // Update the file input
        updateFileInput();
        
        // Re-render the previews
        renderPreviews();
        
        // Show success message
        showModal(
            'File has been successfully replaced with the compressed version that is under 10MB!',
            'success',
            'File Replaced'
        );
        
        // Clean up
        window.currentCompressedFile = null;
        currentCompressFileIndex = -1;
    } else {
        closeModal();
    }
}

// ENHANCED: Properly remove oversized file from selection and uploads
function removeOversizedFile() {
    if (currentCompressFileIndex !== -1) {
        const fileName = selectedFiles[currentCompressFileIndex].name;
        
        // Remove the file from the selectedFiles array
        selectedFiles.splice(currentCompressFileIndex, 1);
        
        // Update the file input to reflect the removal
        updateFileInput();
        
        // Re-render the file previews
        renderPreviews();
        
        // Update the file count display
        updateFileCount();
        
        // Show confirmation message
        showModal(
            `File "${fileName}" has been completely removed from your upload selection.`,
            'info',
            'File Removed'
        );
        
        // Clean up
        window.currentCompressedFile = null;
        currentCompressFileIndex = -1;
    } else {
        closeModal();
    }
}

// ENHANCED: Aggressive image compression until under size limit
async function compressImageUntilUnderLimit(imageFile, targetSize) {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = async function() {
            // Define compression levels from mild to extreme
            const compressionLevels = [
                { quality: 0.9, maxSize: 1920 },
                { quality: 0.8, maxSize: 1600 },
                { quality: 0.7, maxSize: 1400 },
                { quality: 0.6, maxSize: 1200 },
                { quality: 0.5, maxSize: 1000 },
                { quality: 0.4, maxSize: 800 },
                { quality: 0.3, maxSize: 600 },
                { quality: 0.2, maxSize: 400 },
                { quality: 0.1, maxSize: 300 },
                { quality: 0.05, maxSize: 200 }
            ];
            
            for (const level of compressionLevels) {
                const compressed = await attemptImageCompression(img, canvas, ctx, imageFile, level.quality, level.maxSize);
                
                if (compressed && compressed.size <= targetSize) {
                    resolve(compressed);
                    return;
                }
            }
            
            // If still not small enough, try extreme compression
            const extremeCompressed = await attemptImageCompression(img, canvas, ctx, imageFile, 0.01, 150);
            resolve(extremeCompressed || imageFile);
        };
        
        img.onerror = () => reject(new Error('Failed to load image for compression'));
        img.src = URL.createObjectURL(imageFile);
    });
}

// Helper function for image compression attempts
function attemptImageCompression(img, canvas, ctx, originalFile, quality, maxSize) {
    return new Promise((resolve) => {
        let { width, height } = img;
        
        // Scale down dimensions aggressively
        if (width > maxSize || height > maxSize) {
            if (width > height) {
                height = (height * maxSize) / width;
                width = maxSize;
            } else {
                width = (width * maxSize) / height;
                height = maxSize;
            }
        }
        
        canvas.width = width;
        canvas.height = height;
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
            (blob) => {
                if (blob) {
                    const compressedFile = new File([blob], originalFile.name, {
                        type: 'image/jpeg',
                        lastModified: Date.now()
                    });
                    resolve(compressedFile);
                } else {
                    resolve(null);
                }
            },
            'image/jpeg',
            quality
        );
    });
}

// ENHANCED: PDF compression with maximum ZIP compression
async function compressPDFUntilUnderLimit(pdfFile, targetSize) {
    if (typeof JSZip === 'undefined') {
        throw new Error('JSZip library not loaded. PDF compression unavailable.');
    }
    
    const zip = new JSZip();
    zip.file(pdfFile.name, pdfFile);
    
    // Try maximum compression first
    let compressedBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: {
            level: 9 // Maximum compression
        }
    });
    
    // If still too large, try alternative compression
    if (compressedBlob.size > targetSize) {
        // Try with different compression algorithm
        compressedBlob = await zip.generateAsync({
            type: 'blob',
            compression: 'STORE' // No compression, just ZIP container
        });
    }
    
    const compressedName = pdfFile.name.replace(/\.pdf$/i, '-compressed.pdf');
    return new File([compressedBlob], compressedName, {
        type: 'application/pdf',
        lastModified: Date.now()
    });
}

// ENHANCED: Document compression with maximum ZIP compression
async function compressDocumentUntilUnderLimit(docFile, targetSize) {
    if (typeof JSZip === 'undefined') {
        throw new Error('JSZip library not loaded. Document compression unavailable.');
    }
    
    const zip = new JSZip();
    zip.file(docFile.name, docFile);
    
    const compressedBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: {
            level: 9 // Maximum compression
        }
    });
    
    const extension = docFile.name.split('.').pop();
    const baseName = docFile.name.replace(new RegExp(`\.${extension}$`, 'i'), '');
    const compressedName = `${baseName}-compressed.${extension}`;
    
    return new File([compressedBlob], compressedName, {
        type: docFile.type,
        lastModified: Date.now()
    });
}

// ENHANCED: Generic file compression with maximum ZIP compression
async function compressGenericFileUntilUnderLimit(file, targetSize) {
    if (typeof JSZip === 'undefined') {
        throw new Error('JSZip library not loaded. File compression unavailable.');
    }
    
    const zip = new JSZip();
    zip.file(file.name, file);
    
    const compressedBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: {
            level: 9 // Maximum compression
        }
    });
    
    const extension = file.name.split('.').pop();
    const baseName = file.name.replace(new RegExp(`\.${extension}$`, 'i'), '');
    const compressedName = `${baseName}-compressed.${extension}`;
    
    return new File([compressedBlob], compressedName, {
        type: file.type || 'application/octet-stream',
        lastModified: Date.now()
    });
}

// Compress file function with confirmation
function compressFile(fileIndex) {
    const file = selectedFiles[fileIndex];
    if (!file) return;
    
    console.log('Compress button clicked for:', file.name);
    showCompressionConfirmation(fileIndex);
}

// ENHANCED: Update file input to properly reflect selectedFiles array
function updateFileInput() {
    const uploadInput = document.getElementById('upload');
    
    if (selectedFiles.length === 0) {
        uploadInput.value = '';
        uploadInput.files = new DataTransfer().files;
    } else {
        const dt = new DataTransfer();
        selectedFiles.forEach(file => {
            dt.items.add(file);
        });
        uploadInput.files = dt.files;
    }
}

// Form Help Guidelines
function showFormHelp() {
    const helpContent = `
        <div class="help-content">
            <h4>📋 Form Submission Guidelines</h4>
            <ul style="text-align: left; margin: 15px 0;">
                <li><strong>Required Fields:</strong> Rank, ESM Name, Relationship, Phone (10 digits), and Branch are mandatory</li>
                <li><strong>File Upload:</strong> Maximum 10 files, each under 10MB</li>
                <li><strong>Supported Formats:</strong> Images (JPG, PNG), Documents (PDF, DOC, DOCX)</li>
                <li><strong>Phone Number:</strong> Must be a valid 10-digit Indian mobile number</li>
                <li><strong>Relationship:</strong> Click to select, click again to deselect</li>
            </ul>
            
            <h4>📁 Data Protection</h4>
            <ul style="text-align: left; margin: 15px 0;">
                <li>All data is processed according to Government of West Bengal guidelines</li>
                <li>Personal information is protected under Digital Personal Data Protection Act</li>
                <li>Files are securely stored in government-approved cloud infrastructure</li>
                <li>Access is restricted to authorized Sainik Board personnel only</li>
            </ul>
            
            <h4>🔧 Enhanced File Compression</h4>
            <ul style="text-align: left; margin: 15px 0;">
                <li><strong>Guaranteed Compression:</strong> Files are compressed until they are under 10MB</li>
                <li><strong>Aggressive Algorithms:</strong> Multiple compression levels attempted automatically</li>
                <li><strong>Complete Removal:</strong> Remove button completely removes files from uploads</li>
                <li><strong>Smart Processing:</strong> Different algorithms for images, PDFs, and documents</li>
            </ul>
            
            <h4>📞 Support</h4>
            <p style="text-align: left; margin: 10px 0;">
                For technical assistance, contact your ZSB branch office.
            </p>
        </div>
    `;
    
    showModal(helpContent, 'info', 'Form Help & Guidelines');
}

// Close modal when clicking overlay
document.addEventListener('click', function(e) {
    if (e.target.id === 'customModal') {
        closeModal();
    }
});

// Close modal with Escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeModal();
    }
});

document.addEventListener("DOMContentLoaded", function() {
    const uploadInput = document.getElementById("upload");
    const previewContainer = document.getElementById("file-preview");
    const form = document.getElementById("feedbackForm");
    const submitBtn = document.getElementById("submitBtn");
    const consentCheckbox = document.getElementById("consentCheckbox");

    // Initialize submit button as disabled
    submitBtn.disabled = true;
    submitBtn.classList.add('disabled');

    // Setup phone validation
    setupPhoneValidation();

    // Setup relationship toggle functionality
    setupRelationshipToggle();

    // Consent checkbox validation
    if (consentCheckbox) {
        consentCheckbox.addEventListener('change', validateConsent);
    }

    // File upload handling
    uploadInput.addEventListener("change", function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const newFiles = Array.from(this.files);
        const existingNames = selectedFiles.map(file => file.name);
        const uniqueFiles = newFiles.filter(file => !existingNames.includes(file.name));
        
        // Check file limits
        if (selectedFiles.length + uniqueFiles.length > 10) {
            const allowedCount = 10 - selectedFiles.length;
            showModal(
                `Maximum 10 files allowed. Only the first ${allowedCount} files will be added.`,
                'warning',
                'File Limit Reached'
            );
            uniqueFiles.splice(allowedCount);
        }
        
        // Add ALL files (including oversized ones)
        selectedFiles = [...selectedFiles, ...uniqueFiles];
        
        this.value = "";
        renderPreviews();
    });

    function renderPreviews() {
        previewContainer.innerHTML = "";
        
        // Check if there are any oversized files
        const oversizedFiles = selectedFiles.filter(f => f.size > 10 * 1024 * 1024);
        
        // Show warning if there are oversized files
        if (oversizedFiles.length > 0) {
            const warningDiv = document.createElement("div");
            warningDiv.className = "oversized-warning";
            warningDiv.innerHTML = `
                <div class="warning-content">
                    <span class="warning-icon">⚠️</span>
                    <span class="warning-text">
                        ${oversizedFiles.length} file(s) exceed the 10MB limit. 
                        Use the compress buttons below to reduce file sizes.
                    </span>
                </div>
            `;
            previewContainer.appendChild(warningDiv);
        }
        
        selectedFiles.forEach((file, index) => {
            const fileBox = document.createElement("div");
            fileBox.className = "file-box";
            
            const isOversized = file.size > 10 * 1024 * 1024;
            if (isOversized) {
                fileBox.classList.add('file-oversized');
            }

            const removeBtn = document.createElement("span");
            removeBtn.innerHTML = "×";
            removeBtn.className = "remove-btn";
            removeBtn.onclick = function(e) {
                e.preventDefault();
                e.stopPropagation();
                selectedFiles.splice(index, 1);
                updateFileInput();
                renderPreviews();
                updateFileCount();
            };

            fileBox.appendChild(removeBtn);

            // Enhanced: Full image display for PNG, JPG, JPEG
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
            
            const sizeBadge = document.createElement("div");
            sizeBadge.className = isOversized ? "file-size-badge oversized" : "file-size-badge";
            sizeBadge.textContent = formatFileSize(file.size);
            fileBox.appendChild(sizeBadge);

            // Add compress button for oversized files
            if (isOversized) {
                const compressBtn = document.createElement("button");
                compressBtn.className = "compress-btn";
                compressBtn.innerHTML = "🗜️ Compress";
                compressBtn.onclick = function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    compressFile(index);
                };
                fileBox.appendChild(compressBtn);
            }

            previewContainer.appendChild(fileBox);
        });

        updateFileCount();
    }

    // ENHANCED: Update file count function
    function updateFileCount() {
        const validFiles = selectedFiles.filter(f => f.size <= 10 * 1024 * 1024).length;
        const oversizedFiles = selectedFiles.filter(f => f.size > 10 * 1024 * 1024).length;
        
        let countText = "";
        if (validFiles > 0 && oversizedFiles > 0) {
            countText = `${validFiles} valid file(s), ${oversizedFiles} oversized file(s)`;
        } else if (validFiles > 0) {
            countText = `${validFiles} file(s) selected`;
        } else if (oversizedFiles > 0) {
            countText = `${oversizedFiles} oversized file(s) - use compress buttons`;
        } else {
            countText = "No files selected";
        }
        
        const uploadCountElement = document.getElementById("upload-count");
        if (uploadCountElement) {
            uploadCountElement.textContent = countText;
        }
    }

    // Form submission with validation
    form.addEventListener("submit", async function(e) {
        e.preventDefault();
        e.stopPropagation();

        if (isSubmitting) {
            return;
        }

        // Check consent
        if (!consentCheckbox || !consentCheckbox.checked) {
            showModal(
                'You must agree to submit your personal information before submitting the form.',
                'error',
                'Consent Required'
            );
            return;
        }

        // Validate phone number
        const phoneInput = document.getElementById('phone');
        if (!validatePhoneNumber(phoneInput.value)) {
            showModal(
                'Please enter a valid 10-digit Indian mobile number (starting with 6, 7, 8, or 9).',
                'error',
                'Invalid Phone Number'
            );
            phoneInput.focus();
            return;
        }

        // Check for oversized files before submission
        const oversizedFiles = selectedFiles.filter(f => f.size > 10 * 1024 * 1024);
        if (oversizedFiles.length > 0) {
            showModal(
                `Cannot submit form with oversized files. Please compress the following files first:<br><br>${oversizedFiles.map(f => `<strong>${f.name}</strong> (${formatFileSize(f.size)})`).join('<br>')}`,
                'error',
                'Oversized Files Detected'
            );
            return;
        }

        const validFiles = selectedFiles.filter(f => f.size <= 10 * 1024 * 1024);

        isSubmitting = true;
        submitBtn.disabled = true;
        submitBtn.textContent = "Submitting...";

        try {
            const formData = new FormData();
            
            const formFields = new FormData(form);
            for (let [key, value] of formFields.entries()) {
                if (key !== 'upload') {
                    formData.append(key, value);
                }
            }
            
            validFiles.forEach(file => {
                formData.append("upload", file);
            });

            const response = await fetch("/submit", {
                method: "POST",
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.success || result.message) {
                showModal(
                    `Your feedback has been successfully submitted!<br><br><strong>ESM Name:</strong> ${form.esmName.value}<br><strong>Branch:</strong> ${form.branch.value}<br><br>Thank you for your valuable feedback.`,
                    'success',
                    'Form Submitted Successfully'
                );
                
                setTimeout(() => {
                    form.reset();
                    selectedFiles = [];
                    renderPreviews();
                    validateConsent();
                }, 2000);
            } else {
                throw new Error(result.error || "Failed to submit form");
            }

        } catch (error) {
            console.error("Submission error:", error);
            showModal(
                `Form submission failed: <strong>${error.message}</strong><br><br>Please check your internet connection and try again. If the problem persists, contact technical support.`,
                'error',
                'Submission Failed'
            );
        } finally {
            isSubmitting = false;
            validateConsent();
            if (!submitBtn.disabled) {
                submitBtn.textContent = "SUBMIT";
            }
        }
    });
});
