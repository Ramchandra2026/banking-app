const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db/database");

const router = express.Router();

function randomAccountNumber() {
  return String(Math.floor(1000000000 + Math.random() * 8999999999));
}

function signToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "2h",
  });
}

// POST /api/auth/register
router.post("/register", (req, res) => {
  const { fullName, email, password } = req.body;

  if (!fullName || !email || !password) {
    return res.status(400).json({ error: "Full name, email and password are required." });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters." });
  }

  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email.toLowerCase());
  if (existing) {
    return res.status(409).json({ error: "An account with this email already exists." });
  }

  const passwordHash = bcrypt.hashSync(password, 10);

  const insertUser = db.prepare(
    "INSERT INTO users (full_name, email, password_hash) VALUES (?, ?, ?)"
  );
  const userInfo = insertUser.run(fullName, email.toLowerCase(), passwordHash);

  const insertAccount = db.prepare(
    `INSERT INTO accounts (user_id, account_number, account_type, balance_cents)
     VALUES (?, ?, 'checking', 0)`
  );
  const accInfo = insertAccount.run(userInfo.lastInsertRowid, randomAccountNumber());

  const token = signToken(userInfo.lastInsertRowid);

  res.status(201).json({
    token,
    user: { id: userInfo.lastInsertRowid, fullName, email: email.toLowerCase() },
    account: { id: accInfo.lastInsertRowid },
  });
});

// POST /api/auth/login
router.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email.toLowerCase());
  if (!user) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  const token = signToken(user.id);
  res.json({
    token,
    user: { id: user.id, fullName: user.full_name, email: user.email },
  });
});

module.exports = router;
