document.addEventListener("DOMContentLoaded", async () => {
  Auth.requireAuthOrRedirect();

  const logoutBtn = document.getElementById("logout-btn");

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      Auth.clear();
      window.location.href = "login.html";
    });
  }

  const user = Auth.getUser();

  if (user) {
    const firstName = user.fullName
      ? user.fullName.split(" ")[0]
      : "User";

    document.getElementById("greeting").textContent =
      `Welcome back, ${firstName}`;
  }

  try {
    // Get the logged-in user's account
    const data = await apiRequest("/account/me");

    console.log("Account API response:", data);

    const accounts = data.accounts || [];
    const primary = accounts[0];

    if (!primary) {
      document.getElementById("account-number").textContent =
        "No account found";

      document.getElementById("recent-ledger").innerHTML =
        '<div class="empty-state">No account found on this profile.</div>';

      return;
    }

    // -----------------------------
    // BALANCE
    // -----------------------------

    document.getElementById("balance-amount").textContent =
      formatCurrency(primary.balance);


    // -----------------------------
    // FULL ACCOUNT NUMBER
    // -----------------------------

    const accountNumberElement =
      document.getElementById("account-number");

    accountNumberElement.textContent =
      `Account No. ${primary.accountNumber}`;


    // -----------------------------
    // COPY ACCOUNT NUMBER
    // -----------------------------

    const copyBtn =
      document.getElementById("copy-account-btn");

    if (copyBtn) {
      copyBtn.addEventListener("click", async () => {

        try {
          await navigator.clipboard.writeText(
            primary.accountNumber
          );

          copyBtn.textContent = "Copied!";

        } catch (error) {

          // Clipboard fallback
          const input =
            document.createElement("input");

          input.value =
            primary.accountNumber;

          document.body.appendChild(input);

          input.select();

          document.execCommand("copy");

          input.remove();

          copyBtn.textContent = "Copied!";
        }

        setTimeout(() => {
          copyBtn.textContent =
            "Copy account number";
        }, 1500);
      });
    }


    // -----------------------------
    // TRANSACTION HISTORY
    // -----------------------------

    const transactionData =
      await apiRequest(
        `/transactions?accountId=${primary.id}`
      );

    const history =
      transactionData.history || [];

    renderLedger(history.slice(0, 5));

  } catch (err) {

    console.error("Dashboard error:", err);

    if (
      err.message &&
      err.message.toLowerCase().includes("token")
    ) {
      Auth.clear();
      window.location.href = "login.html";
      return;
    }

    document.getElementById("recent-ledger").innerHTML =
      `<div class="empty-state">${err.message}</div>`;
  }
});


function renderLedger(entries) {

  const container =
    document.getElementById("recent-ledger");

  if (!entries.length) {

    container.innerHTML =
      '<div class="empty-state">No activity yet. Add funds to get started.</div>';

    return;
  }

  container.innerHTML = entries
    .map((entry) => {

      const sign =
        entry.direction === "credit"
          ? "+"
          : "−";

      let label;

      if (entry.type === "deposit") {
        label = "Deposit";
      } else if (
        entry.type === "transfer" &&
        entry.direction === "credit"
      ) {
        label = "Transfer received";
      } else {
        label = "Transfer sent";
      }

      const counterparty =
        entry.counterpartyAccount
          ? `<span class="counterparty">
               Acct •• ${entry.counterpartyAccount.slice(-4)}
             </span>`
          : "";

      return `
        <div class="ledger-row">

          <div class="date">
            ${formatDate(entry.createdAt)}
          </div>

          <div class="desc">
            ${label}
            ${entry.note ? `— ${entry.note}` : ""}
            ${counterparty}
          </div>

          <div class="amount ${entry.direction}">
            ${sign} ${formatCurrency(entry.amount)}
          </div>

        </div>
      `;
    })
    .join("");
}
// =========================================
// DIGITAL CARD
// =========================================

document.addEventListener("DOMContentLoaded", () => {

  const cardsService =
    document.getElementById("cards-service");

  const cardModal =
    document.getElementById("card-modal");

  const cardModalClose =
    document.getElementById("card-modal-close");

  const cardModalOverlay =
    document.querySelector(".card-modal-overlay");

  const cardHolderName =
    document.getElementById("card-holder-name");


  // If the card elements don't exist,
  // stop safely.
  if (
    !cardsService ||
    !cardModal
  ) {
    return;
  }


  // Get logged-in user
  const user =
    Auth.getUser();


  // Display user's name on card
  if (
    user &&
    user.fullName &&
    cardHolderName
  ) {

    cardHolderName.textContent =
      user.fullName.toUpperCase();

  }


  // =========================================
  // OPEN CARD
  // =========================================

  function openCard() {

    cardModal.classList.add("open");

    cardModal.setAttribute(
      "aria-hidden",
      "false"
    );

  }


  // =========================================
  // CLOSE CARD
  // =========================================

  function closeCard() {

    cardModal.classList.remove("open");

    cardModal.setAttribute(
      "aria-hidden",
      "true"
    );

  }


  // =========================================
  // CLICK CARD SERVICE
  // =========================================

  cardsService.addEventListener(
    "click",
    openCard
  );


  // =========================================
  // KEYBOARD ACCESS
  // =========================================

  cardsService.addEventListener(
    "keydown",
    (event) => {

      if (
        event.key === "Enter" ||
        event.key === " "
      ) {

        event.preventDefault();

        openCard();

      }

    }
  );


  // =========================================
  // CLOSE BUTTON
  // =========================================

  if (cardModalClose) {

    cardModalClose.addEventListener(
      "click",
      closeCard
    );

  }


  // =========================================
  // CLOSE WHEN CLICKING OUTSIDE
  // =========================================

  if (cardModalOverlay) {

    cardModalOverlay.addEventListener(
      "click",
      closeCard
    );

  }


  // =========================================
  // ESC KEY
  // =========================================

  document.addEventListener(
    "keydown",
    (event) => {

      if (
        event.key === "Escape" &&
        cardModal.classList.contains("open")
      ) {

        closeCard();

      }

    }
  );

});


// =========================================
// BENEFICIARIES
// =========================================

document.addEventListener("DOMContentLoaded", () => {

  const beneficiariesService =
    document.getElementById("beneficiaries-service");

  const beneficiaryModal =
    document.getElementById("beneficiary-modal");

  const beneficiaryModalClose =
    document.getElementById("beneficiary-modal-close");

  const beneficiaryModalOverlay =
    document.querySelector(
      ".beneficiary-modal-overlay"
    );

  const beneficiaryCancelBtn =
    document.getElementById(
      "beneficiary-cancel-btn"
    );

  const beneficiaryForm =
    document.getElementById(
      "beneficiary-form"
    );

  const beneficiaryList =
    document.getElementById(
      "beneficiary-list"
    );

  const beneficiaryMessage =
    document.getElementById(
      "beneficiary-message"
    );


  // If the elements don't exist,
  // stop safely.

  if (
    !beneficiariesService ||
    !beneficiaryModal ||
    !beneficiaryForm
  ) {
    return;
  }


  // =========================================
  // STORAGE
  // =========================================

  const STORAGE_KEY =
    "ledger_beneficiaries";


  function getBeneficiaries() {

    try {

      return JSON.parse(
        localStorage.getItem(
          STORAGE_KEY
        )
      ) || [];

    } catch (error) {

      console.error(
        "Unable to read beneficiaries:",
        error
      );

      return [];

    }

  }


  function saveBeneficiaries(
    beneficiaries
  ) {

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(
        beneficiaries
      )
    );

  }


  // =========================================
  // OPEN MODAL
  // =========================================

  function openBeneficiaryModal() {

    beneficiaryModal.classList.add(
      "open"
    );

    beneficiaryModal.setAttribute(
      "aria-hidden",
      "false"
    );

    renderBeneficiaries();

  }


  // =========================================
  // CLOSE MODAL
  // =========================================

  function closeBeneficiaryModal() {

    beneficiaryModal.classList.remove(
      "open"
    );

    beneficiaryModal.setAttribute(
      "aria-hidden",
      "true"
    );

    beneficiaryForm.reset();

    if (beneficiaryMessage) {

      beneficiaryMessage.textContent =
        "";

      beneficiaryMessage.classList.remove(
        "visible",
        "success",
        "error"
      );

    }

  }


  // =========================================
  // OPEN BENEFICIARIES
  // =========================================

  beneficiariesService.addEventListener(
    "click",
    openBeneficiaryModal
  );


  // =========================================
  // KEYBOARD ACCESS
  // =========================================

  beneficiariesService.addEventListener(
    "keydown",
    (event) => {

      if (
        event.key === "Enter" ||
        event.key === " "
      ) {

        event.preventDefault();

        openBeneficiaryModal();

      }

    }
  );


  // =========================================
  // CLOSE BUTTON
  // =========================================

  if (beneficiaryModalClose) {

    beneficiaryModalClose.addEventListener(
      "click",
      closeBeneficiaryModal
    );

  }


  // =========================================
  // CANCEL BUTTON
  // =========================================

  if (beneficiaryCancelBtn) {

    beneficiaryCancelBtn.addEventListener(
      "click",
      closeBeneficiaryModal
    );

  }


  // =========================================
  // CLICK OUTSIDE MODAL
  // =========================================

  if (beneficiaryModalOverlay) {

    beneficiaryModalOverlay.addEventListener(
      "click",
      closeBeneficiaryModal
    );

  }


  // =========================================
  // ESC KEY
  // =========================================

  document.addEventListener(
    "keydown",
    (event) => {

      if (
        event.key === "Escape" &&
        beneficiaryModal.classList.contains(
          "open"
        )
      ) {

        closeBeneficiaryModal();

      }

    }
  );


  // =========================================
  // SHOW MESSAGE
  // =========================================

  function showBeneficiaryMessage(
    message,
    type = "success"
  ) {

    if (!beneficiaryMessage) {
      return;
    }

    beneficiaryMessage.textContent =
      message;

    beneficiaryMessage.classList.add(
      "visible"
    );

    beneficiaryMessage.classList.remove(
      "success",
      "error"
    );

    beneficiaryMessage.classList.add(
      type
    );

  }


  // =========================================
  // ADD BENEFICIARY
  // =========================================

  beneficiaryForm.addEventListener(
    "submit",
    (event) => {

      event.preventDefault();


      const name =
        document
          .getElementById(
            "beneficiary-name"
          )
          .value
          .trim();


      const accountNumber =
        document
          .getElementById(
            "beneficiary-account"
          )
          .value
          .trim();


      const nickname =
        document
          .getElementById(
            "beneficiary-nickname"
          )
          .value
          .trim();


      // Basic validation

      if (!name) {

        showBeneficiaryMessage(
          "Please enter the beneficiary name.",
          "error"
        );

        return;

      }


      if (!accountNumber) {

        showBeneficiaryMessage(
          "Please enter the account number.",
          "error"
        );

        return;

      }


      if (!/^\d+$/.test(accountNumber)) {

        showBeneficiaryMessage(
          "Account number must contain numbers only.",
          "error"
        );

        return;

      }


      if (
        accountNumber.length < 6
      ) {

        showBeneficiaryMessage(
          "Account number must contain at least 6 digits.",
          "error"
        );

        return;

      }


      // Get current beneficiaries

      const beneficiaries =
        getBeneficiaries();


      // Prevent duplicate account numbers

      const alreadyExists =
        beneficiaries.some(
          (beneficiary) =>
            beneficiary.accountNumber ===
            accountNumber
        );


      if (alreadyExists) {

        showBeneficiaryMessage(
          "This account is already saved.",
          "error"
        );

        return;

      }


      // Create beneficiary

      const beneficiary = {

        id:
          Date.now(),

        name:
          name,

        accountNumber:
          accountNumber,

        nickname:
          nickname,

        createdAt:
          new Date().toISOString()

      };


      beneficiaries.unshift(
        beneficiary
      );


      saveBeneficiaries(
        beneficiaries
      );


      beneficiaryForm.reset();


      showBeneficiaryMessage(
        "Beneficiary saved successfully.",
        "success"
      );


      renderBeneficiaries();

    }
  );


  // =========================================
  // RENDER BENEFICIARIES
  // =========================================

  function renderBeneficiaries() {

    if (!beneficiaryList) {
      return;
    }


    const beneficiaries =
      getBeneficiaries();


    // Empty state

    if (
      beneficiaries.length === 0
    ) {

      beneficiaryList.innerHTML = `

        <div class="beneficiary-empty">

          <div class="beneficiary-empty-icon">
            👥
          </div>

          <h3>
            No beneficiaries yet
          </h3>

          <p>
            Add a beneficiary to make future transfers faster.
          </p>

        </div>

      `;

      return;

    }


    // Beneficiary cards

    beneficiaryList.innerHTML =
      beneficiaries
        .map(
          (beneficiary) => {

            const displayName =
              beneficiary.nickname ||
              beneficiary.name;


            const lastFour =
              String(
                beneficiary.accountNumber
              ).slice(-4);


            return `

              <div
                class="beneficiary-item"
                data-id="${beneficiary.id}"
              >

                <div class="beneficiary-avatar">
                  ${getInitials(
                    beneficiary.name
                  )}
                </div>


                <div class="beneficiary-details">

                  <strong>
                    ${escapeBeneficiaryHTML(
                      displayName
                    )}
                  </strong>

                  <span>
                    ${escapeBeneficiaryHTML(
                      beneficiary.name
                    )}
                  </span>

                  <small>
                    Account ••••${escapeBeneficiaryHTML(
                      lastFour
                    )}
                  </small>

                </div>


                <button
                  type="button"
                  class="beneficiary-delete-btn"
                  data-id="${beneficiary.id}"
                >
                  Remove
                </button>

              </div>

            `;

          }
        )
        .join("");


    // Attach remove buttons

    document
      .querySelectorAll(
        ".beneficiary-delete-btn"
      )
      .forEach(
        (button) => {

          button.addEventListener(
            "click",
            () => {

              removeBeneficiary(
                Number(
                  button.dataset.id
                )
              );

            }
          );

        }
      );

  }


  // =========================================
  // REMOVE BENEFICIARY
  // =========================================

  function removeBeneficiary(
    id
  ) {

    const confirmed =
      window.confirm(
        "Remove this beneficiary?"
      );


    if (!confirmed) {
      return;
    }


    const beneficiaries =
      getBeneficiaries();


    const updated =
      beneficiaries.filter(
        (beneficiary) =>
          beneficiary.id !== id
      );


    saveBeneficiaries(
      updated
    );


    renderBeneficiaries();


    showBeneficiaryMessage(
      "Beneficiary removed.",
      "success"
    );

  }


  // =========================================
  // INITIALS
  // =========================================

  function getInitials(
    name
  ) {

    return String(name)
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(
        (word) =>
          word.charAt(0).toUpperCase()
      )
      .join("");

  }


  // =========================================
  // ESCAPE HTML
  // =========================================

  function escapeBeneficiaryHTML(
    value
  ) {

    return String(value ?? "")
      .replace(
        /&/g,
        "&amp;"
      )
      .replace(
        /</g,
        "&lt;"
      )
      .replace(
        />/g,
        "&gt;"
      )
      .replace(
        /"/g,
        "&quot;"
      )
      .replace(
        /'/g,
        "&#039;"
      );

  }

});

// =========================================
// MOBILE PAYMENTS
// =========================================

document.addEventListener("DOMContentLoaded", () => {

  const mobileService =
    document.getElementById("mobile-payment-service");

  const mobileModal =
    document.getElementById("mobile-payment-modal");

  const mobileClose =
    document.getElementById("mobile-payment-modal-close");

  const mobileOverlay =
    document.querySelector(".mobile-payment-modal-overlay");

  const mobileNumber =
    document.getElementById("mobile-recharge-number");

  const mobileOperator =
    document.getElementById("mobile-recharge-operator");

  const mobileAmount =
    document.getElementById("mobile-recharge-amount");

  const mobileSubmit =
    document.getElementById("mobile-payment-submit");

  const mobileMessage =
    document.getElementById("mobile-payment-message");

  const summaryAmount =
    document.getElementById("mobile-payment-summary-amount");


  if (
    !mobileService ||
    !mobileModal
  ) {
    return;
  }


  // =========================================
  // OPEN MODAL
  // =========================================

  function openMobileModal() {

    mobileModal.classList.add("open");

    mobileModal.setAttribute(
      "aria-hidden",
      "false"
    );

  }


  // =========================================
  // CLOSE MODAL
  // =========================================

  function closeMobileModal() {

    mobileModal.classList.remove("open");

    mobileModal.setAttribute(
      "aria-hidden",
      "true"
    );

    clearMessage();

  }


  // =========================================
  // OPEN
  // =========================================

  mobileService.addEventListener(
    "click",
    openMobileModal
  );


  mobileService.addEventListener(
    "keydown",
    (event) => {

      if (
        event.key === "Enter" ||
        event.key === " "
      ) {

        event.preventDefault();

        openMobileModal();

      }

    }
  );


  // =========================================
  // CLOSE BUTTON
  // =========================================

  if (mobileClose) {

    mobileClose.addEventListener(
      "click",
      closeMobileModal
    );

  }


  // =========================================
  // OUTSIDE CLICK
  // =========================================

  if (mobileOverlay) {

    mobileOverlay.addEventListener(
      "click",
      closeMobileModal
    );

  }


  // =========================================
  // ESC
  // =========================================

  document.addEventListener(
    "keydown",
    (event) => {

      if (
        event.key === "Escape" &&
        mobileModal.classList.contains("open")
      ) {

        closeMobileModal();

      }

    }
  );


  // =========================================
  // QUICK AMOUNT BUTTONS
  // =========================================

  document
    .querySelectorAll(
      ".recharge-amount-btn"
    )
    .forEach(
      (button) => {

        button.addEventListener(
          "click",
          () => {

            const amount =
              button.dataset.amount;

            mobileAmount.value =
              amount;

            updateSummary();

          }
        );

      }
    );


  // =========================================
  // UPDATE SUMMARY
  // =========================================

  if (mobileAmount) {

    mobileAmount.addEventListener(
      "input",
      updateSummary
    );

  }


  function updateSummary() {

    const amount =
      Number(
        mobileAmount.value
      ) || 0;

    summaryAmount.textContent =
      formatMobileCurrency(amount);

  }


  // =========================================
  // RECHARGE
  // =========================================

  if (mobileSubmit) {

    mobileSubmit.addEventListener(
      "click",
      () => {

        clearMessage();


        const number =
          mobileNumber.value.trim();

        const operator =
          mobileOperator.value;

        const amount =
          Number(
            mobileAmount.value
          );


        // Validate mobile number

        if (!/^\d{10}$/.test(number)) {

          showMessage(
            "Please enter a valid 10-digit mobile number.",
            "error"
          );

          return;

        }


        // Validate operator

        if (!operator) {

          showMessage(
            "Please select your mobile operator.",
            "error"
          );

          return;

        }


        // Validate amount

        if (
          !amount ||
          amount <= 0
        ) {

          showMessage(
            "Please enter a valid recharge amount.",
            "error"
          );

          return;

        }


        // Simulated payment

        mobileSubmit.disabled = true;

        mobileSubmit.textContent =
          "Processing…";


        setTimeout(
          () => {

            const transactionId =
              "MOB" +
              Date.now()
                .toString()
                .slice(-8);


            showMessage(
              `Recharge successful. Transaction ID: ${transactionId}`,
              "success"
            );


            mobileSubmit.textContent =
              "Recharge successful";


            setTimeout(
              () => {

                mobileSubmit.disabled =
                  false;

                mobileSubmit.textContent =
                  "Recharge mobile";

              },
              2000
            );

          },
          1200
        );

      }
    );

  }


  // =========================================
  // MESSAGE
  // =========================================

  function showMessage(
    message,
    type
  ) {

    if (!mobileMessage) {
      return;
    }

    mobileMessage.textContent =
      message;

    mobileMessage.classList.add(
      "visible"
    );

    mobileMessage.classList.remove(
      "success",
      "error"
    );

    mobileMessage.classList.add(
      type
    );

  }


  function clearMessage() {

    if (!mobileMessage) {
      return;
    }

    mobileMessage.textContent =
      "";

    mobileMessage.classList.remove(
      "visible",
      "success",
      "error"
    );

  }


  // =========================================
  // CURRENCY
  // =========================================

  function formatMobileCurrency(
    amount
  ) {

    return new Intl.NumberFormat(
      "en-US",
      {
        style: "currency",
        currency: "USD"
      }
    ).format(
      Number(amount) || 0
    );

  }

});

// =========================================
// NOTIFICATIONS
// =========================================

document.addEventListener("DOMContentLoaded", () => {

  const notificationService =
    document.getElementById("notification-service");

  const notificationModal =
    document.getElementById("notification-modal");

  const notificationClose =
    document.getElementById("notification-modal-close");

  const notificationOverlay =
    document.querySelector(
      ".notification-modal-overlay"
    );

  const notificationList =
    document.getElementById("notification-list");

  const notificationEmpty =
    document.getElementById("notification-empty");

  const notificationClear =
    document.getElementById(
      "notification-clear-btn"
    );


  if (
    !notificationService ||
    !notificationModal
  ) {
    return;
  }


  // =========================================
  // STORAGE
  // =========================================

  const STORAGE_KEY =
    "ledger_notifications";


  function getNotifications() {

    try {

      const saved =
        JSON.parse(
          localStorage.getItem(
            STORAGE_KEY
          )
        );

      if (
        Array.isArray(saved) &&
        saved.length
      ) {

        return saved;

      }

    } catch (error) {

      console.error(
        "Unable to read notifications:",
        error
      );

    }


    // Default notifications

    const defaults = [

      {
        id: 1,
        type: "security",
        title: "Account secure",
        message:
          "Your Ledger account is currently protected.",
        time: "Just now",
        read: false
      },

      {
        id: 2,
        type: "account",
        title: "Welcome to Ledger",
        message:
          "Your digital banking account is ready to use.",
        time: "Today",
        read: false
      },

      {
        id: 3,
        type: "info",
        title: "Digital card available",
        message:
          "Your Ledger debit card is available from the Dashboard.",
        time: "Today",
        read: true
      }

    ];


    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(defaults)
    );


    return defaults;

  }


  function saveNotifications(
    notifications
  ) {

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(
        notifications
      )
    );

  }


  // =========================================
  // OPEN MODAL
  // =========================================

  function openNotifications() {

    notificationModal.classList.add(
      "open"
    );

    notificationModal.setAttribute(
      "aria-hidden",
      "false"
    );

    renderNotifications();

  }


  // =========================================
  // CLOSE MODAL
  // =========================================

  function closeNotifications() {

    notificationModal.classList.remove(
      "open"
    );

    notificationModal.setAttribute(
      "aria-hidden",
      "true"
    );

  }


  // =========================================
  // OPEN CLICK
  // =========================================

  notificationService.addEventListener(
    "click",
    openNotifications
  );


  // =========================================
  // KEYBOARD ACCESS
  // =========================================

  notificationService.addEventListener(
    "keydown",
    (event) => {

      if (
        event.key === "Enter" ||
        event.key === " "
      ) {

        event.preventDefault();

        openNotifications();

      }

    }
  );


  // =========================================
  // CLOSE BUTTON
  // =========================================

  if (notificationClose) {

    notificationClose.addEventListener(
      "click",
      closeNotifications
    );

  }


  // =========================================
  // OUTSIDE CLICK
  // =========================================

  if (notificationOverlay) {

    notificationOverlay.addEventListener(
      "click",
      closeNotifications
    );

  }


  // =========================================
  // ESC KEY
  // =========================================

  document.addEventListener(
    "keydown",
    (event) => {

      if (
        event.key === "Escape" &&
        notificationModal.classList.contains(
          "open"
        )
      ) {

        closeNotifications();

      }

    }
  );


  // =========================================
  // CLEAR ALL
  // =========================================

  if (notificationClear) {

    notificationClear.addEventListener(
      "click",
      () => {

        saveNotifications([]);

        renderNotifications();

      }
    );

  }


  // =========================================
  // RENDER
  // =========================================

  function renderNotifications() {

    const notifications =
      getNotifications();


    if (
      notifications.length === 0
    ) {

      notificationList.innerHTML =
        "";

      notificationEmpty.style.display =
        "block";

      return;

    }


    notificationEmpty.style.display =
      "none";


    notificationList.innerHTML =
      notifications
        .map(
          (notification) => {

            return `

              <div
                class="notification-item ${
                  notification.read
                    ? "read"
                    : "unread"
                }"
                data-id="${notification.id}"
              >

                <div
                  class="notification-icon notification-${escapeNotificationHTML(
                    notification.type
                  )}"
                >
                  ${getNotificationIcon(
                    notification.type
                  )}
                </div>


                <div class="notification-content">

                  <div class="notification-title-row">

                    <strong>
                      ${escapeNotificationHTML(
                        notification.title
                      )}
                    </strong>

                    ${
                      notification.read
                        ? ""
                        : `
                          <span class="notification-unread-dot"></span>
                        `
                    }

                  </div>


                  <p>
                    ${escapeNotificationHTML(
                      notification.message
                    )}
                  </p>


                  <small>
                    ${escapeNotificationHTML(
                      notification.time
                    )}
                  </small>

                </div>

              </div>

            `;

          }
        )
        .join("");


    // Clicking a notification marks it as read

    document
      .querySelectorAll(
        ".notification-item"
      )
      .forEach(
        (item) => {

          item.addEventListener(
            "click",
            () => {

              markAsRead(
                Number(
                  item.dataset.id
                )
              );

            }
          );

        }
      );

  }


  // =========================================
  // MARK AS READ
  // =========================================

  function markAsRead(id) {

    const notifications =
      getNotifications();


    const updated =
      notifications.map(
        (notification) => {

          if (
            notification.id === id
          ) {

            return {
              ...notification,
              read: true
            };

          }

          return notification;

        }
      );


    saveNotifications(
      updated
    );


    renderNotifications();

  }


  // =========================================
  // ICONS
  // =========================================

  function getNotificationIcon(
    type
  ) {

    if (
      type === "security"
    ) {

      return "✓";

    }

    if (
      type === "account"
    ) {

      return "👤";

    }

    if (
      type === "transaction"
    ) {

      return "↕";

    }

    if (
      type === "payment"
    ) {

      return "₹";

    }

    return "i";

  }


  // =========================================
  // ESCAPE HTML
  // =========================================

  function escapeNotificationHTML(
    value
  ) {

    return String(value ?? "")
      .replace(
        /&/g,
        "&amp;"
      )
      .replace(
        /</g,
        "&lt;"
      )
      .replace(
        />/g,
        "&gt;"
      )
      .replace(
        /"/g,
        "&quot;"
      )
      .replace(
        /'/g,
        "&#039;"
      );

  }

});

// =========================================
// BILL PAYMENTS
// =========================================

document.addEventListener("DOMContentLoaded", () => {

  const billService =
    document.getElementById("bill-payment-service");

  const billModal =
    document.getElementById("bill-payment-modal");

  const billClose =
    document.getElementById("bill-payment-modal-close");

  const billOverlay =
    document.querySelector(
      ".bill-payment-modal-overlay"
    );

  const billCategory =
    document.getElementById(
      "bill-payment-category"
    );

  const billBiller =
    document.getElementById(
      "bill-payment-biller"
    );

  const billCustomer =
    document.getElementById(
      "bill-payment-customer"
    );

  const billAmount =
    document.getElementById(
      "bill-payment-amount"
    );

  const billSubmit =
    document.getElementById(
      "bill-payment-submit"
    );

  const billMessage =
    document.getElementById(
      "bill-payment-message"
    );

  const billSummaryAmount =
    document.getElementById(
      "bill-payment-summary-amount"
    );


  // Stop safely if elements are missing

  if (
    !billService ||
    !billModal
  ) {
    return;
  }


  // =========================================
  // OPEN MODAL
  // =========================================

  function openBillModal() {

    billModal.classList.add("open");

    billModal.setAttribute(
      "aria-hidden",
      "false"
    );

  }


  // =========================================
  // CLOSE MODAL
  // =========================================

  function closeBillModal() {

    billModal.classList.remove("open");

    billModal.setAttribute(
      "aria-hidden",
      "true"
    );

    clearBillMessage();

  }


  // =========================================
  // SERVICE CLICK
  // =========================================

  billService.addEventListener(
    "click",
    openBillModal
  );


  // =========================================
  // KEYBOARD ACCESS
  // =========================================

  billService.addEventListener(
    "keydown",
    (event) => {

      if (
        event.key === "Enter" ||
        event.key === " "
      ) {

        event.preventDefault();

        openBillModal();

      }

    }
  );


  // =========================================
  // CLOSE BUTTON
  // =========================================

  if (billClose) {

    billClose.addEventListener(
      "click",
      closeBillModal
    );

  }


  // =========================================
  // OUTSIDE CLICK
  // =========================================

  if (billOverlay) {

    billOverlay.addEventListener(
      "click",
      closeBillModal
    );

  }


  // =========================================
  // ESC KEY
  // =========================================

  document.addEventListener(
    "keydown",
    (event) => {

      if (
        event.key === "Escape" &&
        billModal.classList.contains("open")
      ) {

        closeBillModal();

      }

    }
  );


  // =========================================
  // QUICK AMOUNTS
  // =========================================

  document
    .querySelectorAll(
      ".bill-amount-btn"
    )
    .forEach(
      (button) => {

        button.addEventListener(
          "click",
          () => {

            billAmount.value =
              button.dataset.amount;

            updateBillSummary();

          }
        );

      }
    );


  // =========================================
  // AMOUNT INPUT
  // =========================================

  if (billAmount) {

    billAmount.addEventListener(
      "input",
      updateBillSummary
    );

  }


  function updateBillSummary() {

    const amount =
      Number(
        billAmount.value
      ) || 0;

    billSummaryAmount.textContent =
      formatBillCurrency(amount);

  }


  // =========================================
  // PAY BILL
  // =========================================

  if (billSubmit) {

    billSubmit.addEventListener(
      "click",
      () => {

        clearBillMessage();


        const category =
          billCategory.value;

        const biller =
          billBiller.value.trim();

        const customerNumber =
          billCustomer.value.trim();

        const amount =
          Number(
            billAmount.value
          );


        // Validate category

        if (!category) {

          showBillMessage(
            "Please select a bill category.",
            "error"
          );

          return;

        }


        // Validate biller

        if (!biller) {

          showBillMessage(
            "Please enter the biller or provider name.",
            "error"
          );

          return;

        }


        // Validate customer number

        if (!customerNumber) {

          showBillMessage(
            "Please enter your customer or bill number.",
            "error"
          );

          return;

        }


        // Validate amount

        if (
          !amount ||
          amount <= 0
        ) {

          showBillMessage(
            "Please enter a valid payment amount.",
            "error"
          );

          return;

        }


        // =========================================
        // SIMULATED PAYMENT
        // =========================================

        billSubmit.disabled = true;

        billSubmit.textContent =
          "Processing…";


        setTimeout(
          () => {

            const transactionId =
              "BILL" +
              Date.now()
                .toString()
                .slice(-8);


            showBillMessage(
              `Bill payment successful. Transaction ID: ${transactionId}`,
              "success"
            );


            billSubmit.textContent =
              "Payment successful";


            setTimeout(
              () => {

                billSubmit.disabled =
                  false;

                billSubmit.textContent =
                  "Pay bill";

              },
              2000
            );

          },
          1200
        );

      }
    );

  }


  // =========================================
  // MESSAGE
  // =========================================

  function showBillMessage(
    message,
    type
  ) {

    if (!billMessage) {
      return;
    }

    billMessage.textContent =
      message;

    billMessage.classList.add(
      "visible"
    );

    billMessage.classList.remove(
      "success",
      "error"
    );

    billMessage.classList.add(
      type
    );

  }


  function clearBillMessage() {

    if (!billMessage) {
      return;
    }

    billMessage.textContent =
      "";

    billMessage.classList.remove(
      "visible",
      "success",
      "error"
    );

  }


  // =========================================
  // CURRENCY
  // =========================================

  function formatBillCurrency(
    amount
  ) {

    return new Intl.NumberFormat(
      "en-US",
      {
        style: "currency",
        currency: "USD"
      }
    ).format(
      Number(amount) || 0
    );

  }

});