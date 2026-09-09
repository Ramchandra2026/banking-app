document.addEventListener("DOMContentLoaded", () => {
  if (Auth.getToken()) {
    window.location.href = "dashboard.html";
    return;
  }

  const form = document.getElementById("register-form");
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

    const fullName = document.getElementById("fullName").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    if (password !== confirmPassword) {
      showNote("Passwords do not match.");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Creating account…";

    try {
      const data = await apiRequest("/auth/register", {
        method: "POST",
        auth: false,
        body: { fullName, email, password },
      });
      Auth.setSession(data.token, data.user);
      window.location.href = "dashboard.html";
    } catch (err) {
      showNote(err.message);
      submitBtn.disabled = false;
      submitBtn.textContent = "Create account";
    }
  });
});
