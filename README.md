# Ledger — Banking Demo App

A 4-page banking web app: **Login**, **Register**, **Dashboard**, and **Transfer & History**.
Plain HTML/CSS/JS frontend, a Node.js/Express REST API, and a SQLite database.

```
banking-app/
├── backend/
│   ├── db/
│   │   ├── schema.sql        # table definitions
│   │   ├── database.js       # SQLite connection (creates bank.sqlite on first run)
│   │   └── seed.js           # optional: creates a demo user + account
│   ├── middleware/
│   │   └── auth.js           # JWT verification middleware
│   ├── routes/
│   │   ├── auth.js           # POST /api/auth/register, /api/auth/login
│   │   ├── account.js        # GET  /api/account/me
│   │   └── transactions.js   # GET/POST /api/transactions...
│   ├── server.js             # Express app entry point
│   ├── package.json
│   └── .env.example
└── frontend/
    ├── login.html
    ├── register.html
    ├── dashboard.html
    ├── transactions.html
    ├── css/style.css
    └── js/
        ├── api.js            # shared fetch/auth helper
        ├── login.js
        ├── register.js
        ├── dashboard.js
        └── transactions.js
```

## 1. Open in VS Code

Unzip the project and open the `banking-app` folder in VS Code (`File → Open Folder…`).

## 2. Run the backend

```bash
cd backend
npm install
cp .env.example .env      # on Windows: copy .env.example .env
npm start
```

This starts the API at **http://localhost:4000**. The SQLite file (`backend/db/bank.sqlite`)
is created automatically on first run from `schema.sql`.

Optional — create a demo login (`demo@ledgerbank.test` / `Demo@1234`) with a $2,500 starting balance:

```bash
npm run seed
```

## 3. Run the frontend

The frontend is static HTML/CSS/JS, so any static server works. The simplest option in VS Code
is the **Live Server** extension: right-click `frontend/login.html` → "Open with Live Server".

Alternatively, from the `frontend` folder:

```bash
npx serve .
```

If your frontend runs on a different port than 4000, CORS is already open on the backend, so no
extra config is needed. If you change the backend port, update `API_BASE` at the top of
`frontend/js/api.js`.

## How it fits together

1. **Register** or **Login** — the backend hashes/verifies passwords with `bcryptjs` and returns
   a JWT, stored in the browser's `localStorage`.
2. **Dashboard** — calls `GET /api/account/me` to show the balance and the 5 most recent entries.
3. **Transfer & History** — deposit into your own account, transfer to another account by
   account number, and browse the full transaction ledger. Transfers and deposits are wrapped in
   SQLite transactions so balances stay consistent.

## Notes

- This is a learning/demo project — it is **not** production-grade banking software (no rate
  limiting, no email verification, no 2FA, no real money movement).
- Money is stored as integer cents (`balance_cents`) to avoid floating-point rounding issues, and
  converted to dollars only for display.
- Swap `better-sqlite3` for `pg`/`mysql2` later if you want a networked database — the route
  files only touch `db.prepare(...)`, so the SQL layer is isolated in `backend/db/`.
