// Prevent multiple submissions
let isSubmitting = false;
let selectedFiles = [];

document.addEventListener("DOMContentLoaded", function() {
    const uploadInput = document.getElementById("upload");
    const previewContainer = document.getElementById("file-preview");
    const form = document.getElementById("feedbackForm");
    const submitBtn = document.getElementById("submitBtn");
    const loader = document.getElementById("loader");

    // File upload handling
    uploadInput.addEventListener("change", function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const newFiles = Array.from(this.files);
        const existingNames = selectedFiles.map(file => file.name);
        const uniqueFiles = newFiles.filter(file => !existingNames.includes(file.name));
        
        selectedFiles = [...selectedFiles, ...uniqueFiles].slice(0, 10);
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

            previewContainer.appendChild(fileBox);
        });

        updateFileCount();
    }

    function updateFileCount() {
        document.getElementById("upload-count").textContent = 
            selectedFiles.length > 0 ? `${selectedFiles.length} file(s) selected` : "";
    }

    // Enhanced form submission with proper error handling
    form.addEventListener("submit", async function(e) {
        e.preventDefault();
        e.stopPropagation();

        if (isSubmitting) {
            return;
        }

        // Validation
        const totalSize = selectedFiles.reduce((acc, f) => acc + f.size, 0);
        if (totalSize > 25 * 1024 * 1024) {
            alert("Total file size exceeds 25 MB. Please remove some files.");
            return;
        }

        if (selectedFiles.some(f => f.size > 10 * 1024 * 1024)) {
            alert("A file exceeds 10 MB limit.");
            return;
        }

        // Set submitting state
        isSubmitting = true;
        submitBtn.disabled = true;
        submitBtn.textContent = "Submitting...";
        // Remove the separate loader - everything shows in button now

        try {
            const formData = new FormData();
            
            // Append form fields (excluding files)
            const formFields = new FormData(form);
            for (let [key, value] of formFields.entries()) {
                if (key !== 'upload') {
                    formData.append(key, value);
                }
            }
            
            // Append files separately
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
