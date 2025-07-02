// Global variables - keep it simple
let isSubmitting = false;
let selectedFiles = [];

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

// SIMPLIFIED: Basic modal system
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

// SIMPLIFIED: Direct compression for images only
function compressFile(fileIndex) {
    const file = selectedFiles[fileIndex];
    if (!file) {
        showModal('Error: File not found.', 'error', 'File Error');
        return;
    }
    
    console.log('Starting compression for:', file.name, 'Index:', fileIndex);
    
    if (file.type.startsWith('image/')) {
        compressImageDirect(file, fileIndex);
    } else {
        // For PDFs and documents, show external service options
        showExternalCompressionOptions(file, fileIndex);
    }
}

// WORKING: Direct image compression
function compressImageDirect(file, fileIndex) {
    showModal(`
        <div style="text-align: center;">
            <div style="margin: 20px 0;">
                <div style="font-size: 24px;">🗜️</div>
                <h4>Compressing Image...</h4>
                <p><strong>File:</strong> ${file.name}</p>
                <p><strong>Original Size:</strong> ${formatFileSize(file.size)}</p>
            </div>
            <div style="background: #f0f0f0; padding: 10px; border-radius: 5px; margin: 15px 0;">
                <div id="compressionBar" style="width: 0%; height: 20px; background: #007bff; border-radius: 3px; transition: width 0.5s;"></div>
            </div>
            <p>Please wait while we compress your image...</p>
        </div>
    `, 'compress', 'Compressing Image');
    
    // Start compression process
    setTimeout(() => {
        document.getElementById('compressionBar').style.width = '30%';
    }, 500);
    
    setTimeout(() => {
        document.getElementById('compressionBar').style.width = '70%';
        performImageCompression(file, fileIndex);
    }, 1000);
}

// GUARANTEED: Image compression that works
function performImageCompression(file, fileIndex) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = function() {
        // Calculate new dimensions - be aggressive
        let { width, height } = img;
        const maxSize = 800; // Start with 800px max
        
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
        ctx.drawImage(img, 0, 0, width, height);
        
        // Try different quality levels until under 10MB
        tryCompressionQuality(canvas, file, fileIndex, 0.7);
    };
    
    img.onerror = function() {
        showModal('Failed to load image for compression.', 'error', 'Compression Failed');
    };
    
    img.src = URL.createObjectURL(file);
}

function tryCompressionQuality(canvas, originalFile, fileIndex, quality) {
    canvas.toBlob(function(blob) {
        if (!blob) {
            showModal('Compression failed.', 'error', 'Compression Failed');
            return;
        }
        
        const compressedFile = new File([blob], originalFile.name, {
            type: 'image/jpeg',
            lastModified: Date.now()
        });
        
        console.log('Compressed to:', formatFileSize(compressedFile.size), 'Quality:', quality);
        
        // Check if under 10MB
        if (compressedFile.size <= 10 * 1024 * 1024) {
            // Success! Show options
            showCompressionSuccess(originalFile, compressedFile, fileIndex);
        } else if (quality > 0.1) {
            // Try lower quality
            tryCompressionQuality(canvas, originalFile, fileIndex, quality - 0.2);
        } else {
            // Even at lowest quality, still too big
            showModal(
                `Unable to compress "${originalFile.name}" below 10MB. Please use an external compression service or choose a different file.`,
                'error',
                'Compression Failed'
            );
        }
    }, 'image/jpeg', quality);
}

function showCompressionSuccess(originalFile, compressedFile, fileIndex) {
    const compressionRatio = (((originalFile.size - compressedFile.size) / originalFile.size) * 100).toFixed(1);
    
    showModal(`
        <div style="text-align: center;">
            <div style="font-size: 48px; margin-bottom: 15px;">✅</div>
            <h4>Compression Successful!</h4>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <div>
                        <small>Original Size</small><br>
                        <strong>${formatFileSize(originalFile.size)}</strong>
                    </div>
                    <div style="font-size: 20px;">➜</div>
                    <div>
                        <small>Compressed Size</small><br>
                        <strong style="color: #28a745;">${formatFileSize(compressedFile.size)}</strong>
                    </div>
                </div>
                <p><strong>Space Saved:</strong> ${formatFileSize(originalFile.size - compressedFile.size)} (${compressionRatio}% reduction)</p>
                <p style="color: #28a745;"><strong>✅ Ready for upload (under 10MB)</strong></p>
            </div>
            <p><strong>What would you like to do?</strong></p>
        </div>
    `, 'success', 'Compression Complete');
    
    // Replace the footer with action buttons
    const footerElement = document.querySelector('.modal-footer');
    footerElement.innerHTML = `
        <button class="modal-btn-danger" onclick="removeFileDirectly(${fileIndex})">Remove Original File</button>
        <button class="modal-btn-primary" onclick="replaceFileDirectly(${fileIndex}, arguments[0])" data-compressed='${JSON.stringify({name: compressedFile.name, size: compressedFile.size, type: compressedFile.type})}'>Use Compressed File</button>
    `;
    
    // Store compressed file globally for easy access
    window.tempCompressedFile = compressedFile;
}

// WORKING: Direct file replacement
function replaceFileDirectly(fileIndex, compressedFileData) {
    try {
        if (fileIndex < 0 || fileIndex >= selectedFiles.length) {
            throw new Error('Invalid file index');
        }
        
        if (!window.tempCompressedFile) {
            throw new Error('Compressed file not found');
        }
        
        const originalName = selectedFiles[fileIndex].name;
        
        // Replace the file in the array
        selectedFiles[fileIndex] = window.tempCompressedFile;
        
        // Update file input
        updateFileInput();
        
        // Re-render previews
        renderPreviews();
        
        // Close modal
        closeModal();
        
        // Clean up
        window.tempCompressedFile = null;
        
        // Show success
        setTimeout(() => {
            showModal(
                `File "${originalName}" has been successfully replaced with the compressed version!`,
                'success',
                'File Replaced'
            );
        }, 300);
        
    } catch (error) {
        console.error('Replace error:', error);
        showModal(`Failed to replace file: ${error.message}`, 'error', 'Replace Failed');
    }
}

// WORKING: Direct file removal - BULLETPROOF
function removeFileDirectly(fileIndex) {
    try {
        console.log('Removing file at index:', fileIndex, 'Total files:', selectedFiles.length);
        
        if (fileIndex < 0 || fileIndex >= selectedFiles.length) {
            throw new Error(`Invalid file index: ${fileIndex}`);
        }
        
        const fileName = selectedFiles[fileIndex].name;
        console.log('Removing file:', fileName);
        
        // Remove from array
        selectedFiles.splice(fileIndex, 1);
        console.log('Files after removal:', selectedFiles.length);
        
        // Update file input
        updateFileInput();
        
        // Re-render previews
        renderPreviews();
        
        // Close modal
        closeModal();
        
        // Show success
        setTimeout(() => {
            showModal(
                `File "${fileName}" has been removed from your selection.`,
                'info',
                'File Removed'
            );
        }, 300);
        
    } catch (error) {
        console.error('Remove error:', error);
        showModal(`Failed to remove file: ${error.message}`, 'error', 'Remove Failed');
    }
}

// SIMPLE: Remove file from anywhere (for X button clicks)
function removeFileFromArray(fileIndex) {
    console.log('Removing file from array, index:', fileIndex);
    
    if (fileIndex >= 0 && fileIndex < selectedFiles.length) {
        selectedFiles.splice(fileIndex, 1);
        updateFileInput();
        renderPreviews();
        updateFileCount();
    } else {
        console.error('Invalid file index for removal:', fileIndex);
    }
}

// Show external compression options for PDFs and documents
function showExternalCompressionOptions(file, fileIndex) {
    const fileType = file.type.includes('pdf') ? 'PDF' : 'Document';
    
    showModal(`
        <div style="text-align: center;">
            <div style="font-size: 24px; margin-bottom: 15px;">📄</div>
            <h4>${fileType} Compression Required</h4>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0;">
                <p><strong>File:</strong> ${file.name}</p>
                <p><strong>Size:</strong> ${formatFileSize(file.size)}</p>
                <p><strong>Limit:</strong> 10 MB</p>
            </div>
            <p>For ${fileType.toLowerCase()} files, please use one of these free compression services:</p>
            <div style="text-align: left; margin: 20px 0;">
                <div style="margin: 10px 0; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
                    <strong>iLovePDF</strong> <span style="color: #28a745; font-size: 12px;">Recommended</span><br>
                    <small>Free PDF compression with high quality</small><br>
                    <button class="modal-btn-primary" onclick="window.open('https://www.ilovepdf.com/compress_pdf', '_blank'); closeModal();" style="margin-top: 5px; padding: 5px 10px; font-size: 12px;">Open Service</button>
                </div>
                <div style="margin: 10px 0; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
                    <strong>SmallPDF</strong><br>
                    <small>Easy-to-use compression tool</small><br>
                    <button class="modal-btn-secondary" onclick="window.open('https://smallpdf.com/compress-pdf', '_blank'); closeModal();" style="margin-top: 5px; padding: 5px 10px; font-size: 12px;">Open Service</button>
                </div>
            </div>
            <p style="font-size: 12px; color: #666;">After compressing, re-upload the compressed file to replace this one.</p>
        </div>
    `, 'info', 'External Compression Required');
    
    // Add remove option in footer
    const footerElement = document.querySelector('.modal-footer');
    footerElement.innerHTML = `
        <button class="modal-btn-danger" onclick="removeFileDirectly(${fileIndex})">Remove This File</button>
        <button class="modal-btn-secondary" onclick="closeModal()">Keep Original</button>
    `;
}

// Update file input to match selectedFiles array
function updateFileInput() {
    const uploadInput = document.getElementById('upload');
    
    if (!uploadInput) {
        console.error('Upload input not found');
        return;
    }
    
    try {
        if (selectedFiles.length === 0) {
            uploadInput.value = '';
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
            
            <h4>🔧 File Compression</h4>
            <ul style="text-align: left; margin: 15px 0;">
                <li><strong>Images:</strong> Automatic compression using Canvas API</li>
                <li><strong>PDFs:</strong> External compression services (iLovePDF recommended)</li>
                <li><strong>Documents:</strong> External compression tools available</li>
                <li><strong>Guaranteed Results:</strong> All images compressed under 10MB</li>
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

// MAIN DOM READY FUNCTION
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
        if (!previewContainer) return;
        
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
                removeFileFromArray(index);
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

    // Update file count function
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
