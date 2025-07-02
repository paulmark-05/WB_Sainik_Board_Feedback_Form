// WORKING FILE MANAGEMENT SYSTEM - Sainik Board Form
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

// Setup functions (keeping existing functionality)
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

function validatePhoneNumber(phone) {
    const cleanPhone = phone.replace(/\D/g, '');
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(cleanPhone);
}

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

// Simple modal system
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

// FIXED: Actually working file removal function
function removeFileFromArray(fileIndex) {
    console.log('Removing file at index:', fileIndex, 'Array length:', selectedFiles.length);
    
    if (fileIndex >= 0 && fileIndex < selectedFiles.length) {
        const fileName = selectedFiles[fileIndex].name;
        console.log('Removing file:', fileName);
        
        // Remove from array
        selectedFiles.splice(fileIndex, 1);
        
        console.log('Files after removal:', selectedFiles.length);
        
        // Force update everything
        updateFileInput();
        renderPreviews();
        updateFileCount();
        
        // Show confirmation
        showModal(`File "${fileName}" has been removed from uploads.`, 'info', 'File Removed');
        
        console.log('File removal completed successfully');
    } else {
        console.error('Invalid file index:', fileIndex);
        showModal('Error removing file. Please refresh and try again.', 'error', 'Remove Error');
    }
}

// Simple compression popup
function showCompressionPopup(file) {
    showModal(`
        <div class="compression-popup">
            <h4>🗜️ Compress Your File</h4>
            <div class="file-info">
                <p><strong>File:</strong> ${file.name}</p>
                <p><strong>Size:</strong> ${formatFileSize(file.size)}</p>
                <p><strong>Needs to be:</strong> Under 10MB</p>
            </div>
            
            <div class="compression-services">
                <h5>Recommended Compression Services:</h5>
                <div class="service-links">
                    <button class="service-btn primary" onclick="window.open('https://www.ilovepdf.com/compress_pdf', '_blank')">
                        📄 iLovePDF (Best for PDFs)
                    </button>
                    <button class="service-btn" onclick="window.open('https://compressjpeg.com/', '_blank')">
                        🖼️ CompressJPEG (Images)
                    </button>
                    <button class="service-btn" onclick="window.open('https://smallpdf.com/compress-pdf', '_blank')">
                        📋 SmallPDF (Documents)
                    </button>
                </div>
            </div>
            
            <div class="instructions">
                <h5>Quick Steps:</h5>
                <ol>
                    <li>Click on a compression service above</li>
                    <li>Upload your file to the service</li>
                    <li>Download the compressed file</li>
                    <li>Come back here and upload the compressed file</li>
                </ol>
            </div>
            
            <div class="upload-reminder">
                <p><strong>📤 After compressing, upload the downloaded file here!</strong></p>
            </div>
        </div>
    `, 'info', 'File Compression Required');
}

// Update file input
function updateFileInput() {
    const uploadInput = document.getElementById('upload');
    if (!uploadInput) return;
    
    try {
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
        console.log('File input updated. Files:', selectedFiles.length);
    } catch (error) {
        console.error('Error updating file input:', error);
    }
}

// Help system
function showFormHelp() {
    const helpContent = `
        <div class="help-content">
            <h4>📋 Form Submission Guidelines</h4>
            <ul style="text-align: left; margin: 15px 0;">
                <li><strong>Required Fields:</strong> Rank, ESM Name, Relationship, Phone (10 digits), and Branch</li>
                <li><strong>File Upload:</strong> Maximum 10 files, each under 10MB</li>
                <li><strong>Supported Formats:</strong> Images (JPG, PNG), Documents (PDF, DOC, DOCX)</li>
                <li><strong>Phone Number:</strong> Valid 10-digit Indian mobile number</li>
            </ul>
            
            <h4>📁 File Management</h4>
            <ul style="text-align: left; margin: 15px 0;">
                <li><strong>Remove Files:</strong> Click the "Remove File" button to delete files</li>
                <li><strong>Compress Files:</strong> Click "Compress File" for oversized files</li>
                <li><strong>Easy Process:</strong> Compress online, download, and re-upload here</li>
                <li><strong>File Limit:</strong> All files must be under 10MB for submission</li>
            </ul>
            
            <h4>📞 Support</h4>
            <p style="text-align: left; margin: 10px 0;">
                For technical assistance, contact your ZSB branch office.
            </p>
        </div>
    `;
    
    showModal(helpContent, 'info', 'Form Help & Guidelines');
}

// Event listeners
document.addEventListener('click', function(e) {
    if (e.target.id === 'customModal') {
        closeModal();
    }
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeModal();
    }
});

// MAIN INITIALIZATION
document.addEventListener("DOMContentLoaded", function() {
    console.log('Sainik Board Form - Fixed File Management - Starting...');
    
    const uploadInput = document.getElementById("upload");
    const previewContainer = document.getElementById("file-preview");
    const form = document.getElementById("feedbackForm");
    const submitBtn = document.getElementById("submitBtn");
    const consentCheckbox = document.getElementById("consentCheckbox");

    // Initialize
    submitBtn.disabled = true;
    submitBtn.classList.add('disabled');

    setupPhoneValidation();
    setupRelationshipToggle();

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
        
        if (selectedFiles.length + uniqueFiles.length > 10) {
            const allowedCount = 10 - selectedFiles.length;
            showModal(
                `Maximum 10 files allowed. Only the first ${allowedCount} files will be added.`,
                'warning',
                'File Limit'
            );
            uniqueFiles.splice(allowedCount);
        }
        
        selectedFiles = [...selectedFiles, ...uniqueFiles];
        this.value = "";
        renderPreviews();
        
        console.log('Files added. Total:', selectedFiles.length);
    });

    // COMPLETELY REWRITTEN: File preview with working buttons
    function renderPreviews() {
        console.log('Rendering previews for', selectedFiles.length, 'files');
        
        if (!previewContainer) return;
        
        previewContainer.innerHTML = "";
        
        const oversizedFiles = selectedFiles.filter(f => f.size > 10 * 1024 * 1024);
        
        // Simple warning
        if (oversizedFiles.length > 0) {
            const warningDiv = document.createElement("div");
            warningDiv.className = "oversized-warning";
            warningDiv.innerHTML = `
                <div class="warning-content">
                    <span class="warning-icon">⚠️</span>
                    <span class="warning-text">
                        ${oversizedFiles.length} file(s) exceed 10MB limit. Use compress buttons below.
                    </span>
                </div>
            `;
            previewContainer.appendChild(warningDiv);
        }
        
        selectedFiles.forEach((file, index) => {
            console.log('Creating preview for file', index, ':', file.name);
            
            const fileBox = document.createElement("div");
            fileBox.className = "file-box";
            
            const isOversized = file.size > 10 * 1024 * 1024;
            if (isOversized) {
                fileBox.classList.add('file-oversized');
            }

            // WORKING: Red cross remove button
            const removeBtn = document.createElement("span");
            removeBtn.innerHTML = "×";
            removeBtn.className = "remove-btn";
            removeBtn.title = "Remove this file";
            
            // Use closure to capture correct index
            removeBtn.addEventListener('click', (function(fileIndex) {
                return function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Red X clicked for file index:', fileIndex);
                    removeFileFromArray(fileIndex);
                };
            })(index));
            
            fileBox.appendChild(removeBtn);

            // File preview
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

            // Button container for oversized files
            if (isOversized) {
                const buttonContainer = document.createElement("div");
                buttonContainer.className = "file-buttons";
                
                // Remove button
                const removeFileBtn = document.createElement("button");
                removeFileBtn.className = "file-action-btn remove-btn-action";
                removeFileBtn.innerHTML = "🗑️ Remove";
                removeFileBtn.addEventListener('click', (function(fileIndex) {
                    return function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('Remove button clicked for file index:', fileIndex);
                        removeFileFromArray(fileIndex);
                    };
                })(index));
                
                // Compress button
                const compressBtn = document.createElement("button");
                compressBtn.className = "file-action-btn compress-btn-action";
                compressBtn.innerHTML = "🗜️ Compress";
                compressBtn.addEventListener('click', (function(currentFile) {
                    return function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('Compress button clicked for:', currentFile.name);
                        showCompressionPopup(currentFile);
                    };
                })(file));
                
                buttonContainer.appendChild(removeFileBtn);
                buttonContainer.appendChild(compressBtn);
                fileBox.appendChild(buttonContainer);
            }

            previewContainer.appendChild(fileBox);
        });

        updateFileCount();
        console.log('Preview rendering completed');
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
        if (uploadCountElement) {
            uploadCountElement.textContent = countText;
        }
    }

    // Form submission with strict validation
    form.addEventListener("submit", async function(e) {
        e.preventDefault();
        e.stopPropagation();

        if (isSubmitting) return;

        if (!consentCheckbox || !consentCheckbox.checked) {
            showModal('You must agree to submit your personal information.', 'error', 'Consent Required');
            return;
        }

        const phoneInput = document.getElementById('phone');
        if (!validatePhoneNumber(phoneInput.value)) {
            showModal('Please enter a valid 10-digit mobile number.', 'error', 'Invalid Phone');
            phoneInput.focus();
            return;
        }

        const oversizedFiles = selectedFiles.filter(f => f.size > 10 * 1024 * 1024);
        if (oversizedFiles.length > 0) {
            showModal(
                `Cannot submit with oversized files. Please compress or remove these files:<br><br>${oversizedFiles.map(f => `<strong>${f.name}</strong> (${formatFileSize(f.size)})`).join('<br>')}`,
                'error',
                'Oversized Files Present'
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
                throw new Error(`Server error: ${response.status}`);
            }

            const result = await response.json();

            if (result.success || result.message) {
                showModal(
                    `Your feedback has been successfully submitted!<br><br><strong>ESM Name:</strong> ${form.esmName.value}<br><strong>Branch:</strong> ${form.branch.value}<br><strong>Files:</strong> ${validFiles.length}<br><br>Thank you for your feedback.`,
                    'success',
                    'Submission Successful'
                );
                
                setTimeout(() => {
                    form.reset();
                    selectedFiles = [];
                    renderPreviews();
                    validateConsent();
                }, 2000);
            } else {
                throw new Error(result.error || "Submission failed");
            }

        } catch (error) {
            console.error("Submission error:", error);
            showModal(
                `Submission failed: <strong>${error.message}</strong><br><br>Please try again.`,
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
    
    console.log('Form system initialized with working file management');
});
