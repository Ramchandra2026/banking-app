const express = require("express");
const db = require("../db/database");
const requireAuth = require("../middleware/auth");

const router = express.Router();

/* =====================================
   DEMO SECURITY
===================================== */

const ADD_FUNDS_PASSCODE = "1234";
const TRANSFER_PASSCODE = "1234";

/* =====================================
   GET OWNED ACCOUNT
===================================== */

function getOwnedAccount(userId, accountId) {
  return db
    .prepare(
      "SELECT * FROM accounts WHERE id = ? AND user_id = ?"
    )
    .get(accountId, userId);
}

/* =====================================
   GET TRANSACTION HISTORY
===================================== */

// GET /api/transactions?accountId=1
router.get("/", requireAuth, (req, res) => {
  const accountId =
    Number(req.query.accountId);

  if (!accountId) {
    return res.status(400).json({
      error: "Account ID is required.",
    });
  }

  const account =
    getOwnedAccount(
      req.userId,
      accountId
    );

  if (!account) {
    return res.status(404).json({
      error: "Account not found.",
    });
  }

  const rows =
    db
      .prepare(
        `SELECT
           t.*,
           fa.account_number AS from_number,
           ta.account_number AS to_number
         FROM transactions t
         LEFT JOIN accounts fa
           ON fa.id = t.from_account_id
         LEFT JOIN accounts ta
           ON ta.id = t.to_account_id
         WHERE
           t.from_account_id = ?
           OR t.to_account_id = ?
         ORDER BY t.id DESC`
      )
      .all(
        accountId,
        accountId
      );

  const history =
    rows.map((r) => ({
      id: r.id,

      type: r.type,

      amount:
        r.amount_cents / 100,

      note: r.note,

      createdAt:
        r.created_at,

      direction:
        r.to_account_id === accountId
          ? "credit"
          : "debit",

      counterpartyAccount:
        r.to_account_id === accountId
          ? r.from_number
          : r.to_number,
    }));

  res.json({
    history,
  });
});

/* =====================================
   LEGACY DEPOSIT
===================================== */

// POST /api/transactions/deposit
//
// Kept for compatibility with the existing
// application. The new Add Funds flow will
// use /add-funds.

router.post(
  "/deposit",
  requireAuth,
  (req, res) => {

    const {
      accountId,
      amount,
      note,
    } = req.body;

    const numericAmount =
      Number(amount);

    if (
      !accountId ||
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      return res.status(400).json({
        error:
          "A valid accountId and positive amount are required.",
      });
    }

    const amountCents =
      Math.round(
        numericAmount * 100
      );

    if (amountCents <= 0) {
      return res.status(400).json({
        error:
          "The amount must be greater than zero.",
      });
    }

    const account =
      getOwnedAccount(
        req.userId,
        accountId
      );

    if (!account) {
      return res.status(404).json({
        error: "Account not found.",
      });
    }

    const runDeposit =
      db.transaction(() => {

        db
          .prepare(
            `UPDATE accounts
             SET balance_cents =
               balance_cents + ?
             WHERE id = ?`
          )
          .run(
            amountCents,
            accountId
          );

        db
          .prepare(
            `INSERT INTO transactions
             (
               to_account_id,
               amount_cents,
               type,
               note
             )
             VALUES
             (
               ?,
               ?,
               'deposit',
               ?
             )`
          )
          .run(
            accountId,
            amountCents,
            note || "Deposit"
          );
      });

    runDeposit();

    res.status(201).json({
      message:
        "Deposit successful.",
    });
  }
);

/* =====================================
   ADD FUNDS
===================================== */

/*
  POST /api/transactions/add-funds

  Expected body:

  {
    accountId,
    amount,
    fundingMethod,
    fundingReference,
    note,
    passcode
  }

  Example funding methods:

  "card"
  "upi"
  "bank"

  IMPORTANT:
  This is a demonstration flow.
  The external funding source is simulated.
*/

router.post(
  "/add-funds",
  requireAuth,
  (req, res) => {

    const {
      accountId,
      amount,
      fundingMethod,
      fundingReference,
      note,
      passcode,
    } = req.body;

    /* =====================================
       VALIDATE ACCOUNT
    ====================================== */

    if (!accountId) {
      return res.status(400).json({
        error:
          "Account information is required.",
      });
    }

    const account =
      getOwnedAccount(
        req.userId,
        accountId
      );

    if (!account) {
      return res.status(404).json({
        error: "Account not found.",
      });
    }

    /* =====================================
       VALIDATE AMOUNT
    ====================================== */

    const numericAmount =
      Number(amount);

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      return res.status(400).json({
        error:
          "Please enter a valid amount greater than zero.",
      });
    }

    const amountCents =
      Math.round(
        numericAmount * 100
      );

    if (amountCents <= 0) {
      return res.status(400).json({
        error:
          "The amount must be greater than zero.",
      });
    }

    /* =====================================
       MAXIMUM DEMO LIMIT
    ====================================== */

    const MAX_ADD_FUNDS_CENTS =
      100000000;

    if (
      amountCents >
      MAX_ADD_FUNDS_CENTS
    ) {
      return res.status(400).json({
        error:
          "For this demonstration, the maximum funding amount is ₹1,000,000.",
      });
    }

    /* =====================================
       VALIDATE FUNDING METHOD
    ====================================== */

    const allowedMethods = [
      "card",
      "upi",
      "bank",
    ];

    if (
      !allowedMethods.includes(
        String(fundingMethod)
      )
    ) {
      return res.status(400).json({
        error:
          "Please select a valid funding method.",
      });
    }

    /* =====================================
       VALIDATE FUNDING REFERENCE
    ====================================== */

    const cleanFundingReference =
      String(
        fundingReference || ""
      ).trim();

    if (!cleanFundingReference) {
      return res.status(400).json({
        error:
          "Funding details are required.",
      });
    }

    if (
      cleanFundingReference.length >
      100
    ) {
      return res.status(400).json({
        error:
          "Funding details are too long.",
      });
    }

    /* =====================================
       VALIDATE PASSCODE
    ====================================== */

    const cleanPasscode =
      String(
        passcode || ""
      ).trim();

    if (!/^\d{4}$/.test(cleanPasscode)) {
      return res.status(401).json({
        error:
          "Please enter your 4-digit passcode.",
      });
    }

    if (
      cleanPasscode !==
      ADD_FUNDS_PASSCODE
    ) {
      return res.status(401).json({
        error:
          "Incorrect passcode. Add funds was blocked.",
      });
    }

    /* =====================================
       CLEAN NOTE
    ====================================== */

    const cleanNote =
      String(
        note || ""
      ).trim();

    const methodLabels = {
      card: "Card",
      upi: "UPI",
      bank: "Bank account",
    };

    const fundingLabel =
      methodLabels[
        String(fundingMethod)
      ];

    const transactionNote =
      cleanNote
        ? `Add funds via ${fundingLabel} — ${cleanNote}`
        : `Add funds via ${fundingLabel}`;

    /* =====================================
       UPDATE BALANCE + TRANSACTION
       ATOMICALLY
    ====================================== */

    const runAddFunds =
      db.transaction(() => {

        db
          .prepare(
            `UPDATE accounts
             SET balance_cents =
               balance_cents + ?
             WHERE id = ?`
          )
          .run(
            amountCents,
            accountId
          );

        const result =
          db
            .prepare(
              `INSERT INTO transactions
               (
                 to_account_id,
                 amount_cents,
                 type,
                 note
               )
               VALUES
               (
                 ?,
                 ?,
                 'deposit',
                 ?
               )`
            )
            .run(
              accountId,
              amountCents,
              transactionNote
            );

        return result.lastInsertRowid;
      });

    const transactionId =
      runAddFunds();

    /* =====================================
       GET UPDATED ACCOUNT
    ====================================== */

    const updatedAccount =
      getOwnedAccount(
        req.userId,
        accountId
      );

    /* =====================================
       GENERATE REFERENCE
    ====================================== */

    const reference =
      "LED" +
      Date.now()
        .toString()
        .slice(-10);

    /* =====================================
       RESPONSE
    ====================================== */

    res.status(201).json({

      message:
        "Funds added successfully.",

      transactionId:
        Number(
          transactionId
        ),

      reference,

      fundingMethod:
        String(
          fundingMethod
        ),

      amount:
        amountCents / 100,

      balance:
        updatedAccount
          ? updatedAccount.balance_cents / 100
          : null,
    });
  }
);

/* =====================================
   TRANSFER
===================================== */

// POST /api/transactions/transfer

router.post(
  "/transfer",
  requireAuth,
  (req, res) => {

    const {
      fromAccountId,
      toAccountNumber,
      amount,
      note,
      passcode,
      beneficiaryId,
    } = req.body;

    const numericAmount =
      Number(amount);

    /* =====================================
       VALIDATE BASIC INPUT
    ====================================== */

    if (
      !fromAccountId ||
      !toAccountNumber ||
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      return res.status(400).json({
        error:
          "fromAccountId, toAccountNumber and a positive amount are required.",
      });
    }

    /* =====================================
       VALIDATE TRANSFER PASSCODE
    ====================================== */

    const cleanPasscode =
      String(
        passcode || ""
      ).trim();

    if (!/^\d{4}$/.test(cleanPasscode)) {
      return res.status(401).json({
        error:
          "Please enter your 4-digit passcode.",
      });
    }

    if (
      cleanPasscode !==
      TRANSFER_PASSCODE
    ) {
      return res.status(401).json({
        error:
          "Incorrect passcode. Transfer was blocked.",
      });
    }

    /* =====================================
       VALIDATE AMOUNT
    ====================================== */

    const amountCents =
      Math.round(
        numericAmount * 100
      );

    if (amountCents <= 0) {
      return res.status(400).json({
        error:
          "The transfer amount must be greater than zero.",
      });
    }

    /* =====================================
       VALIDATE SOURCE ACCOUNT
    ====================================== */

    const fromAccount =
      getOwnedAccount(
        req.userId,
        fromAccountId
      );

    if (!fromAccount) {
      return res.status(404).json({
        error: "Source account not found.",
      });
    }

    /* =====================================
       VERIFY SELECTED BENEFICIARY
    ====================================== */

    if (beneficiaryId !== undefined && beneficiaryId !== null && beneficiaryId !== "") {
      const numericBeneficiaryId = Number(beneficiaryId);

      if (!Number.isSafeInteger(numericBeneficiaryId) || numericBeneficiaryId <= 0) {
        return res.status(400).json({
          error: "Invalid beneficiary ID.",
        });
      }

      const beneficiary = db
        .prepare(
          `SELECT account_number FROM beneficiaries
           WHERE id = ? AND user_id = ?`
        )
        .get(numericBeneficiaryId, req.userId);

      if (!beneficiary) {
        return res.status(404).json({
          error: "Beneficiary not found.",
        });
      }

      if (beneficiary.account_number !== String(toAccountNumber).trim()) {
        return res.status(400).json({
          error: "Selected beneficiary does not match the recipient account.",
        });
      }
    }

    /* =====================================
       FIND RECIPIENT ACCOUNT
    ====================================== */

    const toAccount =
      db
        .prepare(
          "SELECT * FROM accounts WHERE account_number = ?"
        )
        .get(
          String(
            toAccountNumber
          ).trim()
        );

    if (!toAccount) {
      return res.status(404).json({
        error:
          "Recipient account number not found.",
      });
    }

    /* =====================================
       PREVENT SELF TRANSFER
    ====================================== */

    if (
      toAccount.id ===
      fromAccount.id
    ) {
      return res.status(400).json({
        error:
          "Cannot transfer to the same account.",
      });
    }

    /* =====================================
       CHECK BALANCE
    ====================================== */

    if (
      fromAccount.balance_cents <
      amountCents
    ) {
      return res.status(400).json({
        error:
          "Insufficient funds.",
      });
    }

    /* =====================================
       ATOMIC TRANSFER
    ====================================== */

    const runTransfer =
      db.transaction(() => {

        /* Deduct from sender */

        db
          .prepare(
            `UPDATE accounts
             SET balance_cents =
               balance_cents - ?
             WHERE id = ?`
          )
          .run(
            amountCents,
            fromAccount.id
          );

        /* Add to recipient */

        db
          .prepare(
            `UPDATE accounts
             SET balance_cents =
               balance_cents + ?
             WHERE id = ?`
          )
          .run(
            amountCents,
            toAccount.id
          );

        /* Create transaction record */

        db
          .prepare(
            `INSERT INTO transactions
             (
               from_account_id,
               to_account_id,
               amount_cents,
               type,
               note
             )
             VALUES
             (
               ?,
               ?,
               ?,
               'transfer',
               ?
             )`
          )
          .run(
            fromAccount.id,
            toAccount.id,
            amountCents,
            note || "Transfer"
          );
      });

    runTransfer();

    /* =====================================
       SUCCESS RESPONSE
    ====================================== */

    res.status(201).json({
      message:
        "Transfer successful.",
    });
  }
);

/* =====================================
   EXPORT ROUTER
===================================== */

module.exports = router;
