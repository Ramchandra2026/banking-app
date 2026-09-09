const bcrypt = require("bcryptjs");
const db = require("./database");

function randomAccountNumber() {
  return String(Math.floor(1000000000 + Math.random() * 8999999999));
}

const email = "demo@ledgerbank.test";
const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);

if (existing) {
  console.log("Demo user already exists:", email);
} else {
  const passwordHash = bcrypt.hashSync("Demo@1234", 10);

  const insertUser = db.prepare(
    "INSERT INTO users (full_name, email, password_hash) VALUES (?, ?, ?)"
  );
  const userInfo = insertUser.run("Demo User", email, passwordHash);

  const insertAccount = db.prepare(
    `INSERT INTO accounts (user_id, account_number, account_type, balance_cents)
     VALUES (?, ?, ?, ?)`
  );
  const accInfo = insertAccount.run(
    userInfo.lastInsertRowid,
    randomAccountNumber(),
    "checking",
    250000 // $2,500.00 starting balance
  );

  db.prepare(
    `INSERT INTO transactions (to_account_id, amount_cents, type, note)
     VALUES (?, ?, 'deposit', 'Opening balance')`
  ).run(accInfo.lastInsertRowid, 250000);

  console.log("Seeded demo user:");
  console.log("  email:    ", email);
  console.log("  password: ", "Demo@1234");
}
