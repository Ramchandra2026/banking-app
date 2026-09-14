const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db/database");
const requireAuth = require("../middleware/auth");

const router = express.Router();

// =====================================================
// DEMO OTP STORAGE
// =====================================================

const otpStore = new Map();

function generateOTP() {
  return String(
    Math.floor(100000 + Math.random() * 900000)
  );
}
 
function randomAccountNumber() {
  return String(Math.floor(1000000000 + Math.random() * 8999999999));
}

function signToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "2h",
  });
}

// =====================================================
// POST /api/auth/send-otp
// =====================================================

router.post("/send-otp", (req, res) => {

  const { mobile } = req.body;

  if (!mobile) {
    return res.status(400).json({
      error: "Mobile number is required."
    });
  }

  const cleanedMobile =
    String(mobile)
      .replace(/\D/g, "")
      .slice(-10);

  if (!/^[6-9]\d{9}$/.test(cleanedMobile)) {
    return res.status(400).json({
      error: "Please enter a valid 10-digit mobile number."
    });
  }

  const otp = generateOTP();

  otpStore.set(cleanedMobile, {
    otp,
    expiresAt: Date.now() + 5 * 60 * 1000
  });

  console.log(
    `DEMO OTP for ${cleanedMobile}: ${otp}`
  );

  res.json({
    message: "OTP sent successfully.",
    demoOtp: otp
  });

});


// =====================================================
// POST /api/auth/verify-otp
// =====================================================

router.post("/verify-otp", (req, res) => {

  const {
    mobile,
    otp
  } = req.body;

  if (!mobile || !otp) {
    return res.status(400).json({
      error: "Mobile number and OTP are required."
    });
  }

  const cleanedMobile =
    String(mobile)
      .replace(/\D/g, "")
      .slice(-10);

  const stored =
    otpStore.get(cleanedMobile);

  if (!stored) {
    return res.status(400).json({
      error: "OTP not found. Please request a new OTP."
    });
  }

  if (Date.now() > stored.expiresAt) {

    otpStore.delete(cleanedMobile);

    return res.status(400).json({
      error: "OTP has expired. Please request a new OTP."
    });

  }

  if (String(otp) !== stored.otp) {
    return res.status(400).json({
      error: "Invalid OTP."
    });
  }

  otpStore.delete(cleanedMobile);

  res.json({
    message: "OTP verified successfully.",
    verified: true
  });

});

// =====================================================
// POST /api/auth/forgot-password
// =====================================================

router.post("/forgot-password", (req, res) => {

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      error: "Email address is required."
    });
  }

  const cleanEmail = String(email).trim().toLowerCase();

  const user = db
    .prepare("SELECT id, email FROM users WHERE email = ?")
    .get(cleanEmail);

  if (!user) {
    return res.status(404).json({
      error: "No account found with this email address."
    });
  }

  const otp = generateOTP();

  otpStore.set(`reset_${cleanEmail}`, {
    otp,
    expiresAt: Date.now() + 5 * 60 * 1000
  });

  console.log(
    `DEMO PASSWORD RESET OTP for ${cleanEmail}: ${otp}`
  );

  res.json({
    message: "Password reset OTP sent successfully.",
    demoOtp: otp
  });
 
});

// =====================================================
// POST /api/auth/verify-reset-otp
// =====================================================

router.post("/verify-reset-otp", (req, res) => {

  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({
      error: "Email address and OTP are required."
    });
  }

  const cleanEmail =
    String(email).trim().toLowerCase();

  const stored =
    otpStore.get(`reset_${cleanEmail}`);

  if (!stored) {
    return res.status(400).json({
      error: "OTP not found. Please request a new OTP."
    });
  }

  if (Date.now() > stored.expiresAt) {

    otpStore.delete(`reset_${cleanEmail}`);

    return res.status(400).json({
      error: "OTP has expired. Please request a new OTP."
    });

  }

  if (String(otp) !== stored.otp) {
    return res.status(400).json({
      error: "Invalid OTP."
    });
  }

  res.json({
    message: "OTP verified successfully.",
    verified: true
  });

});

// =====================================================
// PUT /api/auth/reset-password
// =====================================================

router.put("/reset-password", (req, res) => {

  const {
    email,
    otp,
    newPassword
  } = req.body;

  if (!email || !otp || !newPassword) {
    return res.status(400).json({
      error: "Email, OTP and new password are required."
    });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({
      error: "New password must be at least 6 characters."
    });
  }

  const cleanEmail =
    String(email).trim().toLowerCase();

  const stored =
    otpStore.get(`reset_${cleanEmail}`);

  if (!stored) {
    return res.status(400).json({
      error: "OTP not found. Please request a new OTP."
    });
  }

  if (Date.now() > stored.expiresAt) {

    otpStore.delete(`reset_${cleanEmail}`);

    return res.status(400).json({
      error: "OTP has expired. Please request a new OTP."
    });

  }

  if (String(otp) !== stored.otp) {
    return res.status(400).json({
      error: "Invalid OTP."
    });
  }

  const user =
    db
      .prepare("SELECT id FROM users WHERE email = ?")
      .get(cleanEmail);

  if (!user) {
    return res.status(404).json({
      error: "User not found."
    });
  }

  const newPasswordHash =
    bcrypt.hashSync(newPassword, 10);

  db
    .prepare(
      "UPDATE users SET password_hash = ? WHERE id = ?"
    )
    .run(
      newPasswordHash,
      user.id
    );

  otpStore.delete(`reset_${cleanEmail}`);

  res.json({
    message: "Password reset successfully."
  });

});

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

// PUT /api/auth/change-password
router.put("/change-password", requireAuth, (req, res) => {

  const {
    currentPassword,
    newPassword
  } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      error: "Current password and new password are required."
    });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({
      error: "New password must be at least 6 characters."
    });
  }

  const user = db
    .prepare(
      "SELECT id, password_hash FROM users WHERE id = ?"
    )
    .get(req.userId);

  if (!user) {
    return res.status(404).json({
      error: "User not found."
    });
  }

  const validPassword =
    bcrypt.compareSync(
      currentPassword,
      user.password_hash
    );

  if (!validPassword) {
    return res.status(401).json({
      error: "Current password is incorrect."
    });
  }

  const newPasswordHash =
    bcrypt.hashSync(newPassword, 10);

  db.prepare(
    "UPDATE users SET password_hash = ? WHERE id = ?"
  ).run(
    newPasswordHash,
    req.userId
  );

  res.json({
    message: "Password changed successfully."
  });

});

module.exports = router;
