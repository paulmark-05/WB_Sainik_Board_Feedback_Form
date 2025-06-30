let filesArray = [];
const uploadInput = document.getElementById('upload');
const previewContainer = document.getElementById('file-preview');

uploadInput.addEventListener('change', handleFileUpload);

function handleFileUpload(e) {
  const selectedFiles = Array.from(e.target.files);
  filesArray.push(...selectedFiles);
  displayFiles();
}

function displayFiles() {
  previewContainer.innerHTML = '';
  filesArray.forEach((file, index) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'file-preview';

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '❌';
    deleteBtn.onclick = () => {
      filesArray.splice(index, 1);
      displayFiles();
    };

    if (file.type.startsWith('image/')) {
      const img = document.createElement('img');
      img.src = URL.createObjectURL(file);
      img.className = 'thumb';
      wrapper.appendChild(img);
    } else {
      const icon = document.createElement('div');
      icon.className = 'file-icon';
      icon.textContent = file.name.split('.').pop().toUpperCase();
      wrapper.appendChild(icon);
    }

    wrapper.appendChild(deleteBtn);
    previewContainer.appendChild(wrapper);
  });
}

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
      alert(result.message || 'Form submitted successfully!');
      this.reset();
      filesArray = [];
      displayFiles();
    } else {
      alert(result.error || 'Submission failed');
    }
  } catch (err) {
    console.error('Submit error:', err);
    alert('Submission failed!');
  }
});

