// Our API server: this laptop when opened as a file, the Render API when deployed,
// or any server given as ?api=https://their-link (see config.js)
const API_BASE = window.FUNDILINK_API; // set in config.js

const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const tabLogin = document.getElementById("tabLogin");
const tabRegister = document.getElementById("tabRegister");

// ── Tab switching ─────────────────────────────────────────────────────────────
function showLogin() {
  loginForm.classList.remove("hidden");
  registerForm.classList.add("hidden");
  tabLogin.classList.add("active");
  tabRegister.classList.remove("active");
}

function showRegister() {
  loginForm.classList.add("hidden");
  registerForm.classList.remove("hidden");
  tabLogin.classList.remove("active");
  tabRegister.classList.add("active");
}

tabLogin.addEventListener("click", (e) => { e.preventDefault(); showLogin(); });
tabRegister.addEventListener("click", (e) => { e.preventDefault(); showRegister(); });
document.getElementById("switchToRegister").addEventListener("click", (e) => { e.preventDefault(); showRegister(); });
document.getElementById("switchToLogin").addEventListener("click", (e) => { e.preventDefault(); showLogin(); });

// Trade and area only matter for workers
const regRole = document.getElementById("regRole");
regRole.addEventListener("change", () => {
  document.getElementById("regWorkerFields").classList.toggle("hidden", regRole.value !== "worker");
});

// Reads the server's {"error": "..."} message, plus any validation details, for the alert
async function serverError(res) {
  try {
    const data = await res.json();
    const details = Array.isArray(data.details) ? ` (${data.details.join("; ")})` : "";
    return `${data.error || "Unknown error"}${details} [HTTP ${res.status}]`;
  } catch {
    return `HTTP ${res.status}`;
  }
}

// ── Login ─────────────────────────────────────────────────────────────────────
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value.trim();

  if (!email || !password) { alert("Please fill in all fields."); return; }

  try {
    const res = await fetch(`${API_BASE}/web/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    if (res.status === 429) { alert("Too many attempts. Please wait a minute and try again."); return; }
    if (!res.ok) {
      // Show the server's real reason (wrong password, old server, database down...) instead of guessing
      alert(`Login failed: ${await serverError(res)}`);
      return;
    }

    const user = await res.json();
    localStorage.setItem("fundilinkUser", JSON.stringify(user));

    // Redirect based on role
    if (user.role === "employer") {
      window.location.href = "dashboard.html" + location.search;
    } else {
      window.location.href = "jobs.html" + location.search;
    }

  } catch (error) {
    alert(`Could not reach the server at ${API_BASE}. Is it running?`);
  }
});

// ── Register ──────────────────────────────────────────────────────────────────
registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const firstName = document.getElementById("regFirstName").value.trim();
  const lastName  = document.getElementById("regLastName").value.trim();
  const email     = document.getElementById("regEmail").value.trim();
  const password  = document.getElementById("regPassword").value.trim();
  const role      = document.getElementById("regRole").value;
  // Workers say what they do and where, so employers (and Faraja's search) can find them
  const trade     = document.getElementById("regTrade").value;
  const location_ = document.getElementById("regLocation").value.trim();

  if (!firstName || !lastName || !email || !password || !role) {
    alert("Please fill in all fields."); return;
  }
  if (password.length < 8) {
    alert("Password must be at least 8 characters."); return;
  }
  if (role === "worker" && (!trade || !location_)) {
    alert("Please choose your trade and enter your area, so employers can find you."); return;
  }

  try {
    const res = await fetch(`${API_BASE}/web/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(role === "worker"
        ? { firstName, lastName, email, password, role, trade, location: location_ }
        : { firstName, lastName, email, password, role })
    });

    if (res.status === 409) {
      alert("That email is already registered. Try logging in instead.");
      return;
    }
    if (res.status === 429) { alert("Too many attempts. Please wait a minute and try again."); return; }
    if (!res.ok) {
      alert(`Registration failed: ${await serverError(res)}`);
      return;
    }

    const newUser = await res.json();
    localStorage.setItem("fundilinkUser", JSON.stringify(newUser));

    if (newUser.role === "employer") {
      window.location.href = "dashboard.html" + location.search;
    } else {
      window.location.href = "jobs.html" + location.search;
    }

  } catch (error) {
    alert(`Could not reach the server at ${API_BASE}. Is it running?`);
  }
});