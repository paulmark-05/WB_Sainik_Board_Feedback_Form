document.addEventListener("DOMContentLoaded", () => {
  let selectedFiles = [];

  const uploadInput = document.getElementById("upload");
  const previewContainer = document.getElementById("file-preview");
  const form = document.getElementById("feedbackForm");

  uploadInput.addEventListener("change", function () {
    const newFiles = Array.from(uploadInput.files);

    // Avoid duplicates by file.name
    const existingNames = selectedFiles.map(file => file.name);
    const uniqueFiles = newFiles.filter(file => !existingNames.includes(file.name));

    selectedFiles = [...selectedFiles, ...uniqueFiles].slice(0, 10); // Limit to 10 files
    uploadInput.value = ""; // Clear native file input (doesn't clear selectedFiles)
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

    // Disable submit button
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerText = "Submitting...";

    const formData = new FormData(form);

    // ✅ Send visible branch name, not just option value
    const branchSelect = form.branch;
    const branchLabel = branchSelect.options[branchSelect.selectedIndex].text;
    formData.set("branch", branchLabel);

    selectedFiles.forEach(file => {
      formData.append("upload", file); // 'upload' must match the name used by multer in backend
    });

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
      // Re-enable submit button
      submitBtn.disabled = false;
      submitBtn.innerText = "Submit";
    }
  });
});
