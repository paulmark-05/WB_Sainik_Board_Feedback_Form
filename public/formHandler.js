document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("feedbackForm");
  const submitBtn = form.querySelector("button[type='submit']");
  const overlay = document.getElementById("submittingOverlay");

  // Phone & email validation
  const phoneInput = document.getElementById("phone");
  const emailInput = document.getElementById("email");

  function validatePhone(phone) {
    return /^[6-9]\d{9}$/.test(phone.trim());
  }

  function validateEmail(email) {
    return /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(email.trim());
  }

  phoneInput?.addEventListener("input", () => {
    const phoneError = document.getElementById("phone-error") || createError(phoneInput, "phone-error");
    if (phoneInput.value === "") {
      phoneError.style.display = "none";
    } else if (!validatePhone(phoneInput.value)) {
      phoneError.textContent = "Enter a valid 10-digit mobile number.";
      phoneError.style.display = "block";
    } else {
      phoneError.style.display = "none";
    }
  });

  emailInput?.addEventListener("input", () => {
    const emailError = document.getElementById("email-error") || createError(emailInput, "email-error");
    if (emailInput.value === "") {
      emailError.style.display = "none";
    } else if (!validateEmail(emailInput.value)) {
      emailError.textContent = "Enter a valid email (e.g. abc@example.com)";
      emailError.style.display = "block";
    } else {
      emailError.style.display = "none";
    }
  });

  function createError(inputEl, id) {
    const span = document.createElement("span");
    span.id = id;
    span.className = "error-message";
    span.style.color = "red";
    span.style.display = "none";
    inputEl.insertAdjacentElement("afterend", span);
    return span;
  }

  // Red highlight on empty required fields
  function highlightMissingFields() {
    let hasError = false;
    const required = form.querySelectorAll("[required]");
    required.forEach((field) => {
      if (!field.value.trim()) {
        field.classList.add("input-error");
        hasError = true;
      } else {
        field.classList.remove("input-error");
      }
    });
    return hasError;
  }

  // Show/hide submit overlay
  function toggleOverlay(show) {
    if (overlay) overlay.style.display = show ? "flex" : "none";
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const consent = document.getElementById("consentCheckbox");
    if (consent && !consent.checked) {
      alert("Please agree to the terms before submitting.");
      return;
    }

    const hasMissing = highlightMissingFields();
    if (hasMissing) {
      alert("Please fill all required fields marked in red.");
      return;
    }

    const phoneValid = validatePhone(phoneInput?.value || "");
    if (!phoneValid) {
      alert("Please enter a valid 10-digit phone number.");
      phoneInput.focus();
      return;
    }

    const emailValid = emailInput?.value ? validateEmail(emailInput.value) : true;
    if (!emailValid) {
      alert("Please enter a valid email.");
      emailInput.focus();
      return;
    }

    toggleOverlay(true);
    const formData = new FormData(form);

    try {
      const res = await fetch("/submit", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (data.success) {
        alert("Form submitted successfully!");
        form.reset();
      } else {
        alert(data.error || "Submission failed.");
      }
    } catch (err) {
      alert("Something went wrong while submitting.");
      console.error(err);
    } finally {
      toggleOverlay(false);
    }
  });

  // Remove red border as user types
  form.querySelectorAll("[required]").forEach((field) => {
    field.addEventListener("input", () => {
      if (field.value.trim()) {
        field.classList.remove("input-error");
      }
    });
  });
});
