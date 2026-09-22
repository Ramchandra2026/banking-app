const express = require("express");
const db = require("../db/database");
const requireAuth = require("../middleware/auth");

const router = express.Router();

function serializeBeneficiary(beneficiary) {
  return {
    id: beneficiary.id,
    name: beneficiary.name,
    accountNumber: beneficiary.account_number,
    nickname: beneficiary.nickname || "",
    createdAt: beneficiary.created_at,
    updatedAt: beneficiary.updated_at,
  };
}

function validateBeneficiaryInput(body) {
  const name = String(body.name || "").trim();
  const accountNumber = String(body.accountNumber || "").trim();
  const nickname = String(body.nickname || "").trim();

  if (!name) return { error: "Beneficiary name is required." };
  if (name.length > 100) return { error: "Beneficiary name is too long." };
  if (!accountNumber) return { error: "Account number is required." };
  if (!/^\d+$/.test(accountNumber)) {
    return { error: "Account number must contain numbers only." };
  }
  if (accountNumber.length < 6 || accountNumber.length > 20) {
    return { error: "Account number must contain 6 to 20 digits." };
  }
  if (nickname.length > 30) return { error: "Nickname is too long." };

  return { name, accountNumber, nickname };
}

function getBeneficiaryId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function targetAccountExists(accountNumber) {
  return db
    .prepare("SELECT id FROM accounts WHERE account_number = ?")
    .get(accountNumber);
}

router.get("/", requireAuth, (req, res) => {
  const beneficiaries = db
    .prepare(
      `SELECT id, name, account_number, nickname, created_at, updated_at
       FROM beneficiaries
       WHERE user_id = ?
       ORDER BY id DESC`
    )
    .all(req.userId)
    .map(serializeBeneficiary);

  res.json({ beneficiaries });
});

router.post("/", requireAuth, (req, res) => {
  const input = validateBeneficiaryInput(req.body || {});
  if (input.error) return res.status(400).json({ error: input.error });

  if (!targetAccountExists(input.accountNumber)) {
    return res.status(404).json({ error: "Recipient account number not found." });
  }

  const ownAccount = db
    .prepare("SELECT id FROM accounts WHERE user_id = ? AND account_number = ?")
    .get(req.userId, input.accountNumber);

  if (ownAccount) {
    return res.status(400).json({ error: "You cannot save your own account as a beneficiary." });
  }

  const duplicate = db
    .prepare("SELECT id FROM beneficiaries WHERE user_id = ? AND account_number = ?")
    .get(req.userId, input.accountNumber);

  if (duplicate) {
    return res.status(409).json({ error: "This account is already saved." });
  }

  try {
    const result = db
      .prepare(
        `INSERT INTO beneficiaries (user_id, name, account_number, nickname)
         VALUES (?, ?, ?, ?)`
      )
      .run(req.userId, input.name, input.accountNumber, input.nickname || null);

    const beneficiary = db
      .prepare(
        `SELECT id, name, account_number, nickname, created_at, updated_at
         FROM beneficiaries WHERE id = ? AND user_id = ?`
      )
      .get(result.lastInsertRowid, req.userId);

    res.status(201).json({
      message: "Beneficiary saved successfully.",
      beneficiary: serializeBeneficiary(beneficiary),
    });
  } catch (err) {
    if (err.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(409).json({ error: "This account is already saved." });
    }
    console.error("Unable to create beneficiary:", err);
    return res.status(500).json({ error: "Unable to save beneficiary." });
  }
});

router.put("/:id", requireAuth, (req, res) => {
  const id = getBeneficiaryId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid beneficiary ID." });

  const existing = db
    .prepare("SELECT id FROM beneficiaries WHERE id = ? AND user_id = ?")
    .get(id, req.userId);

  if (!existing) {
    return res.status(404).json({ error: "Beneficiary not found." });
  }

  const input = validateBeneficiaryInput(req.body || {});
  if (input.error) return res.status(400).json({ error: input.error });

  if (!targetAccountExists(input.accountNumber)) {
    return res.status(404).json({ error: "Recipient account number not found." });
  }

  const ownAccount = db
    .prepare("SELECT id FROM accounts WHERE user_id = ? AND account_number = ?")
    .get(req.userId, input.accountNumber);

  if (ownAccount) {
    return res.status(400).json({ error: "You cannot save your own account as a beneficiary." });
  }

  const duplicate = db
    .prepare(
      `SELECT id FROM beneficiaries
       WHERE user_id = ? AND account_number = ? AND id != ?`
    )
    .get(req.userId, input.accountNumber, id);

  if (duplicate) {
    return res.status(409).json({ error: "This account is already saved." });
  }

  try {
    db
      .prepare(
        `UPDATE beneficiaries
         SET name = ?, account_number = ?, nickname = ?, updated_at = datetime('now')
         WHERE id = ? AND user_id = ?`
      )
      .run(input.name, input.accountNumber, input.nickname || null, id, req.userId);

    const beneficiary = db
      .prepare(
        `SELECT id, name, account_number, nickname, created_at, updated_at
         FROM beneficiaries WHERE id = ? AND user_id = ?`
      )
      .get(id, req.userId);

    res.json({
      message: "Beneficiary updated successfully.",
      beneficiary: serializeBeneficiary(beneficiary),
    });
  } catch (err) {
    if (err.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(409).json({ error: "This account is already saved." });
    }
    console.error("Unable to update beneficiary:", err);
    return res.status(500).json({ error: "Unable to update beneficiary." });
  }
});

router.delete("/:id", requireAuth, (req, res) => {
  const id = getBeneficiaryId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid beneficiary ID." });

  const result = db
    .prepare("DELETE FROM beneficiaries WHERE id = ? AND user_id = ?")
    .run(id, req.userId);

  if (!result.changes) {
    return res.status(404).json({ error: "Beneficiary not found." });
  }

  res.json({ message: "Beneficiary removed." });
});

module.exports = router;
