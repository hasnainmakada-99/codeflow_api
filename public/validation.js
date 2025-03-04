function validateForm() {
  const title = document.getElementById("title").value;
  const url = document.getElementById("url").value;
  const description = document.getElementById("description").value;
  const thumbnail = document.getElementById("thumbnail").value;
  const publishedDate = document.getElementById("publishedDate").value;
  const channelName = document.getElementById("channelName").value;
  const toolRelatedTo = document.getElementById("toolRelatedTo").value;
  const isPaid = document.getElementById("isPaid").checked;
  const price = document.getElementById("price").value;

  // Check required fields
  if (
    !title ||
    !url ||
    !description ||
    !thumbnail ||
    !publishedDate ||
    !channelName ||
    !toolRelatedTo
  ) {
    showError("All fields are required");
    return false;
  }

  // Check URL format
  const urlRegex = /^(ftp|http|https):\/\/[^ "]+$/;
  if (!urlRegex.test(url) || !urlRegex.test(thumbnail)) {
    showError("Please enter valid URLs");
    return false;
  }

  // Check date is not in future
  if (new Date(publishedDate) > new Date()) {
    showError("Published date cannot be in the future");
    return false;
  }

  // Check price if it's a paid resource
  if (isPaid) {
    if (!price || isNaN(price) || parseFloat(price) < 0) {
      showError("Please enter a valid price for the paid resource");
      return false;
    }
  }

  return true;
}

function showError(message) {
  const messageDiv = document.getElementById("message");
  messageDiv.textContent = message;
  messageDiv.style.display = "block";
  messageDiv.style.backgroundColor = "#f8d7da";
  messageDiv.style.color = "#721c24";
}

// Attach validation to form submit
document.addEventListener("DOMContentLoaded", function () {
  const form = document.querySelector("form");
  if (form) {
    form.addEventListener("submit", function (event) {
      if (!validateForm()) {
        event.preventDefault();
      }
    });
  }
});
