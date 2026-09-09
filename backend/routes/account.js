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

module.exports = router;
