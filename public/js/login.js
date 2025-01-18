async function handleLogin(event) {
  event.preventDefault();

  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  const messageDiv = document.getElementById("message");

  try {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (response.ok) {
      messageDiv.textContent = "Login successful!";
      messageDiv.style.color = "green";
      window.location.href = "/";
    } else {
      messageDiv.textContent = data.message;
      messageDiv.style.color = "red";
    }
  } catch (error) {
    messageDiv.textContent = "An error occurred. Please try again.";
    messageDiv.style.color = "red";
  }

  return false;
}
