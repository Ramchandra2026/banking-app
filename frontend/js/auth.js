document.addEventListener("DOMContentLoaded", () => {
  if (Auth.getToken()) {
    window.location.href = "dashboard.html";
    return;
  }

  const $ = (id) => document.getElementById(id);

  function showSection(sectionId) {
    ["login-section", "register-section", "forgot-section"].forEach((id) => {
      const section = $(id);
      if (section) section.classList.toggle("auth-hidden", id !== sectionId);
    });
  }

  window.showLogin = function () {
    showSection("login-section");
  };

  window.showRegister = function () {
    showSection("register-section");
    resetRegistrationOTP();
  };

  window.showForgotPassword = function () {
    showSection("forgot-section");
    resetForgotPasswordFlow();
  };

  window.showForgot = function () {
    window.showForgotPassword();
  };

  window.togglePassword = function (inputId, button) {
    const input = $(inputId);
    if (!input) return;

    const showing = input.type === "password";
    input.type = showing ? "text" : "password";
    button.textContent = showing ? "Hide" : "Show";
  };

  function showMessage(elementId, message, isError = true) {
    const element = $(elementId);
    if (!element) return;

    element.textContent = message;
    element.className = "auth-message";
    element.classList.add(isError ? "error" : "success");
  }

  function clearMessage(elementId) {
    const element = $(elementId);
    if (!element) return;
    element.textContent = "";
    element.className = "auth-message";
  }

  function setButtonBusy(button, busyText, busy = true) {
    if (!button) return;
    button.disabled = busy;
    if (busy && busyText) button.textContent = busyText;
  }

  // =====================================================
  // LOGIN
  // =====================================================

  const loginForm = $("login-form");

  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearMessage("login-message");

      const email = $("login-email").value.trim().toLowerCase();
      const password = $("login-password").value;
      const submitBtn = loginForm.querySelector(".auth-submit-btn");

      if (!email || !password) {
        showMessage("login-message", "Email and password are required.");
        return;
      }

      setButtonBusy(submitBtn, "Signing in…");

      try {
        const data = await apiRequest("/auth/login", {
          method: "POST",
          auth: false,
          body: { email, password },
        });

        Auth.setSession(data.token, data.user);
        showMessage("login-message", "Login successful. Redirecting…", false);

        setTimeout(() => {
          window.location.href = "dashboard.html";
        }, 500);
      } catch (err) {
        showMessage("login-message", err.message || "Unable to sign in.");
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = "Sign In";
        }
      }
    });
  }

  // =====================================================
  // REGISTRATION + INLINE OTP
  // =====================================================

  const registerForm = $("register-form");
  const registerSubmitBtn = registerForm
    ? registerForm.querySelector(".auth-submit-btn")
    : null;
  const registerOtpPanel = $("register-otp-panel");
  const verifyRegisterOtpBtn = $("verify-register-otp");
  const resendRegisterOtpBtn = $("resend-register-otp");

  let registrationOTP = null;

  function resetRegistrationOTP() {
    registrationOTP = null;
    if (registerOtpPanel) registerOtpPanel.classList.add("auth-hidden");
    if (registerSubmitBtn) registerSubmitBtn.classList.remove("auth-hidden");
    if ($("register-otp")) $("register-otp").value = "";
    if ($("register-otp-demo")) $("register-otp-demo").textContent = "";
    if ($("register-otp-recipient")) $("register-otp-recipient").textContent = "";
    sessionStorage.removeItem("pendingRegistration");
  }

  async function sendRegistrationOTP({ showPanel = true } = {}) {
    const mobile = $("register-mobile").value.trim();
    const cleanedMobile = mobile.replace(/\D/g, "").slice(-10);

    if (!/^[6-9]\d{9}$/.test(cleanedMobile)) {
      showMessage("register-message", "Please enter a valid 10-digit mobile number.");
      return false;
    }

    try {
      const otpData = await apiRequest("/auth/send-otp", {
        method: "POST",
        auth: false,
        body: { mobile: cleanedMobile },
      });

      registrationOTP = otpData.demoOtp;

      if (showPanel && registerOtpPanel) {
        registerOtpPanel.classList.remove("auth-hidden");
        $("register-otp-recipient").textContent = `OTP sent to ${cleanedMobile}.`;
        $("register-otp-demo").textContent = `Demo OTP: ${otpData.demoOtp}`;
        if (registerSubmitBtn) registerSubmitBtn.classList.add("auth-hidden");
        $("register-otp").focus();
      }

      return true;
    } catch (err) {
      showMessage("register-message", err.message || "Unable to send OTP.");
      return false;
    }
  }

  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearMessage("register-message");

      const name = $("register-name").value.trim();
      const email = $("register-email").value.trim().toLowerCase();
      const mobile = $("register-mobile").value.trim();
      const password = $("register-password").value;
      const confirmPassword = $("register-confirm-password").value;

      if (!name || !email || !mobile || !password || !confirmPassword) {
        showMessage("register-message", "Please fill in all fields.");
        return;
      }

      if (password.length < 6) {
        showMessage("register-message", "Password must contain at least 6 characters.");
        return;
      }

      if (password !== confirmPassword) {
        showMessage("register-message", "Passwords do not match.");
        return;
      }

      const cleanedMobile = mobile.replace(/\D/g, "").slice(-10);

      if (!/^[6-9]\d{9}$/.test(cleanedMobile)) {
        showMessage("register-message", "Please enter a valid 10-digit mobile number.");
        return;
      }

      const submitBtn = registerForm.querySelector(".auth-submit-btn");
      setButtonBusy(submitBtn, "Sending OTP…");

      try {
        sessionStorage.setItem(
          "pendingRegistration",
          JSON.stringify({
            name,
            email,
            mobile: cleanedMobile,
            password,
          })
        );

        const sent = await sendRegistrationOTP();
        if (!sent) {
          sessionStorage.removeItem("pendingRegistration");
          return;
        }

        showMessage(
          "register-message",
          "OTP sent. Enter the code below to verify your mobile number.",
          false
        );
      } catch (err) {
        showMessage("register-message", err.message || "Unable to start registration.");
        sessionStorage.removeItem("pendingRegistration");
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = "Create Account";
        }
      }
    });
  }

  if (resendRegisterOtpBtn) {
    resendRegisterOtpBtn.addEventListener("click", async () => {
      resendRegisterOtpBtn.disabled = true;
      resendRegisterOtpBtn.textContent = "Sending…";
      try {
        await sendRegistrationOTP();
      } finally {
        resendRegisterOtpBtn.disabled = false;
        resendRegisterOtpBtn.textContent = "Resend OTP";
      }
    });
  }

  if (verifyRegisterOtpBtn) {
    verifyRegisterOtpBtn.addEventListener("click", async () => {
      const pending = sessionStorage.getItem("pendingRegistration");
      const otp = $("register-otp").value.trim();

      if (!pending) {
        showMessage("register-message", "Registration session expired. Please start again.");
        resetRegistrationOTP();
        return;
      }

      if (!/^\d{6}$/.test(otp)) {
        showMessage("register-message", "Please enter the 6-digit OTP.");
        $("register-otp").focus();
        return;
      }

      setButtonBusy(verifyRegisterOtpBtn, "Verifying…");

      try {
        const registration = JSON.parse(pending);

        await apiRequest("/auth/verify-otp", {
          method: "POST",
          auth: false,
          body: {
            mobile: registration.mobile,
            otp,
          },
        });

        setButtonBusy(verifyRegisterOtpBtn, "Creating account…");

        const data = await apiRequest("/auth/register", {
          method: "POST",
          auth: false,
          body: {
            fullName: registration.name,
            email: registration.email,
            password: registration.password,
          },
        });

        sessionStorage.removeItem("pendingRegistration");
        registrationOTP = null;

        if (registerOtpPanel) registerOtpPanel.classList.add("auth-hidden");

        showMessage(
          "register-message",
          "OTP verified. Account created successfully. Please sign in.",
          false
        );

        registerForm.reset();

        setTimeout(() => {
          showLogin();
          if ($("login-email")) $("login-email").value = registration.email;
        }, 700);
      } catch (err) {
        showMessage("register-message", err.message || "Unable to complete registration.");
      } finally {
        verifyRegisterOtpBtn.disabled = false;
        verifyRegisterOtpBtn.textContent = "Verify OTP";
      }
    });
  }

  // =====================================================
  // FORGOT PASSWORD + INLINE OTP
  // =====================================================

  const forgotForm = $("forgot-form");
  const forgotOtpPanel = $("forgot-otp-panel");
  const resetPasswordPanel = $("reset-password-panel");
  const forgotSubmitBtn = $("forgot-submit-btn");
  const verifyForgotOtpBtn = $("verify-forgot-otp");
  const resetPasswordBtn = $("reset-password-btn");

  let resetEmail = "";
  let resetOTP = "";

  function resetForgotPasswordFlow() {
    resetEmail = "";
    resetOTP = "";

    if (forgotOtpPanel) forgotOtpPanel.classList.add("auth-hidden");
    if (resetPasswordPanel) resetPasswordPanel.classList.add("auth-hidden");

    if ($("forgot-otp")) $("forgot-otp").value = "";
    if ($("reset-password")) $("reset-password").value = "";
    if ($("reset-confirm-password")) $("reset-confirm-password").value = "";
    if ($("forgot-otp-demo")) $("forgot-otp-demo").textContent = "";
    if ($("forgot-otp-recipient")) $("forgot-otp-recipient").textContent = "";

    clearMessage("forgot-message");

    if (forgotSubmitBtn) {
      forgotSubmitBtn.classList.remove("auth-hidden");
      forgotSubmitBtn.disabled = false;
      forgotSubmitBtn.textContent = "Send OTP";
    }
  }

  if (forgotForm) {
    forgotForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearMessage("forgot-message");

      resetEmail = $("forgot-email").value.trim().toLowerCase();

      if (!resetEmail) {
        showMessage("forgot-message", "Please enter your email address.");
        return;
      }

      setButtonBusy(forgotSubmitBtn, "Sending OTP…");

      try {
        const data = await apiRequest("/auth/forgot-password", {
          method: "POST",
          auth: false,
          body: { email: resetEmail },
        });

        if (forgotOtpPanel) forgotOtpPanel.classList.remove("auth-hidden");
        if ($("forgot-otp-recipient")) {
          $("forgot-otp-recipient").textContent = `OTP sent for ${resetEmail}.`;
        }
        if ($("forgot-otp-demo")) {
          $("forgot-otp-demo").textContent = `Demo OTP: ${data.demoOtp}`;
        }

        showMessage("forgot-message", "OTP sent. Enter the code below.", false);

        forgotSubmitBtn.classList.add("auth-hidden");
        $("forgot-otp").focus();
      } catch (err) {
        showMessage("forgot-message", err.message || "Unable to send reset OTP.");
        forgotSubmitBtn.disabled = false;
        forgotSubmitBtn.textContent = "Send OTP";
      }
    });
  }

  if (verifyForgotOtpBtn) {
    verifyForgotOtpBtn.addEventListener("click", async () => {
      const otp = $("forgot-otp").value.trim();

      if (!resetEmail) {
        showMessage("forgot-message", "Please request a new OTP first.");
        return;
      }

      if (!/^\d{6}$/.test(otp)) {
        showMessage("forgot-message", "Please enter the 6-digit OTP.");
        $("forgot-otp").focus();
        return;
      }

      setButtonBusy(verifyForgotOtpBtn, "Verifying…");

      try {
        const result = await apiRequest("/auth/verify-reset-otp", {
          method: "POST",
          auth: false,
          body: {
            email: resetEmail,
            otp,
          },
        });

        if (!result.verified) {
          throw new Error("OTP verification failed.");
        }

        resetOTP = otp;

        if (forgotOtpPanel) forgotOtpPanel.classList.add("auth-hidden");
        if (resetPasswordPanel) resetPasswordPanel.classList.remove("auth-hidden");

        showMessage("forgot-message", "OTP verified. Create your new password.", false);
        $("reset-password").focus();
      } catch (err) {
        showMessage("forgot-message", err.message || "OTP verification failed.");
      } finally {
        verifyForgotOtpBtn.disabled = false;
        verifyForgotOtpBtn.textContent = "Verify OTP";
      }
    });
  }

  if (resetPasswordBtn) {
    resetPasswordBtn.addEventListener("click", async () => {
      const newPassword = $("reset-password").value;
      const confirmPassword = $("reset-confirm-password").value;

      if (newPassword.length < 6) {
        showMessage("forgot-message", "New password must contain at least 6 characters.");
        $("reset-password").focus();
        return;
      }

      if (newPassword !== confirmPassword) {
        showMessage("forgot-message", "Passwords do not match.");
        $("reset-confirm-password").focus();
        return;
      }

      setButtonBusy(resetPasswordBtn, "Resetting…");

      try {
        await apiRequest("/auth/reset-password", {
          method: "PUT",
          auth: false,
          body: {
            email: resetEmail,
            otp: resetOTP,
            newPassword,
          },
        });

        showMessage(
          "forgot-message",
          "Password reset successfully. Please sign in with your new password.",
          false
        );

        const completedEmail = resetEmail;

        forgotForm.reset();
        resetForgotPasswordFlow();

        showLogin();

        if ($("login-email")) $("login-email").value = completedEmail;
      } catch (err) {
        showMessage("forgot-message", err.message || "Password reset failed.");
      } finally {
        resetPasswordBtn.disabled = false;
        resetPasswordBtn.textContent = "Reset password";
      }
    });
  }

  showLogin();
});
