// public/js/login.js
async function handleLogin(event) {
  event.preventDefault();
  const form = event.target;
  const messageDiv = document.getElementById("message");
  const submitButton = form.querySelector('button[type="submit"]');

  try {
    submitButton.disabled = true;
    messageDiv.textContent = "Logging in...";
    messageDiv.style.color = "blue";

    const formData = new FormData(form);
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(formData)),
    });

    const data = await response.json();

    if (response.ok) {
      messageDiv.textContent = data.message;
      messageDiv.style.color = "green";
      window.location.href = data.redirect;
    } else {
      messageDiv.textContent = data.message;
      messageDiv.style.color = "red";
    }
  } catch (error) {
    messageDiv.textContent = "An error occurred. Please try again.";
    messageDiv.style.color = "red";
  } finally {
    submitButton.disabled = false;
  }
}

// public/js/resources.js
async function handleResourceSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const submitButton = form.querySelector('button[type="submit"]');
  const messageDiv = document.getElementById("message");

  try {
    submitButton.disabled = true;
    messageDiv.textContent = "Submitting resource...";
    messageDiv.style.color = "blue";

    if (!validateForm(form)) {
      return;
    }

    const formData = new FormData(form);
    const response = await fetch("/api/resources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(formData)),
    });

    const data = await response.json();

    if (response.ok) {
      messageDiv.textContent = data.message;
      messageDiv.style.color = "green";
      form.reset();
      if (data.redirect) {
        window.location.href = data.redirect;
      }
    } else {
      messageDiv.textContent = data.message;
      messageDiv.style.color = "red";
    }
  } catch (error) {
    messageDiv.textContent = "An error occurred. Please try again.";
    messageDiv.style.color = "red";
  } finally {
    submitButton.disabled = false;
  }
}

// public/js/validation.js
function validateForm(form) {
  const title = form.title.value;
  const url = form.url.value;
  const description = form.description.value;
  const thumbnail = form.thumbnail.value;
  const publishedDate = form.publishedDate.value;
  const price = form.price.value;

  if (
    !title ||
    !url ||
    !description ||
    !thumbnail ||
    !publishedDate ||
    !price
  ) {
    showError("All fields are required.");
    return false;
  }

  const urlRegex = /^(ftp|http|https):\/\/[^ "]+$/;
  if (!urlRegex.test(url) || !urlRegex.test(thumbnail)) {
    showError("Please enter valid URLs.");
    return false;
  }

  if (new Date(publishedDate) > new Date()) {
    showError("Published date cannot be in the future.");
    return false;
  }

  if (price < 0) {
    showError("Price cannot be negative.");
    return false;
  }

  return true;
}

function showError(message) {
  const messageDiv = document.getElementById("message");
  messageDiv.textContent = message;
  messageDiv.style.color = "red";
}
