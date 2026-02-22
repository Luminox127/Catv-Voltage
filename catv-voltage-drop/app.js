// CATV AC Voltage Drop — CommScope Parameter III
// Uses Nominal DC Loop Resistance (ohms per 1000 ft) @ 68°F from your sheet.
// Adds temperature correction: 0.1% per °F relative to 68°F.

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}

const $ = (id) => document.getElementById(id);

// Values from your photo (ohms per 1000 ft @ 68°F)
const R_TABLE = {
  copperclad: { // Copper Clad
    "0.500": 1.72,
    "0.625": 1.10,
    "0.750": 0.76,
    "0.875": 0.55
  },
  solidcopper: { // Solid Copper
    "0.500": 1.20,
    "0.625": 0.82,
    "0.750": 0.56,
    "0.875": 0.41
  }
};

function n(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}

function clamp(x, min, max) {
  return Math.max(min, Math.min(max, x));
}

function formatOhmsPerKft(v) {
  return `${v.toFixed(3)} Ω / 1000 ft`;
}

$("calc").addEventListener("click", () => {
  const cable = $("cable").value;
  const material = $("material").value;

  const feet = n($("feet").value);
  const amps = n($("amps").value);
  const sourceV = n($("sourceV").value);

  const tempF = n($("tempF").value) ?? 68;
  const limitPct = n($("limitPct").value) ?? 10;
  const minEndV = n($("minEndV").value) ?? 60;

  if (!feet || feet <= 0) return alert("Enter Run Length (ft).");
  if (!amps || amps <= 0) return alert("Enter Load Current (A).");
  if (!sourceV || sourceV <= 0) return alert("Enter Source VAC.");

  const baseR = R_TABLE?.[material]?.[cable];
  if (!baseR) return alert("Missing resistance table value.");

  // Temp correction: R increases 0.1% per °F above 68°F (decreases below 68°F)
  const deltaT = tempF - 68;
  const tempFactor = 1 + (0.001 * deltaT);

  // Avoid totally insane values if someone fat-fingers temp
  const safeTempFactor = clamp(tempFactor, 0.7, 1.5);

  const R = baseR * safeTempFactor;

  const vdrop = amps * R * (feet / 1000);
  const vend = sourceV - vdrop;
  const pctDrop = (vdrop / sourceV) * 100;

  $("out").style.display = "grid";
  $("rUsed").textContent = `${formatOhmsPerKft(R)} (base ${formatOhmsPerKft(baseR)}, temp ${tempF}°F)`;
  $("vd").textContent = `${vdrop.toFixed(2)} V`;
  $("pct").textContent = `${pctDrop.toFixed(2)} %`;
  $("vend").textContent = `${vend.toFixed(2)} VAC`;

  // Status logic
  const pill = $("statusPill");
  pill.classList.remove("warn", "good", "bad");

  let statusText = "Calculated.";
  let detail = "";

  const pctWarn = pctDrop >= limitPct;
  const endWarn = vend <= minEndV;

  if (pctWarn && endWarn) {
    pill.classList.add("bad");
    statusText = "Bad: high drop AND low end voltage.";
  } else if (endWarn) {
    pill.classList.add("warn");
    statusText = "Warning: far-end voltage is low.";
  } else if (pctWarn) {
    pill.classList.add("warn");
    statusText = "Warning: percent drop is high.";
  } else {
    pill.classList.add("good");
    statusText = "OK.";
  }

  detail =
    `Drop threshold: ${limitPct}% | End voltage threshold: ${minEndV}VAC`;

  $("status").textContent = statusText;
  $("statusDetail").textContent = detail;
});
