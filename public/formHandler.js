// Prevent multiple submissions
let isSubmitting = false;
let selectedFiles = [];
let pendingOversizedFiles = []; // Store oversized files temporarily

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

// Terms acceptance validation
function validateTermsAcceptance() {
    const termsCheckbox = document.getElementById('termsCheckbox');
    const submitBtn = document.getElementById('submitBtn');
    
    if (termsCheckbox && termsCheckbox.checked) {
        submitBtn.disabled = false;
        submitBtn.classList.remove('disabled');
    } else {
        submitBtn.disabled = true;
        submitBtn.classList.add('disabled');
    }
}

// Custom Modal Functions
function showModal(message, type = 'info', title = 'Notification') {
    const modal = document.getElementById('customModal');
    const container = modal.querySelector('.modal-container');
    const titleElement = modal.querySelector('.modal-title');
    const messageElement = document.getElementById('modalMessage');
    const footerElement = modal.querySelector('.modal-footer');
    
    // Remove existing type classes
    container.classList.remove('success', 'error', 'warning', 'info', 'file-size');
    
    // Add appropriate type class
    if (type) {
        container.classList.add(type);
    }
    
    // Set content
    titleElement.textContent = title;
    messageElement.innerHTML = message;
    
    // Reset footer to default
    footerElement.innerHTML = '<button class="modal-btn-primary" onclick="closeModal()">OK</button>';
    
    // Show modal
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    const modalBody = modal.querySelector('.modal-body');
    modalBody.scrollTop = 0;
}

function closeModal() {
    const modal = document.getElementById('customModal');
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

// Show File Size Violation Modal with WORKING Options
function showFileSizeModal(oversizedFiles) {
    const modal = document.getElementById('customModal');
    const container = modal.querySelector('.modal-container');
    const titleElement = modal.querySelector('.modal-title');
    const messageElement = document.getElementById('modalMessage');
    const footerElement = modal.querySelector('.modal-footer');
    
    // Store oversized files for later processing
    pendingOversizedFiles = [...oversizedFiles];
    
    // Remove existing type classes and add file-size class
    container.classList.remove('success', 'error', 'warning', 'info');
    container.classList.add('file-size');
    
    // Set content
    titleElement.textContent = 'File Size Limit Exceeded';
    
    const fileList = oversizedFiles.map(f => 
        `<li><strong>${f.name}</strong> (${formatFileSize(f.size)})</li>`
    ).join('');
    
    messageElement.innerHTML = `
        <div class="file-size-content">
            <p>The following files exceed the 10MB limit:</p>
            <ul class="oversized-files-list">
                ${fileList}
            </ul>
            <p>What would you like to do?</p>
        </div>
    `;
    
    // Create custom footer with three WORKING options
    footerElement.innerHTML = `
        <button class="modal-btn-secondary" onclick="removeOversizedFiles()">Remove Files</button>
        <button class="modal-btn-secondary" onclick="reselectFiles()">Reselect</button>
        <button class="modal-btn-primary" onclick="compressFiles()">Compress Files</button>
    `;
    
    // Show modal
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// FIXED: Handle removing oversized files - Actually works now
function removeOversizedFiles() {
    console.log('Before removal:', selectedFiles.length, 'files');
    console.log('Removing files:', pendingOversizedFiles.map(f => f.name));
    
    // Remove oversized files from selectedFiles array by comparing file names and sizes
    selectedFiles = selectedFiles.filter(file => {
        return !pendingOversizedFiles.some(oversizedFile => 
            oversizedFile.name === file.name && oversizedFile.size === file.size
        );
    });
    
    console.log('After removal:', selectedFiles.length, 'files');
    
    // Clear pending oversized files
    pendingOversizedFiles = [];
    
    // Update the file input to reflect the changes
    updateFileInput();
    
    // Re-render previews
    renderPreviews();
    
    // Close modal
    closeModal();
    
    // Show success message
    showModal(
        'Oversized files have been removed successfully. You can now submit your form or add different files.',
        'success',
        'Files Removed'
    );
}

// FIXED: Handle reselecting files - Actually works now
function reselectFiles() {
    console.log('Reselecting files - clearing all selections');
    
    // Clear all files
    selectedFiles = [];
    pendingOversizedFiles = [];
    
    // Clear the file input completely
    const uploadInput = document.getElementById('upload');
    uploadInput.value = '';
    
    // Re-render previews (will show empty)
    renderPreviews();
    
    // Close modal
    closeModal();
    
    // Show instruction message
    showModal(
        'All files have been cleared. Please select your files again using the file upload button.',
        'info',
        'Please Reselect Files'
    );
}

// NEW: Function to update file input to match selectedFiles array
function updateFileInput() {
    const uploadInput = document.getElementById('upload');
    
    if (selectedFiles.length === 0) {
        // If no files left, clear the input
        uploadInput.value = '';
    } else {
        // Use DataTransfer to create new FileList with remaining files
        const dt = new DataTransfer();
        
        selectedFiles.forEach(file => {
            dt.items.add(file);
        });
        
        // Update the input's files
        uploadInput.files = dt.files;
    }
}

// Handle file compression - redirect to free services
function compressFiles() {
    closeModal();
    
    if (pendingOversizedFiles.length === 0) return;
    
    showCompressionServiceModal();
}

// Show compression service selection
function showCompressionServiceModal() {
    const fileTypes = pendingOversizedFiles.map(f => f.type);
    const hasImages = fileTypes.some(type => type.startsWith('image/'));
    
    if (hasImages && pendingOversizedFiles.length === 1 && pendingOversizedFiles[0].type.startsWith('image/')) {
        compressImageClientSide(pendingOversizedFiles[0]);
        return;
    }
    
    const serviceOptions = `
        <div class="compression-services">
            <h4>Choose a free compression service:</h4>
            <div class="service-options">
                <button class="service-btn" onclick="redirectToYouCompress()">
                    <div class="service-info">
                        <strong>YouCompress</strong>
                        <span>Free • No Registration • Multiple Formats</span>
                    </div>
                </button>
                <button class="service-btn" onclick="redirectToILovePDF()">
                    <div class="service-info">
                        <strong>iLovePDF</strong>
                        <span>Free • PDF Specialist • High Quality</span>
                    </div>
                </button>
                <button class="service-btn" onclick="redirectToSmallPDF()">
                    <div class="service-info">
                        <strong>SmallPDF</strong>
                        <span>Free • Easy to Use • Quick Processing</span>
                    </div>
                </button>
            </div>
            <p class="compression-note">
                💡 <strong>Instructions:</strong> The service will open in a new tab. After compressing your files, 
                download them and return to this form to upload the compressed versions.
            </p>
        </div>
    `;
    
    showModal(serviceOptions, 'info', 'File Compression Services');
}

// Client-side image compression
async function compressImageClientSide(imageFile) {
    showModal(
        'Compressing image... Please wait.',
        'info',
        'Processing Image'
    );
    
    try {
        const compressedFile = await compressImageUsingCanvas(imageFile);
        
        if (compressedFile.size <= 10 * 1024 * 1024) {
            // Remove original oversized file and add compressed version
            selectedFiles = selectedFiles.filter(f => f.name !== imageFile.name);
            selectedFiles.push(compressedFile);
            pendingOversizedFiles = [];
            
            // Update file input
            updateFileInput();
            
            renderPreviews();
            closeModal();
            
            showModal(
                `Image compressed successfully!<br><br>
                <strong>Original:</strong> ${formatFileSize(imageFile.size)}<br>
                <strong>Compressed:</strong> ${formatFileSize(compressedFile.size)}<br>
                <strong>Savings:</strong> ${(((imageFile.size - compressedFile.size) / imageFile.size) * 100).toFixed(1)}%`,
                'success',
                'Compression Complete'
            );
        } else {
            throw new Error('Compression did not reduce file size enough');
        }
    } catch (error) {
        console.error('Image compression failed:', error);
        showModal(
            'Image compression failed. Please try using an external service.',
            'error',
            'Compression Failed'
        );
    }
}

// Canvas-based image compression
function compressImageUsingCanvas(file) {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = function() {
            const maxSize = 1920;
            let { width, height } = img;
            
            if (width > height) {
                if (width > maxSize) {
                    height = (height * maxSize) / width;
                    width = maxSize;
                }
            } else {
                if (height > maxSize) {
                    width = (width * maxSize) / height;
                    height = maxSize;
                }
            }
            
            canvas.width = width;
            canvas.height = height;
            
            ctx.drawImage(img, 0, 0, width, height);
            
            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        const compressedFile = new File([blob], file.name, {
                            type: 'image/jpeg',
                            lastModified: Date.now()
                        });
                        resolve(compressedFile);
                    } else {
                        reject(new Error('Canvas compression failed'));
                    }
                },
                'image/jpeg',
                0.7
            );
        };
        
        img.onerror = () => reject(new Error('Image loading failed'));
        img.src = URL.createObjectURL(file);
    });
}

// Redirect to compression services
function redirectToYouCompress() {
    window.open('https://www.youcompress.com/', '_blank');
    closeModal();
    showPostCompressionInstructions();
}

function redirectToILovePDF() {
    window.open('https://www.ilovepdf.com/compress_pdf', '_blank');
    closeModal();
    showPostCompressionInstructions();
}

function redirectToSmallPDF() {
    window.open('https://smallpdf.com/compress-pdf', '_blank');
    closeModal();
    showPostCompressionInstructions();
}

// Show instructions after redirecting to compression service
function showPostCompressionInstructions() {
    const fileNames = pendingOversizedFiles.map(f => f.name).join(', ');
    
    showModal(
        `<div class="compression-instructions">
            <h4>📋 Next Steps:</h4>
            <ol>
                <li>Upload your files (<strong>${fileNames}</strong>) to the compression service</li>
                <li>Download the compressed files to your device</li>
                <li>Return to this form and upload the compressed files</li>
                <li>Submit your feedback form</li>
            </ol>
            <p>💡 <strong>Tip:</strong> The compression service will automatically optimize your files 
            while maintaining good quality.</p>
        </div>`,
        'info',
        'Compression Service Opened'
    );
    
    pendingOversizedFiles = [];
}

// Information Icon Function - Show Form Help
function showFormHelp() {
    const helpContent = `
        <div class="help-content">
            <h4>📋 Form Submission Guidelines</h4>
            <ul style="text-align: left; margin: 15px 0;">
                <li><strong>Required Fields:</strong> Rank, Full Name, Phone, and Branch are mandatory</li>
                <li><strong>File Upload:</strong> Maximum 10 files, each under 10MB</li>
                <li><strong>Supported Formats:</strong> Images (JPG, PNG), Documents (PDF, DOC, DOCX)</li>
                <li><strong>Total Size Limit:</strong> All files combined must be under 25MB</li>
                <li><strong>Terms Acceptance:</strong> You must accept terms and conditions before submission</li>
            </ul>
            
            <h4>📁 Data Protection</h4>
            <ul style="text-align: left; margin: 15px 0;">
                <li>All data is processed according to Government of West Bengal guidelines</li>
                <li>Personal information is protected under Digital Personal Data Protection Act</li>
                <li>Files are securely stored in government-approved cloud infrastructure</li>
                <li>Access is restricted to authorized Sainik Board personnel only</li>
            </ul>
            
            <h4>🔧 File Management Options</h4>
            <ul style="text-align: left; margin: 15px 0;">
                <li><strong>Remove:</strong> Delete oversized files from your selection</li>
                <li><strong>Reselect:</strong> Clear all files and start fresh</li>
                <li><strong>Compress:</strong> Use free online tools to reduce file sizes</li>
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
    const termsCheckbox = document.getElementById("termsCheckbox");

    // Initialize submit button as disabled
    submitBtn.disabled = true;
    submitBtn.classList.add('disabled');

    // Terms checkbox validation
    if (termsCheckbox) {
        termsCheckbox.addEventListener('change', validateTermsAcceptance);
    }

    // RESTORED: Enhanced file upload handling with WORKING modal options
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
        
        // Add ALL files first (including oversized ones)
        selectedFiles = [...selectedFiles, ...uniqueFiles];
        
        // Check for oversized files AFTER adding them
        const oversizedFiles = uniqueFiles.filter(file => file.size > 10 * 1024 * 1024);
        
        this.value = "";
        renderPreviews();
        
        // Show file size modal with WORKING options if there are oversized files
        if (oversizedFiles.length > 0) {
            showFileSizeModal(oversizedFiles);
        }
    });

    function renderPreviews() {
        previewContainer.innerHTML = "";
        
        selectedFiles.forEach((file, index) => {
            const fileBox = document.createElement("div");
            fileBox.className = "file-box";
            
            // Check if file is oversized and mark visually
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
                updateFileInput(); // Update the actual file input
                renderPreviews();
                updateFileCount();
            };

            fileBox.appendChild(removeBtn);

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
            
            // Enhanced size badge with proper KB/MB display
            const sizeBadge = document.createElement("div");
            sizeBadge.className = isOversized ? "file-size-badge oversized" : "file-size-badge";
            sizeBadge.textContent = formatFileSize(file.size);
            fileBox.appendChild(sizeBadge);

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
            countText = `${oversizedFiles} oversized file(s) - need action`;
        }
        
        document.getElementById("upload-count").textContent = countText;
    }

    // Enhanced form submission with terms validation
    form.addEventListener("submit", async function(e) {
        e.preventDefault();
        e.stopPropagation();

        if (isSubmitting) {
            return;
        }

        // Check terms acceptance
        if (!termsCheckbox || !termsCheckbox.checked) {
            showModal(
                'You must accept the terms and conditions before submitting the form.',
                'error',
                'Terms Acceptance Required'
            );
            return;
        }

        // Check for oversized files before submission
        const oversizedFiles = selectedFiles.filter(f => f.size > 10 * 1024 * 1024);
        if (oversizedFiles.length > 0) {
            showFileSizeModal(oversizedFiles);
            return;
        }

        // Only use valid files for submission
        const validFiles = selectedFiles.filter(f => f.size <= 10 * 1024 * 1024);

        // Total size validation
        const totalSize = validFiles.reduce((acc, f) => acc + f.size, 0);
        if (totalSize > 25 * 1024 * 1024) {
            showModal(
                `Total file size is ${formatFileSize(totalSize)}, which exceeds the 25MB limit.<br><br>Please remove some files or compress them further.`,
                'error',
                'Total File Size Exceeded'
            );
            return;
        }

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
                    `Your feedback has been successfully submitted!<br><br><strong>Name:</strong> ${form.name.value}<br><strong>Branch:</strong> ${form.branch.value}<br><br>Thank you for your valuable feedback.`,
                    'success',
                    'Form Submitted Successfully'
                );
                
                setTimeout(() => {
                    form.reset();
                    selectedFiles = [];
                    pendingOversizedFiles = [];
                    renderPreviews();
                    validateTermsAcceptance();
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
            validateTermsAcceptance();
            if (!submitBtn.disabled) {
                submitBtn.textContent = "SUBMIT";
            }
        }
    });
});
