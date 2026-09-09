# Ledger — Frontend

Static HTML/CSS/JS frontend for the Ledger banking demo. No build step required.

```
frontend/
├── login.html
├── register.html
├── dashboard.html
├── transactions.html
├── package.json       # optional dev server (live-server)
├── css/
│   └── style.css
└── js/
    ├── api.js          # fetch wrapper + token/session storage
    ├── login.js
    ├── register.js
    ├── dashboard.js
    └── transactions.js
```

## Run it

You have two options — pick whichever is easiest in your setup.

**Option A — VS Code Live Server extension (simplest)**
Right-click `login.html` in the VS Code file explorer → "Open with Live Server".

**Option B — npm script**
```bash
cd frontend
npm install
npm start
```
This opens `login.html` at `http://localhost:5500` using the `live-server` package.

## Connecting to the backend

The frontend expects the API at `http://localhost:4000/api` (see `API_BASE` at the top of
`js/api.js`). Make sure the `backend` project is running first — see the root `README.md`.
If you change the backend's port, update `API_BASE` accordingly.

## Pages

| Page | File | Requires login |
|---|---|---|
| Sign in | `login.html` | No |
| Create account | `register.html` | No |
| Dashboard (balance + recent activity) | `dashboard.html` | Yes |
| Transfer & full history | `transactions.html` | Yes |

Session state (JWT + user info) is kept in `localStorage` under `ledger_token` / `ledger_user`.
`dashboard.html` and `transactions.html` redirect to `login.html` automatically if no token is
present; `login.html` and `register.html` redirect to `dashboard.html` if already signed in.
