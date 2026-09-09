require("dotenv").config();
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const accountRoutes = require("./routes/account");
const transactionRoutes = require("./routes/transactions");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRoutes);
app.use("/api/account", accountRoutes);
app.use("/api/transactions", transactionRoutes);

// Fallback 404 for unknown API routes
app.use("/api", (req, res) => res.status(404).json({ error: "Not found." }));

app.listen(PORT, () => {
  console.log(`Ledger backend running on http://localhost:${PORT}`);
});
