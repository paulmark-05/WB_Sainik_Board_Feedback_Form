// Prevent multiple submissions
let isSubmitting = false;
let selectedFiles = [];

document.addEventListener("DOMContentLoaded", function() {
    const uploadInput = document.getElementById("upload");
    const previewContainer = document.getElementById("file-preview");
    const form = document.getElementById("feedbackForm");
    const submitBtn = document.getElementById("submitBtn");

    // File upload handling with enhanced validation feedback
    uploadInput.addEventListener("change", function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const newFiles = Array.from(this.files);
        const existingNames = selectedFiles.map(file => file.name);
        const uniqueFiles = newFiles.filter(file => !existingNames.includes(file.name));
        
        selectedFiles = [...selectedFiles, ...uniqueFiles].slice(0, 10);
        this.value = "";
        
        // Validate files immediately after selection
        validateFilesAndRender();
    });

    // Enhanced file validation with specific file identification
    function validateFilesAndRender() {
        selectedFiles.forEach((file, index) => {
            file.isValid = true;
            file.errorMessages = [];
            
            // Check file size (10MB limit)
            if (file.size > 10 * 1024 * 1024) {
                file.isValid = false;
                file.errorMessages.push(`File exceeds 10MB limit (${Math.round(file.size / (1024 * 1024))}MB)`);
            }
            
            // Optional: Check file type restrictions
            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
            if (!allowedTypes.includes(file.type) && file.type !== '') {
                // Uncomment these lines if you want to restrict file types:
                // file.isValid = false;
                // file.errorMessages.push('File type not supported');
            }
        });
        
        renderPreviews();
    }

    function renderPreviews() {
        previewContainer.innerHTML = "";
        
        selectedFiles.forEach((file, index) => {
            const fileBox = document.createElement("div");
            fileBox.className = "file-box";
            
            // Add error styling if file is invalid
            if (!file.isValid) {
                fileBox.classList.add("file-error");
            }

            const removeBtn = document.createElement("span");
            removeBtn.innerHTML = "×";
            removeBtn.className = "remove-btn";
            removeBtn.onclick = function(e) {
                e.preventDefault();
                e.stopPropagation();
                selectedFiles.splice(index, 1);
                validateFilesAndRender();
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
            }

            // Add file name
            const fileName = document.createElement("div");
            fileName.className = "file-name";
            fileName.textContent = file.name;
            fileBox.appendChild(fileName);
            
            // Add error messages if file is invalid
            if (!file.isValid && file.errorMessages.length > 0) {
                const errorDiv = document.createElement("div");
                errorDiv.className = "file-error-message";
                errorDiv.innerHTML = file.errorMessages.join('<br>');
                fileBox.appendChild(errorDiv);
            }

            previewContainer.appendChild(fileBox);
        });

        updateFileCount();
    }

    function updateFileCount() {
        const validFiles = selectedFiles.filter(file => file.isValid).length;
        const invalidFiles = selectedFiles.filter(file => !file.isValid).length;
        
        let countText = '';
        if (validFiles > 0) {
            countText += `${validFiles} valid file(s)`;
        }
        if (invalidFiles > 0) {
            countText += (countText ? ', ' : '') + `${invalidFiles} invalid file(s)`;
        }
        
        document.getElementById("upload-count").textContent = countText;
        document.getElementById("upload-count").style.color = invalidFiles > 0 ? '#dc3545' : '#666';
    }

    // Enhanced form submission with specific file validation
    form.addEventListener("submit", async function(e) {
        e.preventDefault();
        e.stopPropagation();

        if (isSubmitting) {
            return;
        }

        // Enhanced validation with specific file details
        const invalidFiles = selectedFiles.filter(file => !file.isValid);
        if (invalidFiles.length > 0) {
            const fileNames = invalidFiles.map(file => `"${file.name}"`).join('\n- ');
            alert(`Please fix the following files before submitting:\n\n- ${fileNames}\n\nLook for files highlighted in red in the preview area.`);
            return;
        }

        const totalSize = selectedFiles.reduce((acc, f) => acc + f.size, 0);
        if (totalSize > 25 * 1024 * 1024) {
            alert("Total file size exceeds 25 MB. Please remove some files.");
            return;
        }

        // Set submitting state
        isSubmitting = true;
        submitBtn.disabled = true;
        submitBtn.textContent = "Submitting...";

        try {
            const formData = new FormData();
            
            // Append form fields (excluding files)
            const formFields = new FormData(form);
            for (let [key, value] of formFields.entries()) {
                if (key !== 'upload') {
                    formData.append(key, value);
                }
            }
            
            // Append only valid files
            const validFiles = selectedFiles.filter(file => file.isValid);
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
                alert(result.message || "Form submitted successfully!");
                form.reset();
                selectedFiles = [];
                renderPreviews();
            } else {
                throw new Error(result.error || "Failed to submit form");
            }

        } catch (error) {
            console.error("Submission error:", error);
            alert("Form submission failed: " + error.message + ". Please try again.");
        } finally {
            // Reset submission state
            isSubmitting = false;
            submitBtn.disabled = false;
            submitBtn.textContent = "SUBMIT";
        }
    });
});
