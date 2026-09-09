// Base URL of the backend API. Change this if your backend runs elsewhere.
const API_BASE = "http://localhost:4000/api";

const Auth = {
  getToken() {
    return localStorage.getItem("ledger_token");
  },
  setSession(token, user) {
    localStorage.setItem("ledger_token", token);
    localStorage.setItem("ledger_user", JSON.stringify(user));
  },
  getUser() {
    const raw = localStorage.getItem("ledger_user");
    return raw ? JSON.parse(raw) : null;
  },
  clear() {
    localStorage.removeItem("ledger_token");
    localStorage.removeItem("ledger_user");
  },
  requireAuthOrRedirect() {
    if (!Auth.getToken()) {
      window.location.href = "login.html";
    }
  },
};

async function apiRequest(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = Auth.getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch (_) {
    /* no body */
  }

  if (!res.ok) {
    const message = (data && data.error) || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data;
}

function formatCurrency(amount) {
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function formatDate(isoLike) {
  // SQLite datetime('now') returns "YYYY-MM-DD HH:MM:SS" (UTC, no offset)
  const iso = isoLike.includes("T") ? isoLike : isoLike.replace(" ", "T") + "Z";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
