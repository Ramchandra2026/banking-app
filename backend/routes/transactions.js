const express = require("express");
const db = require("../db/database");
const requireAuth = require("../middleware/auth");

const router = express.Router();

function getOwnedAccount(userId, accountId) {
  return db
    .prepare("SELECT * FROM accounts WHERE id = ? AND user_id = ?")
    .get(accountId, userId);
}

// GET /api/transactions?accountId=1  -> history for one of the user's accounts
router.get("/", requireAuth, (req, res) => {
  const accountId = Number(req.query.accountId);
  const account = getOwnedAccount(req.userId, accountId);
  if (!account) {
    return res.status(404).json({ error: "Account not found." });
  }

  const rows = db
    .prepare(
      `SELECT t.*, fa.account_number AS from_number, ta.account_number AS to_number
       FROM transactions t
       LEFT JOIN accounts fa ON fa.id = t.from_account_id
       LEFT JOIN accounts ta ON ta.id = t.to_account_id
       WHERE t.from_account_id = ? OR t.to_account_id = ?
       ORDER BY t.id DESC`
    )
    .all(accountId, accountId);

  const history = rows.map((r) => ({
    id: r.id,
    type: r.type,
    amount: r.amount_cents / 100,
    note: r.note,
    createdAt: r.created_at,
    direction: r.to_account_id === accountId ? "credit" : "debit",
    counterpartyAccount:
      r.to_account_id === accountId ? r.from_number : r.to_number,
  }));

  res.json({ history });
});

// POST /api/transactions/deposit  { accountId, amount, note }
router.post("/deposit", requireAuth, (req, res) => {
  const { accountId, amount, note } = req.body;
  const amountCents = Math.round(Number(amount) * 100);

  if (!accountId || !amountCents || amountCents <= 0) {
    return res.status(400).json({ error: "A valid accountId and positive amount are required." });
  }

  const account = getOwnedAccount(req.userId, accountId);
  if (!account) return res.status(404).json({ error: "Account not found." });

  const runDeposit = db.transaction(() => {
    db.prepare("UPDATE accounts SET balance_cents = balance_cents + ? WHERE id = ?").run(
      amountCents,
      accountId
    );
    db.prepare(
      "INSERT INTO transactions (to_account_id, amount_cents, type, note) VALUES (?, ?, 'deposit', ?)"
    ).run(accountId, amountCents, note || "Deposit");
  });
  runDeposit();

  res.status(201).json({ message: "Deposit successful." });
});

// POST /api/transactions/transfer  { fromAccountId, toAccountNumber, amount, note }
router.post("/transfer", requireAuth, (req, res) => {
  const { fromAccountId, toAccountNumber, amount, note } = req.body;
  const amountCents = Math.round(Number(amount) * 100);

  if (!fromAccountId || !toAccountNumber || !amountCents || amountCents <= 0) {
    return res
      .status(400)
      .json({ error: "fromAccountId, toAccountNumber and a positive amount are required." });
  }

  const fromAccount = getOwnedAccount(req.userId, fromAccountId);
  if (!fromAccount) return res.status(404).json({ error: "Source account not found." });

  const toAccount = db
    .prepare("SELECT * FROM accounts WHERE account_number = ?")
    .get(String(toAccountNumber).trim());
  if (!toAccount) return res.status(404).json({ error: "Recipient account number not found." });

  if (toAccount.id === fromAccount.id) {
    return res.status(400).json({ error: "Cannot transfer to the same account." });
  }
  if (fromAccount.balance_cents < amountCents) {
    return res.status(400).json({ error: "Insufficient funds." });
  }

  const runTransfer = db.transaction(() => {
    db.prepare("UPDATE accounts SET balance_cents = balance_cents - ? WHERE id = ?").run(
      amountCents,
      fromAccount.id
    );
    db.prepare("UPDATE accounts SET balance_cents = balance_cents + ? WHERE id = ?").run(
      amountCents,
      toAccount.id
    );
    db.prepare(
      `INSERT INTO transactions (from_account_id, to_account_id, amount_cents, type, note)
       VALUES (?, ?, ?, 'transfer', ?)`
    ).run(fromAccount.id, toAccount.id, amountCents, note || "Transfer");
  });
  runTransfer();

  res.status(201).json({ message: "Transfer successful." });
});

module.exports = router;
