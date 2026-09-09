document.addEventListener("DOMContentLoaded", () => {
  // Already signed in? Skip straight to the dashboard.
  if (Auth.getToken()) {
    window.location.href = "dashboard.html";
    return;
  }

  const form = document.getElementById("login-form");
  const note = document.getElementById("form-note");
  const submitBtn = document.getElementById("submit-btn");

  function showNote(message, isError = true) {
    note.textContent = message;
    note.classList.add("visible");
    note.classList.toggle("success", !isError);
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    note.classList.remove("visible");

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    submitBtn.disabled = true;
    submitBtn.textContent = "Signing in…";

    try {
      const data = await apiRequest("/auth/login", {
        method: "POST",
        auth: false,
        body: { email, password },
      });
      Auth.setSession(data.token, data.user);
      window.location.href = "dashboard.html";
    } catch (err) {
      showNote(err.message);
      submitBtn.disabled = false;
      submitBtn.textContent = "Sign in";
    }
  });
});
