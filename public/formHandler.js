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
                // Deselect if already selected
                this.checked = false;
                isSelected = false;
            } else {
                // Clear all others and select this one
                relationshipRadios.forEach(r => {
                    r.parentElement.isSelected = false;
                });
                this.checked = true;
                isSelected = true;
            }
            
            // Remove error styling when a selection is made
            const label = document.getElementById('relationshipLabel');
            if (label) {
                label.classList.remove('required-error');
            }
        });
        
        // Track selection state
        radio.addEventListener('change', function() {
            if (this.checked) {
                relationshipRadios.forEach(r => {
                    if (r !== this) {
                        r.parentElement.isSelected = false;
                    }
                });
                isSelected = true;
                
                // Remove error styling when a selection is made
                const label = document.getElementById('relationshipLabel');
                if (label) {
                    label.classList.remove('required-error');
                }
            }
        });
    });
}

// Validate relationship selection
function validateRelationshipField() {
    const radios = document.getElementsByName('relationship');
    const label = document.getElementById('relationshipLabel');
    const section = document.getElementById('relationshipSection');
    
    for (const radio of radios) {
        if (radio.checked) {
            label.classList.remove('required-error');
            return true;
        }
    }
    
    // No relationship selected - show error
    label.classList.add('required-error');
    section.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    return false;
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
    
    if (!phoneInput)return;
    
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


// ✅ EMAIL VALIDATION BELOW
    const emailInput = document.getElementById('email');
    if (emailInput) {
        let emailError = document.getElementById('email-error');

        // If the error span doesn't already exist, create it
        if (!emailError) {
            emailError = document.createElement('span');
            emailError.id = 'email-error';
            emailError.className = 'error-message';
            emailError.style.display = 'none';
            emailError.style.color = 'red';
            emailInput.parentNode.appendChild(emailError);
        }

        emailInput.addEventListener('input', function () {
            const email = this.value.trim();

            if (email === '') {
                emailError.textContent = '';
                emailError.style.display = 'none';
                return;
            }

            const emailRegex = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i;

            if (!emailRegex.test(email)) {
                emailError.textContent = 'Please enter a valid email (e.g. example@domain.com)';
                emailError.style.display = 'block';
            } else {
                emailError.textContent = '';
                emailError.style.display = 'none';
            }
        });
    }
}

// Custom Modal Functions
function showModal(message, type = 'info', title = 'Notification') {
    const modal = document.getElementById('customModal');
    const container = modal.querySelector('.modal-container');
    const titleElement = modal.querySelector('.modal-title');
    const messageElement = document.getElementById('modalMessage');
    const footerElement = modal.querySelector('.modal-footer');
    
    container.classList.remove('success', 'error', 'warning', 'info', 'confirm');
    
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
}


// Show compression confirmation dialog
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
    
    titleElement.textContent = 'Compress File Confirmation';
    
    messageElement.innerHTML = `
        <div class="confirmation-content">
            <div class="file-info">
                <p><strong>File:</strong> ${file.name}</p>
                <p><strong>Current Size:</strong> ${formatFileSize(file.size)}</p>
                <p><strong>Size Limit:</strong> 10 MB</p>
            </div>
            <p class="confirmation-question">What would you like to do with this oversized file?</p>
        </div>
    `;
    
    footerElement.innerHTML = `
        <button class="modal-btn-secondary" onclick="closeModal()">No, close this message</button>
<button class="modal-btn-primary" onclick="proceedToCompression()">Yes, I want to compress</button>
    
`;
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    const modalBody = modal.querySelector('.modal-body');
    modalBody.scrollTop = 0;
}


// White-background compression services dialog
function proceedToCompression() {
    
    const file = selectedFiles[currentCompressFileIndex];
    if (!file) return;

    showModal(
        `<div class="compression-modal white-bg">
            <h4 class="compression-title">File Compression Services</h4>
            <p class="compression-subtitle">
                Compress <strong>${file.name}</strong> using one of these free online tools:
            </p>
            <div class="service-cards">
                <div class="service-card">
                    <button onclick="window.open('https://www.youcompress.com/','_blank')">
                        YouCompress
                    </button>
                    <p>No registration • Multiple formats</p>
                </div>
                <div class="service-card recommended">
                    <button onclick="window.open('https://www.ilovepdf.com/compress_pdf','_blank')">
                        iLovePDF <span class="recommended-text">(Recommended)</span>
                    </button>
                    <p>PDF specialist • High quality</p>
                </div>
                <div class="service-card">
                    <button onclick="window.open('https://smallpdf.com/compress-pdf','_blank')">
                        SmallPDF
                    </button>
                    <p>Easy • Quick processing</p>
                </div>
            </div>
            <p class="compression-instructions">
                💡 After compressing, download the new file and re-upload it here to replace the original.
            </p>
        </div>`,
        'info',
        '',
        `<button class="modal-btn-secondary" onclick="closeModal()">Close</button>`
    );
}
 window.proceedToCompression = proceedToCompression;


// Update file input to match selectedFiles array
function updateFileInput() {
    const uploadInput = document.getElementById('upload');
    
    if (selectedFiles.length === 0) {
        uploadInput.value = '';
    } else {
        const dt = new DataTransfer();
        selectedFiles.forEach(file => dt.items.add(file));
        uploadInput.files = dt.files;
    }
}

// Form Help Guidelines
function showFormHelp() {
    const helpContent = `
        <div class="help-content">
            <h4>📋 Form Guidelines</h4>
            <ul style="text-align:left;margin:15px 0;">
                <li><strong>Required:</strong> Rank, ESM Name, Relationship, Phone, Parent ZSB Branch</li>
                <li><strong>Files:</strong> ≤ 10 files, each ≤ 10 MB</li>
                <li><strong>Formats:</strong> JPG / PNG images, PDF & DOC/DOCX docs</li>
                <li><strong>Phone:</strong> Valid 10-digit Indian mobile number</li>
            </ul>

            <h4>🔧 File Management (for attachments) </h4>
            <ul style="text-align:left;margin:15px 0;">
                <li>Click the <b>×</b> to remove a file</li>
                <li>Files over 10 MB show an orange border</li>
                <li>Click an oversized file → <strong>Compress</strong> or <strong>Remove</strong></li>
            </ul>

            <h4>📞 Need Help?</h4>
            <p style="text-align:left;margin:10px 0;">
                Contact your Parent ZSB branch office.
            </p>
        </div>
    `;
    
    showModal(helpContent, 'info', 'Form Help');
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

// Main initialization
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
                        Click on oversized files to compress them.
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

            // Make oversized files clickable
            if (isOversized) {
                fileBox.onclick = function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    showCompressionConfirmation(index);
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
            countText = `${validFiles} valid file(s), ${oversizedFiles} oversized file(s)`;
        } else if (validFiles > 0) {
            countText = `${validFiles} file(s) selected`;
        } else if (oversizedFiles > 0) {
            countText = `${oversizedFiles} oversized file(s) - click to compress`;
        } else {
            countText = "No files selected";
        }
        
        document.getElementById("upload-count").textContent = countText;
    }

    // Form submission with validation
    form.addEventListener("submit", async function(e) {
        e.preventDefault();
        e.stopPropagation();
        

        if (isSubmitting) {
          
            return;
        }

        // VALIDATE RELATIONSHIP FIRST
        if (!validateRelationshipField()) {
            showModal(
                'Please select your relationship before submitting the form.',
                'error',
                'Relationship Required'
            );
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
                    `Your feedback has been successfully submitted!<br><br><strong>Name:</strong> ${form.esmName.value}<br><strong>Branch:</strong> ${form.branch.value}<br><br>Thank you for your valuable feedback.`,
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



    // List the selectors for all required fields (update if your IDs differ)
const requiredSelectors = ['#rank', '#esmName', '#phone', '#branch'];

function highlightMissing() {
  let missing = false;
  requiredSelectors.forEach(sel => {
    const el = document.querySelector(sel);
    if (el && !el.value.trim()) {
      el.classList.add('input-error');
      missing = true;
    } else if (el) {
      el.classList.remove('input-error');
    }
  });
  // Relationship radio validation (add red to label if missing)
  const relRadios = document.getElementsByName('relationship');
  const relLabel = document.getElementById('relationshipLabel');
  const relChecked = Array.from(relRadios).some(r => r.checked);
  if (!relChecked) {
    relLabel.classList.add('input-error');
    missing = true;
  } else {
    relLabel.classList.remove('input-error');
  }
  return missing;
}

// On blur of each required field
requiredSelectors.forEach(sel => {
  const el = document.querySelector(sel);
  if (el) {
    el.addEventListener('blur', () => {
      if (!el.value.trim()) el.classList.add('input-error');
      else el.classList.remove('input-error');
    });
  }
});

// On form submit, highlight and block submission if missing
document.getElementById('feedbackForm').addEventListener('submit', function(e) {
  if (highlightMissing()) {
    e.preventDefault();
    // Optionally show a message/modal
    // alert("Please fill all required fields.");
  }
});

});



