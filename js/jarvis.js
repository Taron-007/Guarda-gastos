// Jarvis: asistente en lenguaje natural (texto o voz) para registrar ingresos,
// gastos y ahorros, y para consultar totales. Todo se interpreta localmente en
// el navegador (sin servidores ni claves de API): tus datos siguen yendo solo
// de tu iPhone a Microsoft.

// ---------------------------------------------------------------------------
// Interpretación (funciones puras, se pueden probar sin navegador)
// ---------------------------------------------------------------------------

function jNormalize(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[¿?¡!]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const J_CATEGORIES = {
  "Alimentación": [
    "comida", "almuerzo", "almorzar", "desayuno", "desayunar", "cena", "cenar",
    "mercado", "supermercado", "restaurante", "cafe", "tinto", "pan", "panaderia",
    "fruta", "frutas", "domicilio", "rappi", "hamburguesa", "pizza", "comer",
    "onces", "mecato", "exito", "d1", "olimpica", "carulla", "jumbo", "ara",
    "pollo", "carne", "arepa", "empanada", "empanadas", "corrientazo", "snack",
  ],
  "Transporte": [
    "taxi", "uber", "didi", "indriver", "cabify", "bus", "buseta", "transmilenio",
    "transcaribe", "metro", "gasolina", "combustible", "tanqueo", "tanquear",
    "peaje", "peajes", "parqueadero", "parqueo", "pasaje", "pasajes", "moto",
    "mototaxi", "carro", "vuelo", "tiquete", "tiquetes", "avion", "soat",
  ],
  "Vivienda": ["arriendo", "alquiler", "renta", "administracion", "hipoteca", "apartamento", "casa"],
  "Servicios públicos": [
    "luz", "agua", "gas", "energia", "internet", "celular", "telefono", "servicios",
    "afinia", "claro", "movistar", "tigo", "wom", "acueducto", "recarga",
  ],
  "Salud": [
    "medico", "medicina", "medicinas", "medicamento", "medicamentos", "drogueria",
    "farmacia", "eps", "cita", "odontologo", "dentista", "examen", "examenes",
    "gimnasio", "gym", "prepagada", "terapia",
  ],
  "Entretenimiento": [
    "cine", "netflix", "spotify", "disney", "hbo", "prime", "youtube", "fiesta",
    "rumba", "cerveza", "cervezas", "trago", "tragos", "concierto", "juego",
    "juegos", "salida", "paseo", "viaje", "playa", "bar", "discoteca",
  ],
  "Educación": ["curso", "cursos", "universidad", "colegio", "libro", "libros", "matricula", "clase", "clases", "udemy", "coursera", "semestre"],
  "Ropa": ["ropa", "zapatos", "camisa", "camisas", "pantalon", "pantalones", "tenis", "vestido", "jean", "jeans", "chaqueta"],
  "Deudas": ["tarjeta", "credito", "prestamo", "deuda", "deudas", "cuota", "banco", "intereses de la tarjeta"],
};

const J_INCOME_TYPES = {
  "Salario": ["salario", "sueldo", "nomina", "quincena", "prima", "trabajo", "cesantias"],
  "Freelance": ["freelance", "proyecto", "consultoria", "asesoria", "cliente", "honorarios"],
  "Negocio": ["negocio", "venta", "ventas", "vendi", "tienda"],
  "Inversión": ["inversion", "inversiones", "dividendos", "cdt", "acciones", "cripto", "rendimientos", "intereses"],
  "Regalo": ["regalo", "regalaron", "regalo de"],
};

const J_KIND_PATTERNS = [
  // El orden importa: los verbos explícitos primero.
  ["ahorro", /\b(ahorre|ahorramos|guarde|aparte|meti al ahorro|pase al ahorro|ahorrar)\b/],
  ["ingreso", /\b(me (pagaron|consignaron|transfirieron|depositaron|llego|llegaron|entro|entraron|dieron|regalaron)|recibi|recibimos|gane|ganamos|cobre|vendi|entraron|ingrese)\b/],
  ["gasto", /\b(gaste|gastamos|pague|pagamos|compre|compramos|costo|costaron|salio|me cobraron|invite|tanquee|di)\b/],
  ["ahorro", /\b(ahorro|ahorros)\b/],
  ["ingreso", /\b(ingreso|ingresos|salario|sueldo|nomina|quincena|prima)\b/],
  ["gasto", /\b(gasto|gastos|pago|compra)\b/],
];

const J_MONTHS = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7,
  agosto: 8, septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
};

const J_WEEKDAYS = { domingo: 0, lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5, sabado: 6 };

function jISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function jAddDays(d, n) {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  r.setDate(r.getDate() + n);
  return r;
}

/** Busca una fecha en el texto. Devuelve { date: "YYYY-MM-DD" | null, rest } (rest = texto sin la fecha). */
function jExtractDate(norm, now) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let m;

  if ((m = norm.match(/\b(antier|anteayer|antes de ayer)\b/))) {
    return { date: jISO(jAddDays(today, -2)), rest: norm.replace(m[0], " ") };
  }
  if ((m = norm.match(/\bayer\b/))) {
    return { date: jISO(jAddDays(today, -1)), rest: norm.replace(m[0], " ") };
  }
  if ((m = norm.match(/\bhoy\b/))) {
    return { date: jISO(today), rest: norm.replace(m[0], " ") };
  }
  // 15/11 o 15/11/2026 o 15-11-26
  if ((m = norm.match(/\b(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{2,4}))?\b/))) {
    let year = m[3] ? Number(m[3]) : today.getFullYear();
    if (year < 100) year += 2000;
    const d = new Date(year, Number(m[2]) - 1, Number(m[1]));
    if (!isNaN(d) && d.getDate() === Number(m[1])) {
      return { date: jISO(d), rest: norm.replace(m[0], " ") };
    }
  }
  // "el 5 de noviembre", "5 de noviembre", "el 5"
  const monthNames = Object.keys(J_MONTHS).join("|");
  if ((m = norm.match(new RegExp(`\\b(?:el )?(\\d{1,2}) de (${monthNames})(?: (?:de |del )?(\\d{4}))?\\b`)))) {
    const year = m[3] ? Number(m[3]) : today.getFullYear();
    const d = new Date(year, J_MONTHS[m[2]] - 1, Number(m[1]));
    // Sin año explícito y la fecha queda en el futuro → año anterior.
    if (!m[3] && d > today) d.setFullYear(year - 1);
    return { date: jISO(d), rest: norm.replace(m[0], " ") };
  }
  if ((m = norm.match(/\bel (\d{1,2})\b(?! ?(mil|millon|millones|palo|palos|lucas?|k)\b)/))) {
    const dayNum = Number(m[1]);
    if (dayNum >= 1 && dayNum <= 31) {
      let d = new Date(today.getFullYear(), today.getMonth(), dayNum);
      if (d > today) d = new Date(today.getFullYear(), today.getMonth() - 1, dayNum);
      return { date: jISO(d), rest: norm.replace(m[0], " ") };
    }
  }
  // "el lunes", "el viernes pasado"
  if ((m = norm.match(/\b(?:el )?(domingo|lunes|martes|miercoles|jueves|viernes|sabado)(?: pasado)?\b/))) {
    const target = J_WEEKDAYS[m[1]];
    let diff = (today.getDay() - target + 7) % 7;
    if (diff === 0 && /pasado/.test(m[0])) diff = 7;
    return { date: jISO(jAddDays(today, -diff)), rest: norm.replace(m[0], " ") };
  }
  return { date: null, rest: norm };
}

function jParseNumber(raw) {
  // Separadores de miles: 25.000 / 1,500,000 / 1.500 (millones)
  if (/^\d{1,3}([.,]\d{3})+$/.test(raw)) return Number(raw.replace(/[.,]/g, ""));
  // Decimal: 3.5 / 2,5 (millones)
  return Number(raw.replace(",", "."));
}

const J_AMOUNT_RE = /\$?\s?(\d+(?:[.,]\d+)*)\s?(millones|millon|mill|palos|palo|mil|lucas|luca|k|m)?\b|\b(un|medio) (millon|palo)\b|\bmil pesos\b/g;

/** Devuelve los montos (en COP) encontrados en el texto, con su posición. */
function jExtractAmounts(text) {
  const out = [];
  J_AMOUNT_RE.lastIndex = 0;
  let m;
  while ((m = J_AMOUNT_RE.exec(text))) {
    let value;
    if (m[0] === "mil pesos") value = 1000;
    else if (m[3]) value = m[3] === "medio" ? 500000 : 1000000;
    else {
      const mult = m[2] || "";
      let n = jParseNumber(m[1]);
      if (/^(millones|millon|mill|palos|palo|m)$/.test(mult)) n *= 1e6;
      else if (/^(mil|lucas|luca|k)$/.test(mult)) n *= 1e3;
      value = n;
    }
    if (Number.isFinite(value) && value > 0) out.push({ value: Math.round(value), index: m.index });
  }
  return out;
}

function jMatchDictionary(text, dict) {
  for (const [label, words] of Object.entries(dict)) {
    for (const w of words) {
      if (new RegExp(`\\b${w}(s|es)?\\b`).test(text)) return label;
    }
  }
  return null;
}

function jDetectKind(text) {
  for (const [kind, re] of J_KIND_PATTERNS) if (re.test(text)) return kind;
  return null;
}

/**
 * Interpreta una frase de registro. Devuelve
 * { date, rows: [{ingreso, tipoIngreso, gasto, categoriaGasto, ahorro}], missing: [] }
 * o null si no encontró ningún monto.
 */
function jarvisParseEntry(input, now = new Date()) {
  const norm = jNormalize(input);
  const { date, rest } = jExtractDate(norm, now);

  // Divide en cláusulas: "gané 100 mil y gasté 30 mil en taxi".
  const parts = rest.split(/\s*(?:;|,(?!\d)|\.(?!\d)|\by\b|\btambien\b|\bademas\b|\bluego\b|\bdespues\b)\s*/).filter(Boolean);
  const clauses = [];
  for (const p of parts) {
    const amounts = jExtractAmounts(p);
    if (amounts.length === 0 && clauses.length) clauses[clauses.length - 1].text += " " + p;
    else clauses.push({ text: p, amounts });
  }

  const items = [];
  let lastKind = null;
  for (const c of clauses) {
    if (c.amounts.length === 0) continue;
    const kind = jDetectKind(c.text) || lastKind;
    const categoria = jMatchDictionary(c.text, J_CATEGORIES);
    const tipo = jMatchDictionary(c.text, J_INCOME_TYPES);
    const finalKind = kind || (tipo && !categoria ? "ingreso" : categoria ? "gasto" : null);
    lastKind = finalKind;
    // "2 almuerzos de 15 mil" → 2 × 15.000. Si hay otros montos sueltos se usa el último.
    let amount = c.amounts[c.amounts.length - 1].value;
    const qty = c.text.match(/\b(\d{1,2}) [a-z]+(?: [a-z]+)? (?:de|a|por) \$?\s?\d/);
    if (qty && c.amounts.length >= 2) amount *= Number(qty[1]);
    items.push({ kind: finalKind, amount, categoria, tipo });
  }
  if (items.length === 0) return null;

  const rows = [];
  const newRow = () => ({ ingreso: 0, tipoIngreso: "", gasto: 0, categoriaGasto: "", ahorro: 0 });
  let row = newRow();
  const missing = [];
  for (const it of items) {
    const kind = it.kind || "gasto";
    if (!it.kind) missing.push("tipo");
    const field = kind;
    if (row[field] > 0) {
      rows.push(row);
      row = newRow();
    }
    row[field] = it.amount;
    if (kind === "gasto") row.categoriaGasto = it.categoria || "Otros";
    if (kind === "ingreso") row.tipoIngreso = it.tipo || "Otro";
  }
  rows.push(row);

  return { date: date || jISO(now), rows, missing };
}

/** Detecta si la frase es una pregunta sobre totales. Devuelve la consulta o null. */
function jarvisParseQuery(input, now = new Date()) {
  const norm = jNormalize(input);
  if (!/\b(cuanto|cuantos|total|totales|resumen|balance|como voy|saldo|cuanta plata|reporte)\b/.test(norm)) return null;

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let from, to = today, periodLabel;
  if (/\bhoy\b/.test(norm)) { from = today; periodLabel = "hoy"; }
  else if (/\bayer\b/.test(norm)) { from = to = jAddDays(today, -1); periodLabel = "ayer"; }
  else if (/\bsemana pasada\b/.test(norm)) {
    const dow = (today.getDay() + 6) % 7; // lunes = 0
    from = jAddDays(today, -dow - 7); to = jAddDays(from, 6); periodLabel = "la semana pasada";
  } else if (/\bsemana\b/.test(norm)) {
    const dow = (today.getDay() + 6) % 7;
    from = jAddDays(today, -dow); periodLabel = "esta semana";
  } else if (/\bmes pasado\b/.test(norm)) {
    from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    to = new Date(today.getFullYear(), today.getMonth(), 0); periodLabel = "el mes pasado";
  } else if (/\b(ano|año)\b/.test(norm)) {
    from = new Date(today.getFullYear(), 0, 1); periodLabel = "este año";
  } else if (/\b(siempre|todo|historico|total general)\b/.test(norm)) {
    from = new Date(1900, 0, 1); periodLabel = "en total";
  } else {
    const month = Object.keys(J_MONTHS).find((mn) => new RegExp(`\\b${mn}\\b`).test(norm));
    if (month) {
      let y = today.getFullYear();
      if (J_MONTHS[month] - 1 > today.getMonth()) y -= 1;
      from = new Date(y, J_MONTHS[month] - 1, 1);
      to = new Date(y, J_MONTHS[month], 0); periodLabel = `en ${month}`;
    } else {
      from = new Date(today.getFullYear(), today.getMonth(), 1); periodLabel = "este mes";
    }
  }

  let metric = "all";
  if (/\b(gaste|gastado|gasto|gastos|pague|compre)\b/.test(norm)) metric = "gasto";
  else if (/\b(ingreso|ingresos|gane|recibi|entro|entraron|me pagaron)\b/.test(norm)) metric = "ingreso";
  else if (/\b(ahorre|ahorro|ahorrado|ahorros)\b/.test(norm)) metric = "ahorro";

  const categoria = jMatchDictionary(norm, J_CATEGORIES) ||
    Object.keys(J_CATEGORIES).find((c) => norm.includes(jNormalize(c))) || null;

  return { from: jISO(from), to: jISO(to), periodLabel, metric, categoria };
}

/** Convierte una celda de fecha de Excel (número serial o texto) a "YYYY-MM-DD". */
function jCellToISO(cell) {
  if (typeof cell === "number" && cell > 0) {
    const ms = Math.round((cell - 25569) * 86400000); // 25569 = 1970-01-01
    const d = new Date(ms);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
  }
  const s = String(cell || "").trim();
  let m;
  if ((m = s.match(/^(\d{4})-(\d{2})-(\d{2})/))) return `${m[1]}-${m[2]}-${m[3]}`;
  if ((m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/))) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return null;
}

/** Suma las filas de la tabla (arreglo de [Fecha, Ingreso, Tipo, Gasto, Categoría, Ahorro]) según la consulta. */
function jarvisSummarize(rows, query) {
  const totals = { ingreso: 0, gasto: 0, ahorro: 0, count: 0 };
  const byCat = {};
  for (const r of rows) {
    const iso = jCellToISO(r[0]);
    if (!iso || iso < query.from || iso > query.to) continue;
    const cat = String(r[4] || "");
    if (query.categoria && jNormalize(cat) !== jNormalize(query.categoria)) {
      continue;
    }
    const ingreso = Number(r[1]) || 0, gasto = Number(r[3]) || 0, ahorro = Number(r[5]) || 0;
    totals.ingreso += ingreso;
    totals.gasto += gasto;
    totals.ahorro += ahorro;
    totals.count += 1;
    if (gasto) byCat[cat || "Sin categoría"] = (byCat[cat || "Sin categoría"] || 0) + gasto;
  }
  const topCat = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0] || null;
  return { ...totals, topCat };
}

function jMoney(n) {
  return "$" + Math.round(n).toLocaleString("es-CO");
}

function jarvisDescribeSummary(s, q) {
  const cat = q.categoria ? ` en ${q.categoria}` : "";
  if (s.count === 0) return `No tengo registros${cat} ${q.periodLabel}.`;
  if (q.metric === "gasto") {
    let msg = `Gastaste ${jMoney(s.gasto)}${cat} ${q.periodLabel}.`;
    if (!q.categoria && s.topCat) msg += ` Lo que más pesa: ${s.topCat[0]} (${jMoney(s.topCat[1])}).`;
    return msg;
  }
  if (q.metric === "ingreso") return `Tus ingresos ${q.periodLabel} suman ${jMoney(s.ingreso)}.`;
  if (q.metric === "ahorro") return `Ahorraste ${jMoney(s.ahorro)} ${q.periodLabel}.`;
  const neto = s.ingreso - s.gasto - s.ahorro;
  let msg = `Resumen ${q.periodLabel}${cat}: ingresos ${jMoney(s.ingreso)}, gastos ${jMoney(s.gasto)}, ahorro ${jMoney(s.ahorro)}. Disponible: ${jMoney(neto)}.`;
  if (s.topCat) msg += ` Mayor gasto: ${s.topCat[0]} (${jMoney(s.topCat[1])}).`;
  return msg;
}

function jarvisDescribeRow(row, date) {
  const parts = [];
  if (row.ingreso) parts.push(`Ingreso ${jMoney(row.ingreso)} (${row.tipoIngreso})`);
  if (row.gasto) parts.push(`Gasto ${jMoney(row.gasto)} (${row.categoriaGasto})`);
  if (row.ahorro) parts.push(`Ahorro ${jMoney(row.ahorro)}`);
  return `${parts.join(" · ")} — ${date}`;
}

if (typeof module !== "undefined") {
  module.exports = { jarvisParseEntry, jarvisParseQuery, jarvisSummarize, jarvisDescribeSummary, jCellToISO, jExtractAmounts };
}

// ---------------------------------------------------------------------------
// Interfaz (solo en el navegador)
// ---------------------------------------------------------------------------

if (typeof document !== "undefined") {
  (function initJarvisUI() {
    const log = document.getElementById("jarvis-log");
    const form = document.getElementById("jarvis-form");
    const input = document.getElementById("jarvis-input");
    const mic = document.getElementById("jarvis-mic");
    if (!log || !form) return;

    const HELP =
      "Puedes decirme cosas como: «gasté 25 mil en almuerzo», «ayer pagué 80 mil de luz», " +
      "«me pagaron la quincena 2,5 millones y ahorré 300 mil», o preguntarme «¿cuánto gasté este mes?», " +
      "«¿cuánto gasté en transporte esta semana?», «resumen del mes pasado».";

    let lastFromVoice = false;

    function speak(text) {
      if (!lastFromVoice || !("speechSynthesis" in window)) return;
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "es-CO";
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    }

    function addMessage(who, text) {
      const div = document.createElement("div");
      div.className = `jarvis-msg ${who}`;
      div.textContent = text;
      log.appendChild(div);
      log.scrollTop = log.scrollHeight;
      if (who === "bot") speak(text);
      return div;
    }

    function proposeEntry(parsed) {
      const msg = addMessage(
        "bot",
        (parsed.rows.length > 1 ? "Entendí estos registros:\n" : "Entendí: ") +
          parsed.rows.map((r) => jarvisDescribeRow(r, parsed.date)).join("\n") +
          (parsed.missing.length ? "\n(No supe si era ingreso o gasto; lo tomé como gasto.)" : "")
      );
      const actions = document.createElement("div");
      actions.className = "jarvis-actions";
      const btnSave = document.createElement("button");
      btnSave.type = "button";
      btnSave.className = "jarvis-btn primary";
      btnSave.textContent = "Guardar en Excel";
      const btnEdit = document.createElement("button");
      btnEdit.type = "button";
      btnEdit.className = "jarvis-btn";
      btnEdit.textContent = "Editar en formulario";
      const btnCancel = document.createElement("button");
      btnCancel.type = "button";
      btnCancel.className = "jarvis-btn";
      btnCancel.textContent = "Cancelar";
      actions.append(btnSave, btnEdit, btnCancel);
      msg.appendChild(actions);

      const done = () => actions.remove();
      btnSave.addEventListener("click", async () => {
        done();
        let saved = 0, pending = 0;
        for (const r of parsed.rows) {
          const res = await saveEntry({ fecha: parsed.date, ...r });
          if (res.ok) saved++; else pending++;
        }
        addMessage(
          "bot",
          pending === 0
            ? `Listo, guardé ${saved} registro(s) en tu Excel ✔`
            : `Sin conexión: guardé ${pending} registro(s) en el teléfono y los envío cuando vuelva internet.`
        );
      });
      btnEdit.addEventListener("click", () => {
        done();
        fillForm({ fecha: parsed.date, ...parsed.rows[0] });
        addMessage("bot", "Te lo dejé en el formulario. Revisa y toca «Guardar en Excel».");
        document.getElementById("form-entry").scrollIntoView({ behavior: "smooth" });
      });
      btnCancel.addEventListener("click", () => {
        done();
        addMessage("bot", "Cancelado.");
      });
    }

    async function answerQuery(query) {
      const thinking = addMessage("bot", "Consultando tu Excel…");
      try {
        const config = getConfig();
        const token = await getAccessToken();
        const rows = await getTableValues(token, config.itemId, config.tableName);
        thinking.remove();
        addMessage("bot", jarvisDescribeSummary(jarvisSummarize(rows, query), query));
      } catch (err) {
        thinking.remove();
        addMessage("bot", "No pude leer tu Excel ahora (¿sin conexión?). " + err.message);
      }
    }

    async function handle(text) {
      const clean = text.trim();
      if (!clean) return;
      addMessage("user", clean);
      const norm = jNormalize(clean);

      if (/^(hola|buenas|hey|jarvis)\b/.test(norm) && jExtractAmounts(norm).length === 0) {
        addMessage("bot", "Hola, soy Jarvis. " + HELP);
        return;
      }
      if (/\b(ayuda|que puedes hacer|como funciona|comandos)\b/.test(norm)) {
        addMessage("bot", HELP);
        return;
      }

      const query = jarvisParseQuery(clean);
      const entry = jarvisParseEntry(clean);
      if (query && (!entry || /\b(cuanto|cuantos)\b/.test(norm))) {
        await answerQuery(query);
        return;
      }
      if (entry) {
        proposeEntry(entry);
        return;
      }
      addMessage("bot", "No encontré un monto en lo que dijiste. " + HELP);
    }

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      lastFromVoice = false;
      const text = input.value;
      input.value = "";
      handle(text);
    });

    // ---- Voz (Web Speech API; en iPhone requiere Safari con Siri/Dictado activado) ----
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      mic.hidden = true;
    } else {
      let rec = null;
      mic.addEventListener("click", () => {
        if (rec) {
          rec.stop();
          return;
        }
        rec = new Recognition();
        rec.lang = "es-CO";
        rec.interimResults = false;
        rec.maxAlternatives = 1;
        mic.classList.add("listening");
        mic.setAttribute("aria-label", "Detener");
        rec.onresult = (ev) => {
          const said = ev.results[0][0].transcript;
          lastFromVoice = true;
          handle(said);
        };
        rec.onerror = (ev) => {
          if (ev.error !== "aborted" && ev.error !== "no-speech") {
            addMessage("bot", "No pude usar el micrófono (" + ev.error + "). Revisa los permisos o escribe el mensaje.");
          }
        };
        rec.onend = () => {
          rec = null;
          mic.classList.remove("listening");
          mic.setAttribute("aria-label", "Hablar con Jarvis");
        };
        rec.start();
      });
    }

    addMessage("bot", "Hola, soy Jarvis 🤖. Dime qué gastaste o recibiste, o pregúntame cómo vas. Escribe «ayuda» para ver ejemplos.");
  })();
}
