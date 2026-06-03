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
  // Dashboard: Szenario-Slider (Chart erst bei sichtbarem Finanzplan — siehe ensureLiqChart)
  if (document.getElementById("liqChart")) {
    calcScenario();
  }
});

// ---- Navigation ----
function showSection(id, btn) {
  document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
  document.getElementById("section-" + id).classList.add("active");
  btn.classList.add("active");
  if (id === "finanzen") {
    requestAnimationFrame(() => {
      requestAnimationFrame(ensureLiqChart);
    });
  }
}

// ---- PDF / Print ----
function printSection(sectionId, title) {
  document.body.classList.remove("print-full-report");

  const allSections = document.querySelectorAll(".section");
  const target = document.getElementById("section-" + sectionId);
  const titleEl = document.getElementById("print-doc-title");

  const restore = () => {
    allSections.forEach(s => {
      s.classList.remove("active");
      if (s.dataset.wasActive === "1") s.classList.add("active");
    });
    document.title = "DRIVE ARENA – Investor Portal";
    if (titleEl) titleEl.textContent = "";
    restoreLiqChartLayout();
  };

  allSections.forEach(s => { s.dataset.wasActive = s.classList.contains("active") ? "1" : "0"; });
  allSections.forEach(s => s.classList.remove("active"));
  target.classList.add("active");

  document.title = "DRIVE ARENA – " + title;
  if (titleEl) titleEl.textContent = title;

  window.addEventListener("afterprint", restore, { once: true });

  schedulePrint();
}

function printFullReport() {
  document.body.classList.add("print-full-report");
  const titleEl = document.getElementById("print-doc-title");
  const fullTitle = "Investor-Unterlage (alle Kapitel)";
  document.title = "DRIVE ARENA – " + fullTitle;
  if (titleEl) titleEl.textContent = fullTitle;

  const restore = () => {
    document.body.classList.remove("print-full-report");
    document.title = "DRIVE ARENA – Investor Portal";
    if (titleEl) titleEl.textContent = "";
    restoreLiqChartLayout();
    window.removeEventListener("afterprint", restore);
  };
  window.addEventListener("afterprint", restore, { once: true });

  schedulePrint();
}

function restoreLiqChartLayout() {
  const chart = window.__daChart;
  if (!chart || typeof chart.resize !== "function") return;
  try {
    chart.resize();
    chart.update("none");
  } catch (_) { /* ignore */ }
}

function schedulePrint() {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      ensureLiqChart();
      setTimeout(() => window.print(), 200);
    });
  });
}

// ---- Liquidity Chart ----
let chartInstance = null;

/** Chart darf nicht initialisiert werden, solange #section-finanzen display:none ist (0×0-Canvas). */
function ensureLiqChart() {
  if (!document.getElementById("liqChart")) return;
  if (!chartInstance) {
    initChart();
  } else if (window.__daChart && typeof window.__daChart.resize === "function") {
    window.__daChart.resize();
  }
}

function initChart() {
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
    window.__daChart = null;
  }

  const labels = [
    "Aug 26","Sep","Okt","Nov","Dez",
    "Jan 27","Feb","Mrz","Apr","Mai","Jun","Jul",
    "Aug","Sep","Okt","Nov","Dez",
    "Jan 28","Feb","Mrz","Apr","Mai","Jun","Jul"
  ];
  /* Liquiditätsplan Bank (Juni 2026) — Tiefpunkt Nov 26 ~25.776 € */
  const data = [
    28594, 27388, 26182, 25776, 26370,
    27964, 30558, 34752, 39546, 44940, 50934, 57528,
    57321, 57114, 57907, 59700, 62493, 65286, 69079,
    72872, 77665, 82458, 87251, 92044
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
  window.__daChart = chartInstance;
}

// ---- Scenario Calculator ----
/** Monatliche Fixlast lt. GuV/Liquidität (Juni 2026): M 1–12 ohne Miete (Vorauszahlung), ab M 13 inkl. Miete. */
const SCENARIO_FIX_M1_12_MIN = 2406;
const SCENARIO_FIX_M1_12 = 4006;
const SCENARIO_FIX_AB_M13 = 6463;

/** Kleinste ganzzahlige Auslastung %, bei der round(kap×p/100)×preis die Fixlast deckt (entspricht Szenario-Slider & Gewinnanzeige). */
function minAuslastPercentForBreakEven(fixEur, preisEur, kapUnits) {
  const needUnits = Math.ceil(fixEur / preisEur);
  for (let p = 0; p <= 100; p++) {
    if (Math.round((kapUnits * p) / 100) >= needUnits) return p;
  }
  return 100;
}

function calcScenario() {
  const ausl  = parseInt(document.getElementById("sl-auslastung").value, 10);
  const preis = parseInt(document.getElementById("sl-preis").value, 10);
  const sims  = parseInt(document.getElementById("sl-sims").value, 10);

  const valAusl = document.getElementById("val-auslastung");
  const valPreis = document.getElementById("val-preis");
  const valSims = document.getElementById("val-sims");
  if (valAusl) valAusl.textContent = ausl + " %";
  if (valPreis) valPreis.textContent = preis + " €";
  if (valSims) valSims.textContent = String(sims);

  /* Kapazität = abrechenbare Einheiten à 45 min (10 Betriebsstunden/Sim/Tag × 24 Tage) */
  const kap     = Math.round(sims * 24 * ((10 * 60) / 45));
  const stunden = Math.round(kap * ausl / 100);
  const umsatz  = stunden * preis;

  const beH12Min = Math.ceil(SCENARIO_FIX_M1_12_MIN / preis);
  const beH12 = Math.ceil(SCENARIO_FIX_M1_12 / preis);
  const beH13 = Math.ceil(SCENARIO_FIX_AB_M13 / preis);
  const bePct12Min = minAuslastPercentForBreakEven(SCENARIO_FIX_M1_12_MIN, preis, kap);
  const bePct12 = minAuslastPercentForBreakEven(SCENARIO_FIX_M1_12, preis, kap);
  const bePct13 = minAuslastPercentForBreakEven(SCENARIO_FIX_AB_M13, preis, kap);

  const gewinnM112 = umsatz - SCENARIO_FIX_M1_12;
  const gewinnAbM13 = umsatz - SCENARIO_FIX_AB_M13;

  const setTxt = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };

  setTxt("r-stunden", stunden.toLocaleString("de-DE"));
  setTxt("r-umsatz", umsatz.toLocaleString("de-DE") + " €");
  setTxt("r-jahres", (umsatz * 12).toLocaleString("de-DE") + " €");
  setTxt("r-kap", kap.toLocaleString("de-DE") + " Einh.");

  setTxt("r-be-m112", `ab ${bePct12Min} % (${beH12Min} Einh.)`);
  setTxt("r-be-m112-hi", `bis ${bePct12} % (${beH12} Einh.)`);
  setTxt("r-be-m13", `${bePct13} % (${beH13} Einh.)`);

  const gEl = document.getElementById("r-gewinn");
  if (gEl) {
    gEl.textContent = (gewinnM112 >= 0 ? "+" : "") + gewinnM112.toLocaleString("de-DE") + " €";
    gEl.style.color = gewinnM112 >= 0 ? "#22c55e" : "#ef4444";
  }
  const g3 = document.getElementById("r-gewinn-m13");
  if (g3) {
    g3.textContent =
      "ab M 13 (6.463 €): " +
      (gewinnAbM13 >= 0 ? "+" : "") +
      gewinnAbM13.toLocaleString("de-DE") +
      " €";
  }
}

// ---- Theme Toggle ----
function applyTheme(theme) {
  const next = theme === 'light' ? 'light' : 'dark';
  document.documentElement.classList.remove('dark', 'light');
  document.documentElement.classList.add(next);
  document.body.classList.remove('dark', 'light');
  document.body.classList.add(next);
  const btn = document.getElementById('theme-btn');
  if (btn) btn.textContent = next === 'dark' ? '☀️ Light' : '🌙 Dark';
  localStorage.setItem('da_theme', next);
  updateChartTheme(next);
}

function updateChartTheme(theme) {
  const chart = window.__daChart;
  if (!chart || !chart.options || !chart.options.scales) return;
  const tick = theme === 'light' ? '#444' : '#aaa';
  const grid = theme === 'light' ? '#e0ddd8' : '#1a1a1a';
  chart.options.scales.x.ticks.color = tick;
  chart.options.scales.y.ticks.color = tick;
  chart.options.scales.x.grid.color = grid;
  chart.options.scales.y.grid.color = grid;
  chart.update('none');
}

function toggleTheme() {
  const current = document.body.classList.contains('light') ? 'light' : 'dark';
  applyTheme(current === 'dark' ? 'light' : 'dark');
}

// Theme: Klasse steht schon per Inline-Script auf <html>/<body>; hier nur UI sync
document.addEventListener('DOMContentLoaded', () => {
  const saved = localStorage.getItem('da_theme') || 'dark';
  applyTheme(saved);
});

// ---- Headless-PDF (npm run pdf) — gleiches Layout wie „Alle Kapitel · PDF“ ----
if (typeof document !== "undefined" && document.getElementById("dashboard")) {
  window.__DA_EXPORT__ = {
    enableFullReportPrintLayout() {
      document.body.classList.add("print-full-report");
      document.title = "DRIVE ARENA – Investor-Unterlage Komplett";
      const t = document.getElementById("print-doc-title");
      if (t) t.textContent = "Investor-Unterlage (alle Kapitel)";
      ensureLiqChart();
    },
    resetAfterExport() {
      document.body.classList.remove("print-full-report");
      document.title = "DRIVE ARENA – Investor Portal";
      const t = document.getElementById("print-doc-title");
      if (t) t.textContent = "";
      restoreLiqChartLayout();
    }
  };
}
