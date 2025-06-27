document.querySelector('form').addEventListener('submit', async function (e) {
  e.preventDefault();

  const formData = new FormData(this);
  const plainData = {};
  formData.forEach((value, key) => {
    plainData[key] = value;
  });

  try {
    const res = await fetch('/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(plainData)
    });

    const result = await res.json();
    alert(result.message);
    this.reset();
  } catch (err) {
    alert("Failed to submit form");
    console.error(err);
  }
});
