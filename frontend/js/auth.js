document.addEventListener("DOMContentLoaded", () => {

  // =====================================================
  // AUTO REDIRECT IF ALREADY LOGGED IN
  // =====================================================

  if (Auth.getToken()) {
    window.location.href = "dashboard.html";
    return;
  }


  // =====================================================
  // SECTION SWITCHING
  // =====================================================

  window.showLogin = function () {

    document
      .getElementById("login-section")
      .classList.remove("auth-hidden");

    document
      .getElementById("register-section")
      .classList.add("auth-hidden");

    document
      .getElementById("forgot-section")
      .classList.add("auth-hidden");

  };


  window.showRegister = function () {

    document
      .getElementById("login-section")
      .classList.add("auth-hidden");

    document
      .getElementById("register-section")
      .classList.remove("auth-hidden");

    document
      .getElementById("forgot-section")
      .classList.add("auth-hidden");

  };


  window.showForgotPassword = function () {

    document
      .getElementById("login-section")
      .classList.add("auth-hidden");

    document
      .getElementById("register-section")
      .classList.add("auth-hidden");

    document
      .getElementById("forgot-section")
      .classList.remove("auth-hidden");

  };


  // Keep both names available.
  // This allows either onclick="showForgot()"
  // or onclick="showForgotPassword()" to work.

  window.showForgot = function () {
    window.showForgotPassword();
  };


  // =====================================================
  // PASSWORD SHOW / HIDE
  // =====================================================

  window.togglePassword = function (inputId, button) {

    const input = document.getElementById(inputId);

    if (!input) return;

    if (input.type === "password") {

      input.type = "text";
      button.textContent = "Hide";

    } else {

      input.type = "password";
      button.textContent = "Show";

    }

  };


  // =====================================================
  // MESSAGE HELPER
  // =====================================================

  function showMessage(
    elementId,
    message,
    isError = true
  ) {

    const element =
      document.getElementById(elementId);

    if (!element) return;

    element.textContent = message;

    element.className = "auth-message";

    if (isError) {

      element.classList.add("error");

    } else {

      element.classList.add("success");

    }

  }


  // =====================================================
  // LOGIN
  // =====================================================

  const loginForm =
    document.getElementById("login-form");

  if (loginForm) {

    loginForm.addEventListener(
      "submit",
      async (e) => {

        e.preventDefault();


        const email =
          document
            .getElementById("login-email")
            .value
            .trim()
            .toLowerCase();


        const password =
          document
            .getElementById("login-password")
            .value;


        if (!email || !password) {

          showMessage(
            "login-message",
            "Email and password are required."
          );

          return;
        }


        const submitBtn =
          loginForm.querySelector(
            ".auth-submit-btn"
          );


        submitBtn.disabled = true;
        submitBtn.textContent = "Signing in…";


        try {

          const data =
            await apiRequest(
              "/auth/login",
              {
                method: "POST",
                auth: false,
                body: {
                  email,
                  password
                }
              }
            );


          Auth.setSession(
            data.token,
            data.user
          );


          showMessage(
            "login-message",
            "Login successful. Redirecting…",
            false
          );


          setTimeout(() => {

            window.location.href =
              "dashboard.html";

          }, 500);


        } catch (err) {

          console.error(
            "Login error:",
            err
          );

          showMessage(
            "login-message",
            err.message ||
            "Unable to sign in."
          );

        } finally {

          submitBtn.disabled = false;
          submitBtn.textContent = "Sign In";

        }

      }
    );

  }


  // =====================================================
  // REGISTER + OTP
  // =====================================================

  const registerForm =
    document.getElementById("register-form");

  if (registerForm) {

    registerForm.addEventListener(
      "submit",
      async (e) => {

        e.preventDefault();


        const name =
          document
            .getElementById("register-name")
            .value
            .trim();


        const email =
          document
            .getElementById("register-email")
            .value
            .trim()
            .toLowerCase();


        const mobile =
          document
            .getElementById("register-mobile")
            .value
            .trim();


        const password =
          document
            .getElementById("register-password")
            .value;


        const confirmPassword =
          document
            .getElementById(
              "register-confirm-password"
            )
            .value;


        // -----------------------------
        // VALIDATION
        // -----------------------------

        if (
          !name ||
          !email ||
          !mobile ||
          !password ||
          !confirmPassword
        ) {

          showMessage(
            "register-message",
            "Please fill in all fields."
          );

          return;
        }


        if (password.length < 6) {

          showMessage(
            "register-message",
            "Password must contain at least 6 characters."
          );

          return;
        }


        if (password !== confirmPassword) {

          showMessage(
            "register-message",
            "Passwords do not match."
          );

          return;
        }


        const cleanedMobile =
          mobile
            .replace(/\D/g, "")
            .slice(-10);


        if (
          !/^[6-9]\d{9}$/.test(
            cleanedMobile
          )
        ) {

          showMessage(
            "register-message",
            "Please enter a valid 10-digit mobile number."
          );

          return;
        }


        const submitBtn =
          registerForm.querySelector(
            ".auth-submit-btn"
          );


        submitBtn.disabled = true;
        submitBtn.textContent = "Sending OTP…";


        try {

          // -----------------------------
          // SEND OTP
          // -----------------------------

          const otpData =
            await apiRequest(
              "/auth/send-otp",
              {
                method: "POST",
                auth: false,
                body: {
                  mobile: cleanedMobile
                }
              }
            );


          console.log(
            "DEMO REGISTRATION OTP:",
            otpData.demoOtp
          );


          // Store registration temporarily

          sessionStorage.setItem(
            "pendingRegistration",
            JSON.stringify({
              name,
              email,
              mobile: cleanedMobile,
              password
            })
          );


          // -----------------------------
          // ASK FOR OTP
          // -----------------------------

          const enteredOTP =
            prompt(
              `OTP sent to ${cleanedMobile}.\n\n` +
              `Demo OTP: ${otpData.demoOtp}\n\n` +
              `Enter the OTP:`
            );


          if (!enteredOTP) {

            showMessage(
              "register-message",
              "OTP verification cancelled."
            );

            return;
          }


          submitBtn.textContent =
            "Verifying OTP…";


          // -----------------------------
          // VERIFY OTP
          // -----------------------------

          await apiRequest(
            "/auth/verify-otp",
            {
              method: "POST",
              auth: false,
              body: {
                mobile: cleanedMobile,
                otp: enteredOTP.trim()
              }
            }
          );


          // -----------------------------
          // CREATE ACCOUNT
          // -----------------------------

          submitBtn.textContent =
            "Creating account…";


          await apiRequest(
            "/auth/register",
            {
              method: "POST",
              auth: false,
              body: {
                fullName: name,
                email,
                password
              }
            }
          );


          sessionStorage.removeItem(
            "pendingRegistration"
          );


          showMessage(
            "register-message",
            "OTP verified. Account created successfully. Please sign in.",
            false
          );


          registerForm.reset();


          setTimeout(() => {

            showLogin();

            const loginEmail =
              document.getElementById(
                "login-email"
              );

            if (loginEmail) {
              loginEmail.value = email;
            }

          }, 1000);


        } catch (err) {

          console.error(
            "Registration / OTP error:",
            err
          );

          showMessage(
            "register-message",
            err.message ||
            "Unable to complete registration."
          );

        } finally {

          submitBtn.disabled = false;

          submitBtn.textContent =
            "Create Account";

        }

      }
    );

  }


  // =====================================================
  // FORGOT PASSWORD
  // =====================================================

  const forgotForm =
    document.getElementById("forgot-form");

  if (forgotForm) {

    forgotForm.addEventListener(
      "submit",
      async (e) => {

        e.preventDefault();


        const emailInput =
          document.getElementById(
            "forgot-email"
          );


        const email =
          emailInput
            ? emailInput.value.trim().toLowerCase()
            : "";


        if (!email) {

          showMessage(
            "forgot-message",
            "Please enter your email address."
          );

          return;
        }


        const submitBtn =
          forgotForm.querySelector(
            ".auth-submit-btn"
          );


        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent =
            "Sending OTP…";
        }


        try {

          // -----------------------------
          // SEND RESET OTP
          // -----------------------------

          const data =
            await apiRequest(
              "/auth/forgot-password",
              {
                method: "POST",
                auth: false,
                body: {
                  email
                }
              }
            );


          console.log(
            "DEMO PASSWORD RESET OTP:",
            data.demoOtp
          );


          // -----------------------------
          // ENTER OTP
          // -----------------------------

          const otp =
            prompt(
              `Password reset OTP sent.\n\n` +
              `Demo OTP: ${data.demoOtp}\n\n` +
              `Enter the OTP:`
            );


          if (!otp) {
            return;
          }


          // -----------------------------
          // VERIFY RESET OTP
          // -----------------------------

          const verifyData =
            await apiRequest(
              "/auth/verify-reset-otp",
              {
                method: "POST",
                auth: false,
                body: {
                  email,
                  otp: otp.trim()
                }
              }
            );


          if (!verifyData.verified) {

            throw new Error(
              "OTP verification failed."
            );

          }


          // -----------------------------
          // NEW PASSWORD
          // -----------------------------

          const newPassword =
            prompt(
              "Enter your new password (minimum 6 characters):"
            );


          if (!newPassword) {
            return;
          }


          if (newPassword.length < 6) {

            alert(
              "Password must contain at least 6 characters."
            );

            return;
          }


          const confirmPassword =
            prompt(
              "Confirm your new password:"
            );


          if (!confirmPassword) {
            return;
          }


          if (
            newPassword !==
            confirmPassword
          ) {

            alert(
              "Passwords do not match."
            );

            return;
          }


          // -----------------------------
          // RESET PASSWORD
          // -----------------------------

          await apiRequest(
            "/auth/reset-password",
            {
              method: "PUT",
              auth: false,
              body: {
                email,
                otp: otp.trim(),
                newPassword
              }
            }
          );


          alert(
            "Password reset successfully. Please sign in with your new password."
          );


          forgotForm.reset();

          showLogin();


          const loginEmail =
            document.getElementById(
              "login-email"
            );

          if (loginEmail) {
            loginEmail.value = email;
          }


        } catch (err) {

          console.error(
            "Password reset error:",
            err
          );

          alert(
            err.message ||
            "Password reset failed."
          );

        } finally {

          if (submitBtn) {

            submitBtn.disabled = false;
            submitBtn.textContent =
              "Continue";

          }

        }

      }
    );

  }


  // =====================================================
  // START ON LOGIN
  // =====================================================

  showLogin();

});