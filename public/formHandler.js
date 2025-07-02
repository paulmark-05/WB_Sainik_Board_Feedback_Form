// ============================
// 📄 formHandler.js (Frontend)
// ============================
document.addEventListener("DOMContentLoaded", () => {
  let selectedFiles = [];

  const uploadInput = document.getElementById("upload");
  const previewContainer = document.getElementById("file-preview");
  const form = document.getElementById("feedbackForm");
  const submitBtn = form.querySelector("button[type='submit']");
  const loader = document.getElementById("loader");
  const timeoutMsg = document.getElementById("timeout-msg");

  uploadInput.addEventListener("change", function () {
    const newFiles = Array.from(uploadInput.files);

    const existingNames = selectedFiles.map(file => file.name);
    const uniqueFiles = newFiles.filter(file => !existingNames.includes(file.name));

    selectedFiles = [...selectedFiles, ...uniqueFiles].slice(0, 10); // Limit to 10
    uploadInput.value = "";
    renderPreviews();
  });

  function renderPreviews() {
    previewContainer.innerHTML = "";
    const dataTransfer = new DataTransfer();

    selectedFiles.forEach((file, index) => {
      const fileBox = document.createElement("div");
      fileBox.className = "file-box";

      const removeBtn = document.createElement("span");
      removeBtn.innerHTML = "&times;";
      removeBtn.className = "remove-btn";
      removeBtn.onclick = () => {
        selectedFiles.splice(index, 1);
        renderPreviews();
        document.getElementById("upload-count").textContent = `${selectedFiles.length} file(s) selected`;
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
    document.getElementById("upload-count").textContent = `${selectedFiles.length} file(s) selected`;
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    // File size check
    const totalSize = selectedFiles.reduce((acc, f) => acc + f.size, 0);
    if (totalSize > 25 * 1024 * 1024) {
      alert("Total file size exceeds 25 MB. Please remove some files.");
      return;
    }

    if (selectedFiles.some(f => f.size > 10 * 1024 * 1024)) {
      alert("A file exceeds 10 MB limit.");
      return;
    }

    const formData = new FormData(form);
    selectedFiles.forEach(file => {
      formData.append("upload", file);
    });

    // Show loader, disable form
    loader.style.display = "block";
    timeoutMsg.style.display = "block";
    submitBtn.disabled = true;

    try {
      const res = await fetch("https://wb-sainik-board-feedback-form.onrender.com/submit", {
        method: "POST",
        body: formData
      });

      const result = await res.json();
      if (res.ok) {
        alert(result.message || "Form submitted successfully!");
        form.reset();
        selectedFiles = [];
        renderPreviews();
        document.getElementById("upload-count").textContent = "";
      } else {
        alert(result.error || "Failed to submit form");
      }
    } catch (err) {
      console.error("Submission failed:", err);
      alert("Form submission failed");
    } finally {
      loader.style.display = "none";
      timeoutMsg.style.display = "none";
      submitBtn.disabled = false;
    }
  });
});
