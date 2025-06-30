const fileInput = document.getElementById('upload');
const previewContainer = document.getElementById('file-preview');
let filesArray = [];

fileInput.addEventListener('change', () => {
  filesArray = Array.from(fileInput.files);
  displayPreviews();
});

function displayPreviews() {
  previewContainer.innerHTML = '';

  filesArray.forEach((file, index) => {
    const fileDiv = document.createElement('div');
    fileDiv.classList.add('file-thumbnail');

    const removeBtn = document.createElement('span');
    removeBtn.innerHTML = '❌';
    removeBtn.className = 'remove-btn';
    removeBtn.onclick = () => {
      filesArray.splice(index, 1);
      displayPreviews();
    };

    const fileName = document.createElement('p');
    fileName.textContent = file.name;

    if (file.type.startsWith('image/')) {
      const img = document.createElement('img');
      img.src = URL.createObjectURL(file);
      img.onload = () => URL.revokeObjectURL(img.src);
      img.classList.add('thumbnail-img');
      fileDiv.appendChild(img);
    } else {
      const icon = document.createElement('div');
      icon.classList.add('file-icon');
      icon.textContent = file.name.split('.').pop().toUpperCase(); // e.g., PDF
      fileDiv.appendChild(icon);
    }

    fileDiv.appendChild(removeBtn);
    fileDiv.appendChild(fileName);
    previewContainer.appendChild(fileDiv);
  });

  // Update file input with filtered files
  const dataTransfer = new DataTransfer();
  filesArray.forEach(file => dataTransfer.items.add(file));
  fileInput.files = dataTransfer.files;
}
