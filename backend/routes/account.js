const express = require("express");
const db = require("../db/database");
const requireAuth = require("../middleware/auth");

const router = express.Router();

// GET /api/account/me  -> profile + all accounts belonging to the logged-in user
router.get("/me", requireAuth, (req, res) => {
  const user = db
    .prepare("SELECT id, full_name, email, created_at FROM users WHERE id = ?")
    .get(req.userId);

  if (!user) {
    return res.status(404).json({ error: "User not found." });
  }

  const accounts = db
    .prepare(
      "SELECT id, account_number, account_type, balance_cents, created_at FROM accounts WHERE user_id = ?"
    )
    .all(req.userId);

  res.json({
    user: { id: user.id, fullName: user.full_name, email: user.email },
    accounts: accounts.map((a) => ({
      id: a.id,
      accountNumber: a.account_number,
      accountType: a.account_type,
      balance: a.balance_cents / 100,
      createdAt: a.created_at,
    })),
  });

  });

// PUT /api/account/profile -> update logged-in user's profile

router.put("/profile", requireAuth, (req, res) => {

  const { fullName, email } = req.body;

  if (!fullName || !email) {
    return res.status(400).json({
      error: "Full name and email are required."
    });
  }

  const cleanName = String(fullName).trim();
  const cleanEmail = String(email).trim().toLowerCase();

  if (cleanName.length < 2) {
    return res.status(400).json({
      error: "Name must be at least 2 characters."
    });
  }

  if (!cleanEmail.includes("@")) {
    return res.status(400).json({
      error: "Please enter a valid email address."
    });
  }

  const existingUser = db
    .prepare(
      "SELECT id FROM users WHERE email = ? AND id != ?"
    )
    .get(cleanEmail, req.userId);

  if (existingUser) {
    return res.status(409).json({
      error: "That email address is already in use."
    });
  }

  db.prepare(
    "UPDATE users SET full_name = ?, email = ? WHERE id = ?"
  ).run(
    cleanName,
    cleanEmail,
    req.userId
  );

  const updatedUser = db
    .prepare(
      "SELECT id, full_name, email, created_at FROM users WHERE id = ?"
    )
    .get(req.userId);

  res.json({
    message: "Profile updated successfully.",
    user: {
      id: updatedUser.id,
      fullName: updatedUser.full_name,
      email: updatedUser.email
    }
  });

});

module.exports = router;
