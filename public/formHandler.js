// Prevent multiple submissions
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
    
    container.classList.remove('success', 'error', 'warning', 'info');
    
    if (type) {
        container.classList.add(type);
    }
    
    titleElement.textContent = title;
    messageElement.innerHTML = message;
    
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
            
            <h4>🔧 Troubleshooting</h4>
            <ul style="text-align: left; margin: 15px 0;">
                <li>If file upload fails, try refreshing the page and reselecting files</li>
                <li>Ensure files are not corrupted or password-protected</li>
                <li>Use latest version of Chrome, Firefox, or Edge browser</li>
                <li>Clear browser cache if form is not responding properly</li>
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

    // SIMPLIFIED file upload handling - NO MODAL OPTIONS
    uploadInput.addEventListener("change", function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const newFiles = Array.from(this.files);
        const existingNames = selectedFiles.map(file => file.name);
        const uniqueFiles = newFiles.filter(file => !existingNames.includes(file.name));
        
        // Check for oversized files and reject them immediately
        const oversizedFiles = uniqueFiles.filter(file => file.size > 10 * 1024 * 1024);
        const validFiles = uniqueFiles.filter(file => file.size <= 10 * 1024 * 1024);
        
        if (oversizedFiles.length > 0) {
            const fileList = oversizedFiles.map(f => 
                `<strong>${f.name}</strong> (${formatFileSize(f.size)})`
            ).join('<br>');
            
            showModal(
                `The following files exceed the 10MB limit and cannot be uploaded:<br><br>${fileList}<br><br>Please select smaller files or compress them before uploading.`,
                'error',
                'File Size Limit Exceeded'
            );
            
            // Clear the input
            this.value = "";
            return;
        }
        
        // Check file count limit
        if (selectedFiles.length + validFiles.length > 10) {
            const allowedCount = 10 - selectedFiles.length;
            showModal(
                `Maximum 10 files allowed. Only the first ${allowedCount} files will be added.`,
                'warning',
                'File Limit Reached'
            );
            validFiles.splice(allowedCount);
        }
        
        // Add only valid files
        selectedFiles = [...selectedFiles, ...validFiles];
        
        this.value = "";
        renderPreviews();
    });

    function renderPreviews() {
        previewContainer.innerHTML = "";
        
        selectedFiles.forEach((file, index) => {
            const fileBox = document.createElement("div");
            fileBox.className = "file-box";

            const removeBtn = document.createElement("span");
            removeBtn.innerHTML = "×";
            removeBtn.className = "remove-btn";
            removeBtn.onclick = function(e) {
                e.preventDefault();
                e.stopPropagation();
                selectedFiles.splice(index, 1);
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
            
            // File size badge
            const sizeBadge = document.createElement("div");
            sizeBadge.className = "file-size-badge";
            sizeBadge.textContent = formatFileSize(file.size);
            fileBox.appendChild(sizeBadge);

            previewContainer.appendChild(fileBox);
        });

        updateFileCount();
    }

    function updateFileCount() {
        const fileCount = selectedFiles.length;
        let countText = "";
        
        if (fileCount > 0) {
            countText = `${fileCount} file(s) selected`;
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

        // Final file size validation
        const totalSize = selectedFiles.reduce((acc, f) => acc + f.size, 0);
        if (totalSize > 25 * 1024 * 1024) {
            showModal(
                `Total file size is ${formatFileSize(totalSize)}, which exceeds the 25MB limit.<br><br>Please remove some files to continue.`,
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
            
            selectedFiles.forEach(file => {
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
