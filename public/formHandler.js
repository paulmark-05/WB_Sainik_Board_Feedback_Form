// public/formHandler.js

document.addEventListener('DOMContentLoaded', () => {
  // Helpers
  const $ = s => document.querySelector(s);
  const $$ = s => document.querySelectorAll(s);

  // Highlight missing inputs
  function highlightMissing() {
    ['#esmName','#rank','#branch','#phone'].forEach(sel=>{
      const el = $(sel);
      if (!el.value.trim()) el.classList.add('input-error');
      else el.classList.remove('input-error');
    });
  }

  // Show modal
  function showModal(html, footerHTML) {
    const modal = $('#customModal');
    $('#modalMessage').innerHTML = html;
    $('.modal-footer').innerHTML = footerHTML;
    modal.classList.add('active');
  }

  function closeModal() {
    $('#customModal').classList.remove('active');
  }

  // Help dialog
  $('#helpBtn').addEventListener('click', () => {
    showModal(
      `<ul style="text-align:left">
         <li>Name, Relationship, Rank, Phone & Branch are required.</li>
         <li>Up to 10 files, each ≤ 10 MB.</li>
         <li>Remove file: click ×. Oversized: click to compress.</li>
         <li>Check consent box to enable SUBMIT.</li>
       </ul>`,
      `<button class="modal-btn-primary" onclick="closeModal()">OK</button>`
    );
  });

  // Form submit
  $('#feedbackForm').addEventListener('submit', e => {
    e.preventDefault();
    highlightMissing();

    // Relationship
    if (![...$$('input[name="relationship"]')].some(r=>r.checked)) {
      $('#relationshipLabel').classList.add('label-error');
      return showModal(
        `<p>Please select your relationship.</p>`,
        `<button class="modal-btn-primary" onclick="closeModal()">OK</button>`
      );
    }

    // Phone
    const phone = $('#phone').value.trim();
    if (!/^[6-9]\d{9}$/.test(phone)) {
      $('#phone').classList.add('input-error');
      return showModal(
        `<p>Please enter a valid 10-digit mobile number.</p>`,
        `<button class="modal-btn-primary" onclick="closeModal()">OK</button>`
      );
    }

    // Files
    const overs = selectedFiles.filter(f=>f.size>10*1024*1024).length;
    if (overs) {
      return showModal(
        `<p>${overs} file(s) exceed 10MB. Please compress or remove them.</p>`,
        `<button class="modal-btn-primary" onclick="closeModal()">OK</button>`
      );
    }

    // Final confirmation
    showModal(
      `<p>If all information is correct, click Confirm to submit.</p>`,
      `<button class="modal-btn-secondary" onclick="closeModal()">Cancel</button>
       <button class="modal-btn-primary" id="confirmSubmitBtn">Confirm</button>`
    );

    // When Confirm clicked, actually submit
    $('#confirmSubmitBtn').addEventListener('click', () => {
      closeModal();
      document.getElementById('submittingOverlay').classList.remove('hidden');
      // build FormData and fetch() here...
      // upon success hide overlay and reset form.
    }, { once: true });
  });

  // Your existing file preview, compression, and overlay logic goes below...
});
