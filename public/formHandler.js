// Prevent multiple submissions
let isSubmitting = false;
let selectedFiles = [];

// Custom Modal Functions
function showModal(message, type = 'info', title = 'Notification') {
    const modal = document.getElementById('customModal');
    const container = modal.querySelector('.modal-container');
    const titleElement = modal.querySelector('.modal-title');
    const messageElement = document.getElementById('modalMessage');
    
    // Remove existing type classes
    container.classList.remove('success', 'error', 'warning');
    
    // Add appropriate type class
    if (type) {
        container.classList.add(type);
    }
    
    // Set content
    titleElement.textContent = title;
    messageElement.innerHTML = message;
    
    // Show modal
    modal.classList.add('active');
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    const modal = document.getElementById('customModal');
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
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

    // File upload handling with validation and highlighting
    uploadInput.addEventListener("change", function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const newFiles = Array.from(this.files);
        const existingNames = selectedFiles.map(file => file.name);
        const uniqueFiles = newFiles.filter(file => !existingNames.includes(file.name));
        
        // Validate each file and mark invalid ones
        const validatedFiles = uniqueFiles.map(file => {
            const isValid = file.size <= 10 * 1024 * 1024; // 10MB limit
            return {
                ...file,
                isValid: isValid,
                errorMessage: !isValid ? `File exceeds 10MB limit (${(file.size / 1024 / 1024).toFixed(1)}MB)` : null
            };
        });
        
        // Check for oversized files and show specific error
        const oversizedFiles = validatedFiles.filter(f => !f.isValid);
        if (oversizedFiles.length > 0) {
            const fileList = oversizedFiles.map(f => `<strong>${f.name}</strong> (${(f.size / 1024 / 1024).toFixed(1)}MB)`).join('<br>');
            showModal(
                `The following files exceed the 10MB limit:<br><br>${fileList}<br><br>Please select smaller files.`,
                'error',
                'File Size Limit Exceeded'
            );
        }
        
        selectedFiles = [...selectedFiles, ...validatedFiles].slice(0, 10);
        
        if (selectedFiles.length === 10 && validatedFiles.length > 0) {
            showModal(
                'Maximum 10 files allowed. Additional files were not added.',
                'warning',
                'File Limit Reached'
            );
        }
        
        this.value = "";
        renderPreviews();
    });

    function renderPreviews() {
        previewContainer.innerHTML = "";
        
        selectedFiles.forEach((file, index) => {
            const fileBox = document.createElement("div");
            fileBox.className = "file-box";
            
            // Add invalid class if file is invalid
            if (!file.isValid) {
                fileBox.classList.add('file-invalid');
            }

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
            
            // Add error message for invalid files
            if (!file.isValid && file.errorMessage) {
                const errorBadge = document.createElement("div");
                errorBadge.className = "file-error-badge";
                errorBadge.textContent = file.errorMessage;
                fileBox.appendChild(errorBadge);
            }

            previewContainer.appendChild(fileBox);
        });

        updateFileCount();
    }

    function updateFileCount() {
        const validFiles = selectedFiles.filter(f => f.isValid).length;
        const invalidFiles = selectedFiles.filter(f => !f.isValid).length;
        
        let countText = "";
        if (validFiles > 0 && invalidFiles > 0) {
            countText = `${validFiles} valid file(s), ${invalidFiles} invalid file(s)`;
        } else if (validFiles > 0) {
            countText = `${validFiles} file(s) selected`;
        } else if (invalidFiles > 0) {
            countText = `${invalidFiles} invalid file(s)`;
        }
        
        document.getElementById("upload-count").textContent = countText;
    }

    // Enhanced form submission with custom modals
    form.addEventListener("submit", async function(e) {
        e.preventDefault();
        e.stopPropagation();

        if (isSubmitting) {
            return;
        }

        // Check for invalid files
        const invalidFiles = selectedFiles.filter(f => !f.isValid);
        if (invalidFiles.length > 0) {
            const fileList = invalidFiles.map(f => `<strong>${f.name}</strong>`).join(', ');
            showModal(
                `Please fix the following files: ${fileList}<br><br>Remove these files or replace them with smaller versions.`,
                'error',
                'Invalid Files Detected'
            );
            return;
        }

        // Only use valid files for submission
        const validFiles = selectedFiles.filter(f => f.isValid);

        // Validation with custom popups
        const totalSize = validFiles.reduce((acc, f) => acc + f.size, 0);
        if (totalSize > 25 * 1024 * 1024) {
            showModal(
                `Total file size is ${(totalSize / 1024 / 1024).toFixed(1)}MB, which exceeds the 25MB limit.<br><br>Please remove some files to continue.`,
                'error',
                'Total File Size Exceeded'
            );
            return;
        }

        // Set submitting state
        isSubmitting = true;
        submitBtn.disabled = true;
        submitBtn.textContent = "Submitting...";

        try {
            const formData = new FormData();
            
            // Append form fields
            const formFields = new FormData(form);
            for (let [key, value] of formFields.entries()) {
                if (key !== 'upload') {
                    formData.append(key, value);
                }
            }
            
            // Append only valid files
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
                
                // Reset form after successful submission
                setTimeout(() => {
                    form.reset();
                    selectedFiles = [];
                    renderPreviews();
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
            // Reset submission state
            isSubmitting = false;
            submitBtn.disabled = false;
            submitBtn.textContent = "SUBMIT";
        }
    });
});
