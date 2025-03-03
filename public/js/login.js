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
    const loginData = Object.fromEntries(formData);

    console.log("Login attempt initiated");

    const response = await fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // Important for cookies
      body: JSON.stringify(loginData),
    });

    console.log("Response status:", response.status);

    const data = await response.json();

    if (response.ok) {
      messageDiv.textContent = data.message || "Login successful!";
      messageDiv.style.color = "green";

      console.log("Login successful, redirecting to:", data.redirect);

      // Force page reload and redirect
      if (data.redirect) {
        window.location.href = data.redirect;
      }
    } else {
      messageDiv.textContent = data.message || "Login failed";
      messageDiv.style.color = "red";
    }
  } catch (error) {
    console.error("Login error:", error);
    messageDiv.textContent = "An error occurred. Please try again.";
    messageDiv.style.color = "red";
  } finally {
    submitButton.disabled = false;
  }
}
