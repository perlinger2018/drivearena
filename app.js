/* ============================================================
   DRIVE ARENA – Dashboard App
   ============================================================ */


const PW_HASH = "d4b65c22efa5f4f2e2e76b2e9bcc63d7f765a8c4cb60ccc4704515a7703bb13d";

async function sha256(str) {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(str)
  );
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

// ---- Login ----
async function checkPw() {
  const input = document.getElementById("pw-input").value.trim();
  const hash  = await sha256(input);
  if (hash === PW_HASH) {
    sessionStorage.setItem("da_auth", "1");
    showDashboard();
  } else {
    const err = document.getElementById("pw-error");
    err.style.display = "block";
    document.getElementById("pw-input").value = "";
    setTimeout(() => { err.style.display = "none"; }, 3000);
  }
}

function showDashboard() {
  document.getElementById("login-screen").style.display = "none";
  document.getElementById("dashboard").style.display   = "block";
  initChart();
  calcScenario();
}

function logout() {
  sessionStorage.removeItem("da_auth");
  document.getElementById("dashboard").style.display   = "none";
  document.getElementById("login-screen").style.display = "flex";
  document.getElementById("pw-input").value = "";
}

// Check session on every page load
document.addEventListener("DOMContentLoaded", () => {
  // Restore session if still active
  if (sessionStorage.getItem("da_auth") === "1") {
    showDashboard();
  }
  // Allow Enter key in password field
  document.getElementById("pw-input")
    .addEventListener("keydown", e => { if (e.key === "Enter") checkPw(); });
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


