// formHandler.js

// Prevent multiple submissions
let isSubmitting = false;
let selectedFiles = [];
let currentCompressFileIndex = -1;

// Show modal / closeModal unchanged from existing code
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
    currentCompressFileIndex = -1;
}

// Utility
function formatFileSize(bytes) {
    if (bytes === 0) return '0 KB';
    const k = 1024;
    if (bytes < k) return bytes + ' bytes';
    if (bytes < k * k) return (bytes / k).toFixed(2) + ' KB';
    if (bytes < k * k * k) return (bytes / (k * k)).toFixed(2) + ' MB';
    return (bytes / (k * k * k)).toFixed(2) + ' GB';
}

// Relationship validation & highlighting
function validateRelationship() {
    const radios = document.getElementsByName('relationship');
    const label = document.getElementById('relationshipLabel');
    for (const r of radios) {
        if (r.checked) {
            label.classList.remove('required-error');
            return true;
        }
    }
    // none checked
    label.classList.add('required-error');
    label.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return false;
}

// Setup relationship toggles (unchanged)
function setupRelationshipToggle() {
    const relationshipRadios = document.querySelectorAll('input[name="relationship"]');
    relationshipRadios.forEach(radio => {
        let isSelected = false;
        radio.addEventListener('click', function() {
            if (isSelected && this.checked) {
                this.checked = false;
                isSelected = false;
            } else {
                relationshipRadios.forEach(r => r.parentElement.isSelected = false);
                this.checked = true;
                isSelected = true;
            }
        });
        radio.addEventListener('change', function() {
            if (this.checked) {
                relationshipRadios.forEach(r => { if (r !== this) r.parentElement.isSelected = false; });
                isSelected = true;
            }
        });
    });
}

// Other setup functions (phone validation, file preview, compression dialogs, etc.)
// ... (omit for brevity; include your existing code here) ...

// MAIN
document.addEventListener("DOMContentLoaded", function() {
    // setup toggles & validation
    setupRelationshipToggle();
    // other initializations...
    
    // Form submission
    const form = document.getElementById('feedbackForm');
    const submitBtn = document.getElementById('submitBtn');
    form.addEventListener('submit', async function(e) {
        // Validate Relationship
        if (!validateRelationship()) {
            e.preventDefault();
            return;
        }
        // existing submission-blocking logic (oversized files, consent, phone...)
        // if any check fails: e.preventDefault() & showModal(...)
        // else proceed with fetch("/submit", ...)
    });
});
