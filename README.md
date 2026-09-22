# Ledger Bank

Ledger Bank is a full-stack digital banking demonstration redesigned as a premium fintech/SaaS product.

## Product surface

- **Home** — premium product-led marketing site with product preview, feature system, workflow, security and FAQ.
- **Authentication** — login, registration with inline OTP/demo verification, and inline password recovery using the existing auth logic.
- **Dashboard** — account overview, balance, quick actions, services, backend-backed beneficiaries, cards, notifications and recent activity.
- **Payments** — Send Money, Add Funds and payment activity using the existing backend APIs.
- **Manage** — transactions, statements, profile, password/security and session information.
- **Features / Security / Help / About** — supporting product pages for a more complete SaaS-style website experience.

## Stack

Frontend: HTML, CSS, JavaScript
Backend: Node.js, Express, SQLite (`better-sqlite3`), bcryptjs, JWT

## Run locally

### Backend

```bash
cd backend
cp .env.example .env
npm install
npm start
```

The API runs on `http://localhost:4000` by default.

### Frontend

Open another terminal:

```bash
cd frontend
npx serve .
```

Then open the local URL shown by `serve` (normally `http://localhost:3000`).

## Demo account

If you seed the database with the provided seed script, the demo account can be created with the credentials defined in `backend/db/seed.js`.

## Important

This is a demonstration project, not a production banking system. External payment networks, SMS/email delivery and several service actions are simulated. Before production use, the project would require a full security, compliance, infrastructure and financial-integration review.

## Design direction

The visual system takes high-level inspiration from modern premium SaaS/fintech product sites: strong product storytelling, large editorial typography, product mockups, structured feature sections, clear calls to action and a consistent application shell. It does not copy Elirox's proprietary content, assets or exact page implementation.
