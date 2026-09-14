document.addEventListener("DOMContentLoaded", async () => {

  // =========================================
  // CHECK LOGIN
  // =========================================

  const token = Auth.getToken();

  if (!token) {
    window.location.href = "auth.html";
    return;
  }


  // =========================================
  // PAGE ELEMENTS
  // =========================================

  const accountName =
    document.getElementById("manage-account-name");

  const accountNumber =
    document.getElementById("manage-account-number");

  const balance =
    document.getElementById("manage-balance");

  const balancePasscode =
    document.getElementById("balance-passcode");

  const verifyBalanceBtn =
    document.getElementById("verify-balance-btn");

  const balancePasscodeMessage =
    document.getElementById("balance-passcode-message");

  let actualBalance = 0;
  let balanceVisible = false;

  const profileNameInput =
    document.getElementById("profile-name-input");

  const profileEmailInput =
    document.getElementById("profile-email-input");

  const profileForm =
    document.getElementById("profile-form");

  const profileMessage =
    document.getElementById("profile-message");

  const profileSaveBtn =
    document.getElementById("profile-save-btn");

  const transactionsContainer =
    document.getElementById("manage-transactions");


  // Store transactions
  let transactions = [];

  // Store account ID
  let accountId = null;


  // =========================================
  // LOAD ACCOUNT INFORMATION
  // =========================================

  try {

    const accountResponse =
      await apiRequest("/account/me");

    console.log(
      "ACCOUNT RESPONSE:",
      accountResponse
    );


    // -----------------------------------------
    // Get first account
    // -----------------------------------------

    const account =
      accountResponse.accounts?.[0];


    if (!account) {

      throw new Error(
        "No account found for this user."
      );

    }


    // -----------------------------------------
    // Account ID
    // -----------------------------------------

    accountId = account.id;


    // -----------------------------------------
    // User name
    // -----------------------------------------

    const name =
      accountResponse.user?.fullName ||
      "Account Holder";


    accountName.textContent = name;

    profileNameInput.value = name;


    // -----------------------------------------
    // Email
    // -----------------------------------------

    profileEmailInput.value =
      accountResponse.user?.email ||
      "";


    // -----------------------------------------
    // Account number
    // -----------------------------------------

    accountNumber.textContent =
      account.accountNumber ||
      "Not available";


    // -----------------------------------------
    // Balance
    // -----------------------------------------

    actualBalance =
      Number(account.balance) || 0;

    // Keep balance hidden initially
    balance.textContent =
      "₹ ••••••";


  } catch (error) {

    console.error(
      "ACCOUNT ERROR:",
      error
    );


    accountName.textContent =
      "Account unavailable";

    accountNumber.textContent =
      "Unable to load";

    balance.textContent =
      "₹ ••••••";

  }


  // =========================================
  // LOAD TRANSACTIONS
  // =========================================

  if (accountId) {

    try {

      const transactionResponse =
        await apiRequest(
          `/transactions?accountId=${accountId}`
        );


      console.log(
        "TRANSACTION RESPONSE:",
        transactionResponse
      );


      // Backend returns { history: [...] }
      transactions =
        transactionResponse.history || [];


      renderTransactions();


    } catch (error) {

      console.error(
        "TRANSACTION ERROR:",
        error
      );


      transactionsContainer.innerHTML = `
        <tr>
          <td
            colspan="6"
            class="manage-loading"
          >
            Unable to load transactions.
          </td>
        </tr>
      `;

    }

  } else {

    transactionsContainer.innerHTML = `
      <tr>
        <td
          colspan="6"
          class="manage-loading"
        >
          Account information unavailable.
        </td>
      </tr>
    `;

  }


  // =========================================
  // BALANCE PASSCODE PROTECTION
  // =========================================

  if (
    verifyBalanceBtn &&
    balancePasscode
  ) {

    verifyBalanceBtn.addEventListener(
      "click",
      () => {

        // -------------------------------------
        // HIDE BALANCE
        // -------------------------------------

        if (balanceVisible) {

          balance.textContent =
            "₹ ••••••";

          balanceVisible = false;

          verifyBalanceBtn.textContent =
            "Show balance";

          balancePasscode.value = "";

          balancePasscodeMessage.textContent =
            "";

          return;
        }


        // -------------------------------------
        // GET PASSCODE
        // -------------------------------------

        const passcode =
          balancePasscode.value.trim();


        // -------------------------------------
        // VALIDATE 4 DIGITS
        // -------------------------------------

        if (!/^\d{4}$/.test(passcode)) {

          balancePasscodeMessage.textContent =
            "Please enter a valid 4-digit passcode.";

          balancePasscodeMessage.className =
            "balance-passcode-error";

          return;
        }


        // -------------------------------------
        // DEMO PASSCODE
        // -------------------------------------

        if (passcode === "1234") {

          balance.textContent =
            formatCurrency(actualBalance);

          balanceVisible = true;

          verifyBalanceBtn.textContent =
            "Hide balance";

          balancePasscode.value = "";

          balancePasscodeMessage.textContent =
            "";

        } else {

          balancePasscodeMessage.textContent =
            "Incorrect passcode.";

          balancePasscodeMessage.className =
            "balance-passcode-error";

          balancePasscode.value =
            "";

        }

      }
    );

  }


  // =========================================
  // FORMAT CURRENCY
  // =========================================

  function formatCurrency(amount) {

    const number =
      Number(amount) || 0;


    return new Intl.NumberFormat(
      "en-US",
      {
        style: "currency",
        currency: "USD"
      }
    ).format(number);

  }


  // =========================================
  // FORMAT DATE
  // =========================================

  function formatDate(dateValue) {

    if (!dateValue) {
      return "—";
    }


    const date =
      new Date(dateValue);


    if (
      Number.isNaN(
        date.getTime()
      )
    ) {

      return "—";

    }


    return date.toLocaleDateString(
      "en-US",
      {
        month: "short",
        day: "numeric",
        year: "numeric"
      }
    );

  }


  // =========================================
  // ESCAPE HTML
  // =========================================

  function escapeHTML(value) {

    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  }


  // =========================================
  // RENDER TRANSACTIONS
  // =========================================

  function renderTransactions() {

    const searchInput =
      document.getElementById(
        "transaction-search"
      );


    const typeFilter =
      document.getElementById(
        "transaction-type"
      );


    const dateFilter =
      document.getElementById(
        "transaction-date"
      );


    const search =
      searchInput.value
        .toLowerCase()
        .trim();


    const selectedType =
      typeFilter.value;


    const selectedDays =
      dateFilter.value;


    const now =
      new Date();


    // -----------------------------------------
    // Filter transactions
    // -----------------------------------------

    const filtered =
      transactions.filter(
        (transaction) => {

          // Description
          const description =
            transaction.note ||
            (
              transaction.type === "deposit"
                ? "Deposit"
                : "Transfer"
            );


          // Transaction ID
          const transactionId =
            transaction.id || "";


          // Counterparty
          const counterparty =
            transaction.counterpartyAccount ||
            "";


          // Search text
          const searchableText =
            `${description} ${transactionId} ${counterparty}`
              .toLowerCase();


          // -------------------------------------
          // Search filter
          // -------------------------------------

          if (
            search &&
            !searchableText.includes(search)
          ) {

            return false;

          }


          // -------------------------------------
          // Determine credit/debit
          // -------------------------------------

          const transactionType =
            (
              transaction.direction === "credit" ||
              transaction.type === "deposit"
            )
              ? "credit"
              : "debit";


          // -------------------------------------
          // Type filter
          // -------------------------------------

          if (
            selectedType !== "all" &&
            transactionType !== selectedType
          ) {

            return false;

          }


          // -------------------------------------
          // Date filter
          // -------------------------------------

          if (
            selectedDays !== "all"
          ) {

            const transactionDate =
              new Date(
                transaction.createdAt
              );


            const cutoff =
              new Date(now);


            cutoff.setDate(
              cutoff.getDate() -
              Number(selectedDays)
            );


            if (
              Number.isNaN(
                transactionDate.getTime()
              ) ||
              transactionDate < cutoff
            ) {

              return false;

            }

          }


          return true;

        }
      );


    // =========================================
    // NO TRANSACTIONS
    // =========================================

    if (
      filtered.length === 0
    ) {

      transactionsContainer.innerHTML = `
        <tr>
          <td
            colspan="6"
            class="manage-loading"
          >
            No transactions found.
          </td>
        </tr>
      `;

      return;

    }


    // =========================================
    // DISPLAY TRANSACTIONS
    // =========================================

    transactionsContainer.innerHTML =
      filtered
        .map(
          (transaction) => {

            // ---------------------------------
            // Description
            // ---------------------------------

            const description =
              transaction.note ||
              (
                transaction.type === "deposit"
                  ? "Deposit"
                  : "Transfer"
              );


            // ---------------------------------
            // Date
            // ---------------------------------

            const transactionDate =
              transaction.createdAt;


            // ---------------------------------
            // Credit / Debit
            // ---------------------------------

            const isCredit =
              transaction.direction === "credit" ||
              transaction.type === "deposit";


            // ---------------------------------
            // Amount
            // ---------------------------------

            const amount =
              Number(transaction.amount) || 0;


            // ---------------------------------
            // Transaction ID
            // ---------------------------------

            const transactionId =
              transaction.id || "—";


            // ---------------------------------
            // Status
            // ---------------------------------

            const status =
              "Completed";


            // ---------------------------------
            // Counterparty
            // ---------------------------------

            const counterparty =
              transaction.counterpartyAccount ||
              "";


            return `
              <tr>

                <td>

                  <strong>
                    ${escapeHTML(description)}
                  </strong>

                  ${
                    counterparty
                      ? `
                        <small>
                          Account ••••${escapeHTML(
                            String(counterparty).slice(-4)
                          )}
                        </small>
                      `
                      : ""
                  }

                </td>


                <td>
                  ${formatDate(transactionDate)}
                </td>


                <td>
                  ${
                    isCredit
                      ? "Credit"
                      : "Debit"
                  }
                </td>


                <td>

                  <strong>
                    ${
                      isCredit
                        ? "+"
                        : "-"
                    }${formatCurrency(amount)}
                  </strong>

                </td>


                <td>

                  <span
                    class="transaction-status"
                  >
                    ${status}
                  </span>

                </td>


                <td>
                  #${escapeHTML(transactionId)}
                </td>

              </tr>
            `;

          }
        )
        .join("");

  }


  // =========================================
  // SEARCH FILTER
  // =========================================

  document
    .getElementById(
      "transaction-search"
    )
    .addEventListener(
      "input",
      renderTransactions
    );


  // =========================================
  // TYPE FILTER
  // =========================================

  document
    .getElementById(
      "transaction-type"
    )
    .addEventListener(
      "change",
      renderTransactions
    );


  // =========================================
  // DATE FILTER
  // =========================================

  document
    .getElementById(
      "transaction-date"
    )
    .addEventListener(
      "change",
      renderTransactions
    );


  // =========================================
  // PRINT STATEMENT
  // =========================================

  document
    .getElementById(
      "print-statement-btn"
    )
    .addEventListener(
      "click",
      () => {

        window.print();

      }
    );


  // =========================================
  // LOGOUT
  // =========================================

  function logout() {

    localStorage.removeItem("token");

    localStorage.removeItem("user");

    window.location.href =
      "auth.html";

  }


  // Top logout button
  document
    .getElementById("logout-btn")
    .addEventListener(
      "click",
      logout
    );


  // Bottom logout button
  document
    .getElementById("logout-bottom")
    .addEventListener(
      "click",
      logout
    );


  // =========================================
  // UPDATE PROFILE
  // =========================================

  if (profileForm) {

    profileForm.addEventListener(
      "submit",
      async (event) => {

        event.preventDefault();

        const fullName =
          profileNameInput.value.trim();

        const email =
          profileEmailInput.value.trim();


        if (!fullName || !email) {

          profileMessage.textContent =
            "Please enter your name and email.";

          profileMessage.className =
            "profile-message error";

          return;
        }


        profileSaveBtn.disabled =
          true;

        profileSaveBtn.textContent =
          "Saving...";

        profileMessage.textContent =
          "";


        try {

          const data =
            await apiRequest(
              "/account/profile",
              {
                method: "PUT",

                body: {
                  fullName: fullName,
                  email: email
                }
              }
            );


          if (data.user) {

            localStorage.setItem(
              "user",
              JSON.stringify(data.user)
            );

          }


          profileNameInput.value =
            data.user?.fullName ||
            fullName;


          profileEmailInput.value =
            data.user?.email ||
            email;


          accountName.textContent =
            data.user?.fullName ||
            fullName;


          profileMessage.textContent =
            "Profile updated successfully.";

          profileMessage.className =
            "profile-message success";


        } catch (error) {

          console.error(
            "PROFILE UPDATE ERROR:",
            error
          );


          profileMessage.textContent =
            error.message ||
            "Unable to update profile.";

          profileMessage.className =
            "profile-message error";


        } finally {

          profileSaveBtn.disabled =
            false;

          profileSaveBtn.textContent =
            "Save changes";

        }

      }
    );

  }


  // =========================================
  // CHANGE PASSWORD
  // =========================================

  const passwordForm =
    document.getElementById(
      "password-form"
    );

  const currentPassword =
    document.getElementById(
      "current-password"
    );

  const newPassword =
    document.getElementById(
      "new-password"
    );

  const confirmPassword =
    document.getElementById(
      "confirm-password"
    );

  const passwordMessage =
    document.getElementById(
      "password-message"
    );

  const passwordSaveBtn =
    document.getElementById(
      "password-save-btn"
    );


  if (passwordForm) {

    passwordForm.addEventListener(
      "submit",
      async (event) => {

        event.preventDefault();


        const current =
          currentPassword.value;

        const newPass =
          newPassword.value;

        const confirm =
          confirmPassword.value;


        // -------------------------------------
        // Required fields
        // -------------------------------------

        if (
          !current ||
          !newPass ||
          !confirm
        ) {

          passwordMessage.textContent =
            "Please fill in all password fields.";

          passwordMessage.className =
            "profile-message error";

          return;

        }


        // -------------------------------------
        // Minimum password length
        // -------------------------------------

        if (
          newPass.length < 6
        ) {

          passwordMessage.textContent =
            "New password must be at least 6 characters.";

          passwordMessage.className =
            "profile-message error";

          return;

        }


        // -------------------------------------
        // Confirm password
        // -------------------------------------

        if (
          newPass !== confirm
        ) {

          passwordMessage.textContent =
            "New passwords do not match.";

          passwordMessage.className =
            "profile-message error";

          return;

        }


        passwordSaveBtn.disabled =
          true;

        passwordSaveBtn.textContent =
          "Changing...";

        passwordMessage.textContent =
          "";


        try {

          const data =
            await apiRequest(
              "/auth/change-password",
              {
                method: "PUT",

                body: {
                  currentPassword: current,
                  newPassword: newPass
                }
              }
            );


          passwordMessage.textContent =
            data.message ||
            "Password changed successfully.";

          passwordMessage.className =
            "profile-message success";


          passwordForm.reset();


        } catch (error) {

          console.error(
            "CHANGE PASSWORD ERROR:",
            error
          );


          passwordMessage.textContent =
            error.message ||
            "Unable to change password.";

          passwordMessage.className =
            "profile-message error";


        } finally {

          passwordSaveBtn.disabled =
            false;

          passwordSaveBtn.textContent =
            "Change password";

        }

      }
    );

  }

});