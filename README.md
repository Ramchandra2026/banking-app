# Ledger Bank

A full-stack banking web application built to simulate a modern digital banking experience. The application provides secure authentication, account management, money transfers, add-funds functionality, transaction history, and other banking services through a professional responsive interface.

> **Note:** Ledger Bank is a demonstration/portfolio project. Financial transactions, OTPs, payment methods, and passcodes are simulated and are not connected to real banking or payment systems.

---

## 🚀 Features

### 🔐 Authentication
- User registration
- User login
- JWT-based authentication
- Password hashing with bcrypt
- OTP verification during registration
- Forgot password functionality
- Password reset using OTP
- Logout functionality
- Protected authenticated routes

### 🏦 Account Management
- View primary bank account
- View account number
- View available balance
- Protected balance using a 4-digit passcode
- Edit profile information
- Change account password

### 💸 Money Transfer
- Transfer money using recipient account number
- Transfer amount validation
- Insufficient balance validation
- Prevent transfers to the same account
- 4-digit passcode verification
- Backend transfer authorization
- Automatic transaction record creation

### 💰 Add Funds
Supports simulated funding through:
- Debit / Credit Card
- UPI
- Bank Account

Includes:
- Amount validation
- Funding method validation
- Card details validation
- UPI ID validation
- Bank account and IFSC validation
- 4-digit passcode verification
- Automatic balance update
- Transaction record generation

### 📜 Transaction History
- View recent transactions
- Deposit/add-funds records
- Money transfer records
- Credit/debit direction
- Transaction amount
- Transaction date
- Transaction notes
- Transaction filtering and search

### 💳 Additional Banking Services
- Cards
- Beneficiaries
- Mobile payments
- Notifications
- Bill payments

---

## 🛠️ Tech Stack

### Frontend
- HTML5
- CSS3
- JavaScript
- Responsive UI

### Backend
- Node.js
- Express.js
- JWT
- bcryptjs
- dotenv
- CORS

### Database
- SQLite
- better-sqlite3

### Development Tools
- Git
- GitHub
- Visual Studio Code
- npm

---

## 📁 Project Structure

```text
banking-app/
│
├── backend/
│   ├── db/
│   │   ├── database.js
│   │   ├── schema.sql
│   │   └── seed.js
│   │
│   ├── middleware/
│   │   └── auth.js
│   │
│   ├── routes/
│   │   ├── account.js
│   │   ├── auth.js
│   │   └── transactions.js
│   │
│   ├── .env.example
│   ├── package.json
│   └── server.js
│
├── frontend/
│   ├── css/
│   │   └── style.css
│   │
│   ├── js/
│   │   ├── api.js
│   │   ├── auth.js
│   │   ├── dashboard.js
│   │   ├── manage.js
│   │   └── transactions.js
│   │
│   ├── index.html
│   ├── auth.html
│   ├── dashboard.html
│   ├── manage.html
│   └── transactions.html
│
├── .gitignore
└── README.md