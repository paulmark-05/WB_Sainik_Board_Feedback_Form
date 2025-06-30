// ========== FILE PREVIEW FUNCTIONALITY ==========
let filesArray = [];

const uploadInput = document.getElementById('upload');
const previewContainer = document.getElementById('file-preview');

// Handle file selection
uploadInput.addEventListener('change', handleFileUpload);

function handleFileUpload(e) {
  const selectedFiles = Array.from(e.target.files);
  filesArray.push(...selectedFiles);
  displayFiles();
}

// Display previews in rows (max 5 per row)
function displayFiles() {
  previewContainer.innerHTML = '';

  filesArray.forEach((file, index) => {
    const preview = document.createElement('div');
    preview.className = 'file-preview';

    const deleteBtn = document.createElement('span');
    deleteBtn.className = 'delete-btn';
    deleteBtn.innerHTML = '&times;';
    deleteBtn.onclick = () => {
      filesArray.splice(index, 1);
      displayFiles();
    };

    if (file.type.startsWith('image/')) {
      const img = document.createElement('img');
      img.src = URL.createObjectURL(file);
      img.alt = file.name;
      img.className = 'thumb';
      preview.appendChild(img);
    } else {
      const icon = document.createElement('div');
      icon.className = 'file-icon';
      icon.innerText = file.name.split('.').pop().toUpperCase();
      const name = document.createElement('p');
      name.textContent = file.name;
      name.className = 'file-name';
      preview.appendChild(icon);
      preview.appendChild(name);
    }

    preview.appendChild(deleteBtn);
    previewContainer.appendChild(preview);
  });
}

// ========== FORM SUBMISSION ==========
document.querySelector('form').addEventListener('submit', async function (e) {
  e.preventDefault();

  const formData = new FormData(this);
  filesArray.forEach(file => formData.append('files', file));

  try {
    const res = await fetch('/submit', {
      method: 'POST',
      body: formData
    });

    const result = await res.json();

    if (res.ok) {
      alert(result.message || "Form submitted successfully!");
      this.reset();
      filesArray = [];
      displayFiles();
    } else {
      alert(result.error || "Failed to submit form");
    }
  } catch (err) {
    console.error('Form submission error:', err);
    alert("Failed to submit form");
  }
});

