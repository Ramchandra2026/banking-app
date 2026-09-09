let primaryAccount = null;

document.addEventListener("DOMContentLoaded", async () => {
  Auth.requireAuthOrRedirect();

  document.getElementById("logout-btn").addEventListener("click", () => {
    Auth.clear();
    window.location.href = "login.html";
  });

  setupTabs();

  try {
    const { accounts } = await apiRequest("/account/me");
    primaryAccount = accounts[0];
    await loadHistory();
  } catch (err) {
    if (err.message.includes("token")) {
      Auth.clear();
      window.location.href = "login.html";
      return;
    }
    document.getElementById("full-ledger").innerHTML = `<div class="empty-state">${err.message}</div>`;
  }

  // Deep-link support: transactions.html?tab=deposit
  const params = new URLSearchParams(window.location.search);
  const requestedTab = params.get("tab");
  if (requestedTab === "deposit") activateTab("deposit");

  document.getElementById("transfer-form").addEventListener("submit", handleTransfer);
  document.getElementById("deposit-form").addEventListener("submit", handleDeposit);
});

function setupTabs() {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => activateTab(btn.dataset.tab));
  });
}

function activateTab(tabName) {
  document.querySelectorAll(".tab-btn").forEach((b) => b.classList.toggle("active", b.dataset.tab === tabName));
  document.querySelectorAll(".tab-panel").forEach((p) => p.classList.toggle("active", p.id === `tab-${tabName}`));
}

function showNote(elId, message, isError = true) {
  const note = document.getElementById(elId);
  note.textContent = message;
  note.classList.add("visible");
  note.classList.toggle("success", !isError);
}

function clearNote(elId) {
  document.getElementById(elId).classList.remove("visible");
}

async function handleTransfer(e) {
  e.preventDefault();
  clearNote("transfer-note");

  if (!primaryAccount) return;

  const toAccountNumber = document.getElementById("toAccountNumber").value.trim();
  const amount = document.getElementById("transferAmount").value;
  const note = document.getElementById("transferNote").value.trim();
  const submitBtn = document.getElementById("transfer-submit");

  submitBtn.disabled = true;
  submitBtn.textContent = "Sending…";

  try {
    await apiRequest("/transactions/transfer", {
      method: "POST",
      body: { fromAccountId: primaryAccount.id, toAccountNumber, amount, note },
    });
    showNote("transfer-note", "Transfer sent.", false);
    e.target.reset();
    const { accounts } = await apiRequest("/account/me");
    primaryAccount = accounts[0];
    await loadHistory();
  } catch (err) {
    showNote("transfer-note", err.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Send transfer";
  }
}

async function handleDeposit(e) {
  e.preventDefault();
  clearNote("deposit-note");

  if (!primaryAccount) return;

  const amount = document.getElementById("depositAmount").value;
  const note = document.getElementById("depositNote").value.trim();
  const submitBtn = document.getElementById("deposit-submit");

  submitBtn.disabled = true;
  submitBtn.textContent = "Adding…";

  try {
    await apiRequest("/transactions/deposit", {
      method: "POST",
      body: { accountId: primaryAccount.id, amount, note },
    });
    showNote("deposit-note", "Funds added.", false);
    e.target.reset();
    const { accounts } = await apiRequest("/account/me");
    primaryAccount = accounts[0];
    await loadHistory();
  } catch (err) {
    showNote("deposit-note", err.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Add funds";
  }
}

async function loadHistory() {
  if (!primaryAccount) return;
  const { history } = await apiRequest(`/transactions?accountId=${primaryAccount.id}`);
  const container = document.getElementById("full-ledger");

  if (!history.length) {
    container.innerHTML = '<div class="empty-state">No activity yet.</div>';
    return;
  }

  container.innerHTML = history
    .map((entry) => {
      const sign = entry.direction === "credit" ? "+" : "\u2212";
      const label =
        entry.type === "deposit"
          ? "Deposit"
          : entry.type === "transfer" && entry.direction === "credit"
          ? "Transfer received"
          : "Transfer sent";
      const counterparty = entry.counterpartyAccount
        ? `<span class="counterparty">Acct •• ${entry.counterpartyAccount.slice(-4)}</span>`
        : "";

      return `
        <div class="ledger-row">
          <div class="date">${formatDate(entry.createdAt)}</div>
          <div class="desc">${label} ${entry.note ? `— ${entry.note}` : ""}${counterparty}</div>
          <div class="amount ${entry.direction}">${sign} ${formatCurrency(entry.amount)}</div>
        </div>
      `;
    })
    .join("");
}
