let primaryAccount = null;


/* =====================================
   TRANSFER PASSCODE
===================================== */

const TRANSFER_PASSCODE = "1234";


/* =====================================
   ADD FUNDS
===================================== */

const ADD_FUNDS_PASSCODE = "1234";


/* =====================================
   PAGE INITIALIZATION
===================================== */

document.addEventListener("DOMContentLoaded", async () => {

  Auth.requireAuthOrRedirect();


  /* =====================================
     LOGOUT
  ====================================== */

  const logoutBtn =
    document.getElementById("logout-btn");

  if (logoutBtn) {

    logoutBtn.addEventListener("click", () => {

      Auth.clear();

      window.location.href = "auth.html";

    });

  }


  /* =====================================
     SETUP
  ====================================== */

  setupTabs();

  setupFundingMethods();


  /* =====================================
     LOAD ACCOUNT
  ====================================== */

  try {

    const response =
      await apiRequest("/account/me");


    primaryAccount =
      response.accounts?.[0] || null;


    if (!primaryAccount) {

      throw new Error(
        "No bank account was found."
      );

    }


    await loadHistory();

  } catch (err) {

    if (
      err.message &&
      err.message
        .toLowerCase()
        .includes("token")
    ) {

      Auth.clear();

      window.location.href = "auth.html";

      return;

    }


    const ledger =
      document.getElementById(
        "full-ledger"
      );


    if (ledger) {

      ledger.innerHTML =
        `<div class="empty-state">
          ${escapeHTML(err.message)}
        </div>`;

    }

  }


  /* =====================================
     DEEP LINK
  ====================================== */

  const params =
    new URLSearchParams(
      window.location.search
    );


  const requestedTab =
    params.get("tab");


  if (
    requestedTab === "deposit"
  ) {

    activateTab("deposit");

  }


  /* =====================================
     TRANSFER FORM
  ====================================== */

  const transferForm =
    document.getElementById(
      "transfer-form"
    );


  if (transferForm) {

    transferForm.addEventListener(
      "submit",
      handleTransfer
    );

  }


  /* =====================================
     ADD FUNDS FORM
  ====================================== */

  const depositForm =
    document.getElementById(
      "deposit-form"
    );


  if (depositForm) {

    depositForm.addEventListener(
      "submit",
      handleDeposit
    );

  }

});


/* =====================================
   TABS
===================================== */

function setupTabs() {

  document
    .querySelectorAll(".tab-btn")
    .forEach((btn) => {

      btn.addEventListener(
        "click",
        () => {

          activateTab(
            btn.dataset.tab
          );

        }
      );

    });

}


function activateTab(tabName) {

  document
    .querySelectorAll(".tab-btn")
    .forEach((btn) => {

      btn.classList.toggle(
        "active",
        btn.dataset.tab === tabName
      );

    });


  document
    .querySelectorAll(".tab-panel")
    .forEach((panel) => {

      panel.classList.toggle(
        "active",
        panel.id ===
          `tab-${tabName}`
      );

    });

}


/* =====================================
   MESSAGE HELPERS
===================================== */

function showNote(
  elId,
  message,
  isError = true
) {

  const note =
    document.getElementById(
      elId
    );


  if (!note) return;


  note.textContent = message;


  note.classList.add(
    "visible"
  );


  note.classList.toggle(
    "success",
    !isError
  );

}


function clearNote(elId) {

  const note =
    document.getElementById(
      elId
    );


  if (!note) return;


  note.textContent = "";


  note.classList.remove(
    "visible",
    "success"
  );

}


/* =====================================
   TRANSFER PASSCODE MESSAGE
===================================== */

function clearTransferPasscodeMessage() {

  const message =
    document.getElementById(
      "transfer-passcode-message"
    );


  if (!message) return;


  message.textContent = "";


  message.classList.remove(
    "error",
    "success"
  );

}


function showTransferPasscodeMessage(
  message,
  isError = true
) {

  const element =
    document.getElementById(
      "transfer-passcode-message"
    );


  if (!element) return;


  element.textContent =
    message;


  element.classList.remove(
    "error",
    "success"
  );


  element.classList.add(
    isError
      ? "error"
      : "success"
  );

}


/* =====================================
   ADD FUNDS PASSCODE MESSAGE
===================================== */

function clearDepositPasscodeMessage() {

  const message =
    document.getElementById(
      "deposit-passcode-message"
    );


  if (!message) return;


  message.textContent = "";


  message.classList.remove(
    "error",
    "success"
  );

}


function showDepositPasscodeMessage(
  message,
  isError = true
) {

  const element =
    document.getElementById(
      "deposit-passcode-message"
    );


  if (!element) return;


  element.textContent =
    message;


  element.classList.remove(
    "error",
    "success"
  );


  element.classList.add(
    isError
      ? "error"
      : "success"
  );

}


/* =====================================
   FUNDING METHOD SETUP
===================================== */

function setupFundingMethods() {

  const fundingMethod =
    document.getElementById(
      "fundingMethod"
    );


  if (!fundingMethod) return;


  fundingMethod.addEventListener(
    "change",
    handleFundingMethodChange
  );


  handleFundingMethodChange();

}


/* =====================================
   CHANGE FUNDING METHOD
===================================== */

function handleFundingMethodChange() {

  const fundingMethod =
    document.getElementById(
      "fundingMethod"
    );


  if (!fundingMethod) return;


  const method =
    fundingMethod.value;


  const cardDetails =
    document.getElementById(
      "card-details"
    );


  const upiDetails =
    document.getElementById(
      "upi-details"
    );


  const bankDetails =
    document.getElementById(
      "bank-details"
    );


  /* =====================================
     HIDE EVERYTHING
  ====================================== */

  if (cardDetails) {

    cardDetails.hidden = true;

  }


  if (upiDetails) {

    upiDetails.hidden = true;

  }


  if (bankDetails) {

    bankDetails.hidden = true;

  }


  /* =====================================
     SHOW SELECTED METHOD
  ====================================== */

  if (
    method === "card" &&
    cardDetails
  ) {

    cardDetails.hidden = false;

  }


  if (
    method === "upi" &&
    upiDetails
  ) {

    upiDetails.hidden = false;

  }


  if (
    method === "bank" &&
    bankDetails
  ) {

    bankDetails.hidden = false;

  }

}


/* =====================================
   HANDLE TRANSFER
===================================== */

async function handleTransfer(e) {

  e.preventDefault();


  clearNote(
    "transfer-note"
  );


  clearTransferPasscodeMessage();


  if (!primaryAccount) {

    showNote(
      "transfer-note",
      "Your account could not be loaded. Please refresh the page."
    );

    return;

  }


  const toAccountNumber =
    document
      .getElementById(
        "toAccountNumber"
      )
      .value
      .trim();


  const amount =
    document
      .getElementById(
        "transferAmount"
      )
      .value;


  const note =
    document
      .getElementById(
        "transferNote"
      )
      .value
      .trim();


  const passcodeInput =
    document.getElementById(
      "transfer-passcode"
    );


  const passcode =
    passcodeInput
      ? passcodeInput.value.trim()
      : "";


  const submitBtn =
    document.getElementById(
      "transfer-submit"
    );


  /* =====================================
     VALIDATE RECIPIENT
  ====================================== */

  if (!toAccountNumber) {

    showNote(
      "transfer-note",
      "Please enter the recipient account number."
    );

    return;

  }


  /* =====================================
     VALIDATE AMOUNT
  ====================================== */

  const numericAmount =
    Number(amount);


  if (
    !Number.isFinite(
      numericAmount
    ) ||
    numericAmount <= 0
  ) {

    showNote(
      "transfer-note",
      "Please enter a valid transfer amount."
    );

    return;

  }


  /* =====================================
     VALIDATE PASSCODE
  ====================================== */

  if (!passcode) {

    showTransferPasscodeMessage(
      "Please enter your 4-digit passcode."
    );


    if (passcodeInput) {

      passcodeInput.focus();

    }


    return;

  }


  if (!/^\d{4}$/.test(passcode)) {

    showTransferPasscodeMessage(
      "Passcode must contain exactly 4 digits."
    );


    if (passcodeInput) {

      passcodeInput.focus();

      passcodeInput.select();

    }


    return;

  }


  if (
    passcode !==
    TRANSFER_PASSCODE
  ) {

    showTransferPasscodeMessage(
      "Incorrect passcode. Transfer was blocked."
    );


    if (passcodeInput) {

      passcodeInput.focus();

      passcodeInput.select();

    }


    return;

  }


  /* =====================================
     PASSCODE VERIFIED
  ====================================== */

  showTransferPasscodeMessage(
    "Passcode verified.",
    false
  );


  submitBtn.disabled = true;

  submitBtn.textContent =
    "Sending…";


  try {

    await apiRequest(
      "/transactions/transfer",
      {

        method: "POST",

        body: {

          fromAccountId:
            primaryAccount.id,

          toAccountNumber,

          amount,

          note,

        },

      }
    );


    const reference =
      "LED" +
      Date.now()
        .toString()
        .slice(-10);


    showNote(
      "transfer-note",
      "Transfer sent successfully.",
      false
    );


    showTransactionConfirmation(
      "transfer",
      amount,
      reference
    );


    e.target.reset();


    clearTransferPasscodeMessage();


    const response =
      await apiRequest(
        "/account/me"
      );


    primaryAccount =
      response.accounts?.[0] ||
      null;


    await loadHistory();


  } catch (err) {

    showNote(
      "transfer-note",
      err.message ||
        "Transfer failed."
    );

  } finally {

    submitBtn.disabled =
      false;

    submitBtn.textContent =
      "Send money";

  }

}


/* =====================================
   HANDLE ADD FUNDS
===================================== */

async function handleDeposit(e) {

  e.preventDefault();


  clearNote(
    "deposit-note"
  );


  clearDepositPasscodeMessage();


  if (!primaryAccount) {

    showNote(
      "deposit-note",
      "Your account could not be loaded. Please refresh the page."
    );

    return;

  }


  /* =====================================
     GET BASIC VALUES
  ====================================== */

  const amount =
    document
      .getElementById(
        "depositAmount"
      )
      .value;


  const numericAmount =
    Number(amount);


  const fundingMethod =
    document
      .getElementById(
        "fundingMethod"
      )
      .value;


  const note =
    document
      .getElementById(
        "depositNote"
      )
      .value
      .trim();


  const passcodeInput =
    document.getElementById(
      "deposit-passcode"
    );


  const passcode =
    passcodeInput
      ? passcodeInput.value.trim()
      : "";


  const submitBtn =
    document.getElementById(
      "deposit-submit"
    );


  /* =====================================
     VALIDATE AMOUNT
  ====================================== */

  if (
    !Number.isFinite(
      numericAmount
    ) ||
    numericAmount <= 0
  ) {

    showNote(
      "deposit-note",
      "Please enter a valid amount greater than zero."
    );

    return;

  }


  /* =====================================
     VALIDATE FUNDING METHOD
  ====================================== */

  if (
    ![
      "card",
      "upi",
      "bank"
    ].includes(
      fundingMethod
    )
  ) {

    showNote(
      "deposit-note",
      "Please select a funding method."
    );

    return;

  }


  /* =====================================
     COLLECT FUNDING DETAILS
  ====================================== */

  let fundingReference =
    "";


  /* =====================================
     CARD
  ====================================== */

  if (
    fundingMethod ===
    "card"
  ) {

    const cardNumber =
      document
        .getElementById(
          "cardNumber"
        )
        .value
        .replace(
          /\s/g,
          ""
        );


    const cardExpiry =
      document
        .getElementById(
          "cardExpiry"
        )
        .value
        .trim();


    const cardCvv =
      document
        .getElementById(
          "cardCvv"
        )
        .value
        .trim();


    if (
      !/^\d{16}$/.test(
        cardNumber
      )
    ) {

      showNote(
        "deposit-note",
        "Please enter a valid 16-digit card number."
      );

      return;

    }


    if (
      !/^(0[1-9]|1[0-2])\/\d{2}$/.test(
        cardExpiry
      )
    ) {

      showNote(
        "deposit-note",
        "Please enter the card expiry in MM/YY format."
      );

      return;

    }


    if (
      !/^\d{3,4}$/.test(
        cardCvv
      )
    ) {

      showNote(
        "deposit-note",
        "Please enter a valid CVV."
      );

      return;

    }


    /*
      This is a demonstration only.
      We do not send the full card number
      to the backend.
    */

    fundingReference =
      `Card ending ${cardNumber.slice(-4)}`;

  }


  /* =====================================
     UPI
  ====================================== */

  if (
    fundingMethod ===
    "upi"
  ) {

    const upiId =
      document
        .getElementById(
          "upiId"
        )
        .value
        .trim()
        .toLowerCase();


    if (
      !/^[a-zA-Z0-9._-]{2,}@[a-zA-Z0-9._-]{2,}$/.test(
        upiId
      )
    ) {

      showNote(
        "deposit-note",
        "Please enter a valid UPI ID."
      );

      return;

    }


    fundingReference =
      upiId;

  }


  /* =====================================
     BANK ACCOUNT
  ====================================== */

  if (
    fundingMethod ===
    "bank"
  ) {

    const bankAccountNumber =
      document
        .getElementById(
          "bankAccountNumber"
        )
        .value
        .trim();


    const bankIfsc =
      document
        .getElementById(
          "bankIfsc"
        )
        .value
        .trim()
        .toUpperCase();


    if (
      !/^\d{8,18}$/.test(
        bankAccountNumber
      )
    ) {

      showNote(
        "deposit-note",
        "Please enter a valid bank account number."
      );

      return;

    }


    if (
      !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(
        bankIfsc
      )
    ) {

      showNote(
        "deposit-note",
        "Please enter a valid IFSC code."
      );

      return;

    }


    fundingReference =
      `Bank account ending ${bankAccountNumber.slice(-4)} (${bankIfsc})`;

  }


  /* =====================================
     VALIDATE PASSCODE
  ====================================== */

  if (!passcode) {

    showDepositPasscodeMessage(
      "Please enter your 4-digit passcode."
    );


    if (passcodeInput) {

      passcodeInput.focus();

    }


    return;

  }


  if (!/^\d{4}$/.test(passcode)) {

    showDepositPasscodeMessage(
      "Passcode must contain exactly 4 digits."
    );


    if (passcodeInput) {

      passcodeInput.focus();

      passcodeInput.select();

    }


    return;

  }


  /*
    Frontend check for immediate feedback.
    The backend ALSO verifies the passcode.
  */

  if (
    passcode !==
    ADD_FUNDS_PASSCODE
  ) {

    showDepositPasscodeMessage(
      "Incorrect passcode. Add funds was blocked."
    );


    if (passcodeInput) {

      passcodeInput.focus();

      passcodeInput.select();

    }


    return;

  }


  /* =====================================
     PASSCODE VERIFIED
  ====================================== */

  showDepositPasscodeMessage(
    "Passcode verified.",
    false
  );


  submitBtn.disabled = true;

  submitBtn.textContent =
    "Processing…";


  try {

    /* =====================================
       CALL NEW ADD FUNDS ENDPOINT
    ====================================== */

    const response =
      await apiRequest(
        "/transactions/add-funds",
        {

          method: "POST",

          body: {

            accountId:
              primaryAccount.id,

            amount,

            fundingMethod,

            fundingReference,

            note,

            passcode,

          },

        }
      );


    /* =====================================
       SUCCESS MESSAGE
    ====================================== */

    showNote(
      "deposit-note",
      "Funds added successfully.",
      false
    );


    /* =====================================
       CONFIRMATION
    ====================================== */

    showTransactionConfirmation(
      "deposit",
      amount,
      response.reference ||
        generateReference()
    );


    /* =====================================
       RESET FORM
    ====================================== */

    e.target.reset();


    clearDepositPasscodeMessage();


    /* =====================================
       HIDE FUNDING DETAILS
    ====================================== */

    handleFundingMethodChange();


    /* =====================================
       RELOAD ACCOUNT
    ====================================== */

    const accountResponse =
      await apiRequest(
        "/account/me"
      );


    primaryAccount =
      accountResponse.accounts?.[0] ||
      null;


    /* =====================================
       RELOAD HISTORY
    ====================================== */

    await loadHistory();


  } catch (err) {

    showNote(
      "deposit-note",
      err.message ||
        "Unable to add funds."
    );

  } finally {

    submitBtn.disabled =
      false;

    submitBtn.textContent =
      "Add funds";

  }

}


/* =====================================
   GENERATE REFERENCE
===================================== */

function generateReference() {

  return (
    "LED" +
    Date.now()
      .toString()
      .slice(-10)
  );

}


/* =====================================
   LOAD TRANSACTION HISTORY
===================================== */

async function loadHistory() {

  if (!primaryAccount) return;


  const response =
    await apiRequest(
      `/transactions?accountId=${primaryAccount.id}`
    );


  const history =
    response.history || [];


  const container =
    document.getElementById(
      "full-ledger"
    );


  if (!container) return;


  if (!history.length) {

    container.innerHTML =
      '<div class="empty-state">No activity yet.</div>';

    return;

  }


  container.innerHTML =
    history
      .map((entry) => {

        const sign =
          entry.direction ===
          "credit"
            ? "+"
            : "\u2212";


        const label =
          entry.type ===
          "deposit"

            ? "Deposit"

            : entry.type ===
                "transfer" &&
              entry.direction ===
                "credit"

            ? "Transfer received"

            : "Transfer sent";


        const counterparty =
          entry.counterpartyAccount

            ? `<span class="counterparty">
                 Acct •• ${escapeHTML(
                   String(
                     entry.counterpartyAccount
                   ).slice(-4)
                 )}
               </span>`

            : "";


        const safeNote =
          entry.note

            ? ` — ${escapeHTML(
                String(
                  entry.note
                )
              )}`

            : "";


        return `
          <div class="ledger-row">

            <div class="date">
              ${formatDate(
                entry.createdAt
              )}
            </div>

            <div class="desc">
              ${label}${safeNote}
              ${counterparty}
            </div>

            <div class="amount ${entry.direction}">
              ${sign}
              ${formatCurrency(
                entry.amount
              )}
            </div>

          </div>
        `;

      })
      .join("");

}


/* =====================================
   TRANSACTION CONFIRMATION
===================================== */

function showTransactionConfirmation(
  type,
  amount,
  reference
) {

  const formattedAmount =
    Number(amount).toLocaleString(
      "en-IN",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }
    );


  const transactionType =
    type === "transfer"
      ? "Money Transfer"
      : "Add Funds";


  const message =
    `Transaction Successful!\n\n` +
    `${transactionType}\n` +
    `Amount: ₹${formattedAmount}\n` +
    `Reference: ${reference}\n\n` +
    `A confirmation notification has been generated.`;


  alert(message);

}


/* =====================================
   FORMAT CURRENCY
===================================== */

function formatCurrency(value) {

  const number =
    Number(value) || 0;


  return new Intl.NumberFormat(
    "en-IN",
    {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }
  ).format(number);

}


/* =====================================
   FORMAT DATE
===================================== */

function formatDate(value) {

  if (!value) {
    return "—";
  }


  const date =
    new Date(value);


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {

    return escapeHTML(
      String(value)
    );

  }


  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }
  );

}


/* =====================================
   ESCAPE HTML
===================================== */

function escapeHTML(value) {

  return String(value)
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