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