/* ============================================================
   DRIVE ARENA – Dashboard App
   Password: PBKDF2 (100,000 iterations) – never stored in plaintext
   
   To generate a new hash, run this in your browser console:
   
   (async () => {
     const pw = "yournewpassword";
     const salt = "DriveArena2026FR"; // keep this salt fixed
     const key = await crypto.subtle.importKey(
       "raw", new TextEncoder().encode(pw),
       "PBKDF2", false, ["deriveBits"]
     );
     const bits = await crypto.subtle.deriveBits(
       { name:"PBKDF2", salt:new TextEncoder().encode("DriveArena2026FR"),
         iterations:100000, hash:"SHA-256" },
       key, 256
     );
     console.log(Array.from(new Uint8Array(bits))
       .map(b=>b.toString(16).padStart(2,"0")).join(""));
   })();
   
   ============================================================ */

// PBKDF2 derived key of the password
// Salt: "DriveArena2026FR" (fixed, embedded – changes the hash space)
const PW_HASH = "3abe28056b00f1587c7e1a34e3b63152fc13d41ad4b4f6d390a70141cbe5e549";
const PW_SALT = "DriveArena2026FR";
const PW_ITER = 100000;

// ---- Utility: PBKDF2 via Web Crypto API ----
async function pbkdf2Hash(password) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: enc.encode(PW_SALT),
      iterations: PW_ITER,
      hash: "SHA-256"
    },
    keyMaterial,
    256
  );
  return Array.from(new Uint8Array(bits))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

// ---- Formspree Login Notification ----
// 1. Go to https://formspree.io → create free account
// 2. Create new form → copy your form ID (e.g. "xpwzabcd")
// 3. Replace YOUR_FORMSPREE_ID below with your actual form ID
const FORMSPREE_ID = "YOUR_FORMSPREE_ID";

async function notifyLogin() {
  if (FORMSPREE_ID === "YOUR_FORMSPREE_ID") return; // skip if not configured
  try {
    await fetch(`https://formspree.io/f/${FORMSPREE_ID}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "DRIVE ARENA Portal – Login",
        time: new Date().toLocaleString("de-DE", { timeZone: "Europe/Berlin" }),
        userAgent: navigator.userAgent,
        referrer: document.referrer || "direkt"
      })
    });
  } catch(e) { /* silent fail – don't block login */ }
}

// ---- Login ----
async function checkPw() {
  const input = document.getElementById("pw-input").value.trim();
  // Show subtle loading state while PBKDF2 runs (takes ~300ms intentionally)
  const btn = document.querySelector(".login-btn");
  btn.textContent = "…";
  btn.disabled = true;
  const hash = await pbkdf2Hash(input);
  btn.textContent = "ZUGANG";
  btn.disabled = false;
  if (hash === PW_HASH) {
    localStorage.setItem("da_auth", "1");
    notifyLogin();
    showDashboard();
  } else {
    const err = document.getElementById("pw-error");
    err.style.display = "block";
    document.getElementById("pw-input").value = "";
    setTimeout(() => { err.style.display = "none"; }, 3000);
  }
}

function showDashboard() {
  window.location.replace("dashboard.html");
}

function logout() {
  localStorage.removeItem("da_auth");
  window.location.replace("index.html");
}

// Check session on page load (only relevant on login page)
document.addEventListener("DOMContentLoaded", () => {
  const pwInput = document.getElementById("pw-input");
  if (pwInput) {
    pwInput.addEventListener("keydown", e => { if (e.key === "Enter") checkPw(); });
  }
  // Dashboard init (only runs if canvas exists)
  if (document.getElementById("liqChart")) {
    initChart();
    calcScenario();
  }
});

// ---- Navigation ----
function showSection(id, btn) {
  document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
  document.getElementById("section-" + id).classList.add("active");
  btn.classList.add("active");
}

// ---- PDF / Print ----
function printSection(sectionId, title) {
  // Temporarily show only the target section for print
  const allSections = document.querySelectorAll(".section");
  const target = document.getElementById("section-" + sectionId);

  allSections.forEach(s => s.dataset.wasActive = s.classList.contains("active") ? "1" : "0");
  allSections.forEach(s => s.classList.remove("active"));
  target.classList.add("active");

  document.title = "DRIVE ARENA – " + title;
  window.print();

  // Restore previous state after print dialog closes
  allSections.forEach(s => {
    s.classList.remove("active");
    if (s.dataset.wasActive === "1") s.classList.add("active");
  });
  document.title = "DRIVE ARENA – Investor Portal";
}

// ---- Liquidity Chart ----
let chartInstance = null;

function initChart() {
  if (chartInstance) { chartInstance.destroy(); }

  const labels = [
    "Aug 26","Sep","Okt","Nov","Dez",
    "Jan 27","Feb","Mrz","Apr","Mai","Jun","Jul",
    "Aug","Sep","Okt","Nov","Dez",
    "Jan 28","Feb","Mrz","Apr","Mai","Jun","Jul"
  ];
  const data = [
    34710, 33120, 32230, 31940, 32350,
    33460, 35570, 39180, 43490, 48800, 54610, 60920,
    67730, 74040, 80850, 86660, 90970,
    95850, 101730, 108610, 116490, 124870, 133750, 142630
  ];

  const ctx = document.getElementById("liqChart").getContext("2d");
  chartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        data,
        borderColor: "#CC0000",
        backgroundColor: "rgba(204,0,0,0.08)",
        borderWidth: 2,
        fill: true,
        tension: 0.3,
        pointRadius: 3,
        pointBackgroundColor: "#CC0000",
        pointHoverRadius: 5
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => " " + ctx.parsed.y.toLocaleString("de-DE") + " €"
          }
        }
      },
      scales: {
        x: {
          ticks: { color: "#555", font: { size: 9 }, maxRotation: 45 },
          grid:  { color: "#1a1a1a" }
        },
        y: {
          ticks: {
            color: "#555",
            font: { size: 9 },
            callback: v => Math.round(v / 1000) + "k €"
          },
          grid: { color: "#1a1a1a" }
        }
      }
    }
  });
}

// ---- Scenario Calculator ----
function calcScenario() {
  const ausl  = parseInt(document.getElementById("sl-auslastung").value, 10);
  const preis = parseInt(document.getElementById("sl-preis").value, 10);
  const sims  = parseInt(document.getElementById("sl-sims").value, 10);

  document.getElementById("val-auslastung").textContent = ausl  + " %";
  document.getElementById("val-preis").textContent      = preis + " €";
  document.getElementById("val-sims").textContent       = sims;

  const kap     = sims * 10 * 24;                      // h/month capacity
  const stunden = Math.round(kap * ausl / 100);
  const umsatz  = stunden * preis;
  const fixkost = 5900;
  const gewinn  = umsatz - fixkost;
  const beH     = Math.ceil(fixkost / preis);
  const bePct   = Math.round(beH / kap * 100);

  document.getElementById("r-stunden").textContent = stunden.toLocaleString("de-DE");
  document.getElementById("r-umsatz").textContent  = umsatz.toLocaleString("de-DE") + " €";
  document.getElementById("r-jahres").textContent  = (umsatz * 12).toLocaleString("de-DE") + " €";
  document.getElementById("r-kap").textContent     = kap.toLocaleString("de-DE") + " h";
  document.getElementById("r-be").textContent      = bePct + " %";

  const gEl = document.getElementById("r-gewinn");
  gEl.textContent  = (gewinn >= 0 ? "+" : "") + gewinn.toLocaleString("de-DE") + " €";
  gEl.style.color  = gewinn >= 0 ? "#22c55e" : "#ef4444";
}

// ---- Hash helper (run once in browser console to generate a new hash) ----
// sha256("yournewpassword").then(h => console.log(h));
