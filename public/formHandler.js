document.addEventListener("DOMContentLoaded", () => {
  let selectedFiles = [];

  const uploadInput = document.getElementById("upload");
  const previewContainer = document.getElementById("file-preview");
  const form = document.getElementById("feedbackForm");

  uploadInput.addEventListener("change", function () {
    const newFiles = Array.from(uploadInput.files);

    // Avoid duplicates by name
    const existingNames = selectedFiles.map(file => file.name);
    const uniqueFiles = newFiles.filter(file => !existingNames.includes(file.name));

    selectedFiles = [...selectedFiles, ...uniqueFiles].slice(0, 10); // limit 10
    uploadInput.value = ""; // Clear native input (doesn't remove selectedFiles)
    renderPreviews();
  });

  function renderPreviews() {
    previewContainer.innerHTML = "";
    const dataTransfer = new DataTransfer();

    selectedFiles.forEach((file, index) => {
      const fileBox = document.createElement("div");
      fileBox.className = "file-box";

      const removeBtn = document.createElement("button");
      removeBtn.textContent = "×";
      removeBtn.className = "remove-btn";
      removeBtn.onclick = () => {
        selectedFiles.splice(index, 1);
        renderPreviews();
      };

      fileBox.appendChild(removeBtn);

      if (file.type.startsWith("image/")) {
        const img = document.createElement("img");
        img.src = URL.createObjectURL(file);
        img.className = "file-thumb";
        fileBox.appendChild(img);
      } else {
        const icon = document.createElement("div");
        icon.className = "file-icon";
        icon.textContent = file.name.split(".").pop().toUpperCase();
        fileBox.appendChild(icon);
      }

      const fileName = document.createElement("div");
      fileName.className = "file-name";
      fileName.textContent = file.name;
      fileBox.appendChild(fileName);

      previewContainer.appendChild(fileBox);
      dataTransfer.items.add(file);
    });

    uploadInput.files = dataTransfer.files;
  }

 form.addEventListener("submit", async function (e) {
  e.preventDefault();

  const formData = new FormData(form);
  selectedFiles.forEach(file => {
    formData.append("files", file);
  });

  try {
    const res = await fetch("/submit", {
      method: "POST",
      body: formData
    });

    const result = await res.json();
    if (res.ok) {
      alert(result.message || "Form submitted successfully!");
      form.reset();
      selectedFiles = [];
      renderPreviews();
    } else {
      alert(result.error || "Failed to submit form");
    }
  } catch (err) {
    console.error("Submission failed:", err);
    alert("Form submission failed");
  }
});
