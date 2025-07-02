// Professional File Management System - West Bengal Sainik Board
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

// Relationship toggle functionality
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

// Form validation
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

// FIXED: Working file removal function
function removeFile(fileIndex) {
    console.log('Removing file at index:', fileIndex, 'from', selectedFiles.length, 'files');
    
    if (fileIndex >= 0 && fileIndex < selectedFiles.length) {
        const fileName = selectedFiles[fileIndex].name;
        
        // Remove the file from the array
        selectedFiles.splice(fileIndex, 1);
        
        console.log('File removed:', fileName, 'Remaining files:', selectedFiles.length);
        
        // Update the file input
        updateFileInput();
        
        // Re-render the file preview
        renderPreviews();
        
        // Update the file count
        updateFileCount();
        
        // Show confirmation
        showModal(`File "${fileName}" has been removed.`, 'info', 'File Removed');
    } else {
        console.error('Invalid file index:', fileIndex, 'Total files:', selectedFiles.length);
        showModal('Error removing file. Please try again.', 'error', 'Remove Error');
    }
}

// External compression service options
function showCompressionOptions(fileIndex) {
    const file = selectedFiles[fileIndex];
    if (!file) {
        showModal('File not found.', 'error', 'Error');
        return;
    }
    
    const fileType = file.type.includes('pdf') ? 'PDF' : 
                    file.type.startsWith('image/') ? 'Image' : 'Document';
    
    showModal(`
        <div class="compression-options">
            <h4>File Compression Required</h4>
            <div class="file-details">
                <p><strong>File:</strong> ${file.name}</p>
                <p><strong>Size:</strong> ${formatFileSize(file.size)}</p>
                <p><strong>Limit:</strong> 10 MB</p>
                <p><strong>Type:</strong> ${fileType}</p>
            </div>
            
            <p>Please use one of these recommended compression services:</p>
            
            <div class="service-options">
                <div class="service-card recommended" onclick="openCompressionService('ilovepdf')">
                    <div class="service-info">
                        <strong>iLovePDF</strong> <span class="recommended-badge">Recommended</span>
                        <div class="service-description">Free PDF compression with excellent quality</div>
                    </div>
                </div>
                
                <div class="service-card" onclick="openCompressionService('smallpdf')">
                    <div class="service-info">
                        <strong>SmallPDF</strong>
                        <div class="service-description">Easy-to-use compression tool</div>
                    </div>
                </div>
                
                <div class="service-card" onclick="openCompressionService('compressjpeg')">
                    <div class="service-info">
                        <strong>CompressJPEG</strong>
                        <div class="service-description">Specialized for image compression</div>
                    </div>
                </div>
            </div>
            
            <div class="compression-instructions">
                <h5>Instructions:</h5>
                <ol>
                    <li>Click on a compression service above</li>
                    <li>Upload your file to compress it</li>
                    <li>Download the compressed file</li>
                    <li>Return here and re-upload the compressed version</li>
                </ol>
            </div>
        </div>
    `, 'info', 'Compression Services');
    
    // Add remove option in footer
    setTimeout(() => {
        const footerElement = document.querySelector('.modal-footer');
        footerElement.innerHTML = `
            <button class="modal-btn-danger" onclick="removeFile(${fileIndex}); closeModal();">Remove This File</button>
            <button class="modal-btn-secondary" onclick="closeModal()">Keep Original</button>
        `;
    }, 100);
}

// Open compression services
function openCompressionService(service) {
    let url;
    switch(service) {
        case 'ilovepdf':
            url = 'https://www.ilovepdf.com/compress_pdf';
            break;
        case 'smallpdf':
            url = 'https://smallpdf.com/compress-pdf';
            break;
        case 'compressjpeg':
            url = 'https://compressjpeg.com/';
            break;
        default:
            url = 'https://www.ilovepdf.com/compress_pdf';
    }
    
    window.open(url, '_blank');
    closeModal();
    
    // Show reminder message
    setTimeout(() => {
        showModal(
            'After compressing your file, please download it and re-upload the compressed version here.',
            'info',
            'Compression Reminder'
        );
    }, 1000);
}

// Update file input to match selectedFiles array
function updateFileInput() {
    const uploadInput = document.getElementById('upload');
    if (!uploadInput) {
        console.error('Upload input element not found');
        return;
    }
    
    try {
        if (selectedFiles.length === 0) {
            uploadInput.value = '';
        } else {
            const dt = new DataTransfer();
            selectedFiles.forEach((file, index) => {
                try {
                    dt.items.add(file);
                } catch (error) {
                    console.error(`Error adding file ${index} to DataTransfer:`, error);
                }
            });
            uploadInput.files = dt.files;
        }
        console.log('File input updated successfully. Files:', selectedFiles.length);
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
                <li><strong>Relationship:</strong> Click to select, click again to deselect</li>
            </ul>
            
            <h4>📁 File Compression</h4>
            <ul style="text-align: left; margin: 15px 0;">
                <li><strong>External Services:</strong> Use recommended compression websites</li>
                <li><strong>Easy Process:</strong> Click compress → Upload → Download → Re-upload</li>
                <li><strong>Quality Maintained:</strong> Professional compression tools preserve quality</li>
                <li><strong>Free Services:</strong> All recommended services are free to use</li>
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
    console.log('Sainik Board Form System - Professional Edition - Initializing...');
    
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
                'File Limit Reached'
            );
            uniqueFiles.splice(allowedCount);
        }
        
        selectedFiles = [...selectedFiles, ...uniqueFiles];
        this.value = "";
        renderPreviews();
        
        console.log('Files added. Total:', selectedFiles.length);
    });

    // FIXED: File preview rendering with working remove buttons
    function renderPreviews() {
        if (!previewContainer) return;
        
        previewContainer.innerHTML = "";
        
        const oversizedFiles = selectedFiles.filter(f => f.size > 10 * 1024 * 1024);
        
        // Simple warning for oversized files (no big banner)
        if (oversizedFiles.length > 0) {
            const warningDiv = document.createElement("div");
            warningDiv.className = "oversized-warning";
            warningDiv.innerHTML = `
                <div class="warning-content">
                    <span class="warning-icon">⚠️</span>
                    <span class="warning-text">
                        ${oversizedFiles.length} file(s) exceed the 10MB limit. Please compress them using the buttons below.
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

            // FIXED: Working remove button
            const removeBtn = document.createElement("span");
            removeBtn.innerHTML = "×";
            removeBtn.className = "remove-btn";
            removeBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('Remove button clicked for index:', index);
                removeFile(index);
            });
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
            
            const sizeBadge = document.createElement("div");
            sizeBadge.className = isOversized ? "file-size-badge oversized" : "file-size-badge";
            sizeBadge.textContent = formatFileSize(file.size);
            fileBox.appendChild(sizeBadge);

            // External compression button for oversized files
            if (isOversized) {
                const compressBtn = document.createElement("button");
                compressBtn.className = "compress-btn";
                compressBtn.innerHTML = "🗜️ Compress";
                compressBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    showCompressionOptions(index);
                });
                fileBox.appendChild(compressBtn);
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
        if (uploadCountElement) {
            uploadCountElement.textContent = countText;
        }
    }

    // ENHANCED: Form submission with strict oversized file blocking
    form.addEventListener("submit", async function(e) {
        e.preventDefault();
        e.stopPropagation();

        if (isSubmitting) {
            showModal('Form submission already in progress. Please wait.', 'warning', 'Processing');
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

        // Validate phone
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

        // STRICT: Block submission if ANY oversized files are present
        const oversizedFiles = selectedFiles.filter(f => f.size > 10 * 1024 * 1024);
        if (oversizedFiles.length > 0) {
            showModal(
                `Cannot submit form with oversized files. Please compress or remove these files first:<br><br>${oversizedFiles.map(f => `<strong>${f.name}</strong> (${formatFileSize(f.size)})`).join('<br>')}<br><br>Use the compress buttons or remove the files to proceed.`,
                'error',
                'Oversized Files Must Be Resolved'
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

            console.log('Submitting form...');
            
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
                    `Your feedback has been successfully submitted!<br><br>
                    <strong>ESM Name:</strong> ${form.esmName.value}<br>
                    <strong>Rank:</strong> ${form.rank.value}<br>
                    <strong>Branch:</strong> ${form.branch.value}<br>
                    <strong>Files Submitted:</strong> ${validFiles.length}<br><br>
                    Thank you for your valuable feedback.`,
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
                throw new Error(result.error || "Form submission failed");
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
    
    console.log('Sainik Board Form System - Professional Edition - Ready');
});
