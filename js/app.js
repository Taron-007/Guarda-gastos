// Lógica de interfaz: cambia entre pantallas (login / configuración / formulario)
// y conecta los formularios con las funciones de auth.js y graph.js.

const TABLE_HEADERS = [
  "Fecha",
  "Ingreso (COP $)",
  "Tipo de ingreso",
  "Gasto (COP $)",
  "Categoría de gasto",
  "Ahorro (COP $)",
];

const CONFIG_KEY = "gg_config";
const RECENT_KEY = "gg_recent";
const PENDING_KEY = "gg_pending";

const els = {
  signout: document.getElementById("btn-signout"),
  viewLogin: document.getElementById("view-login"),
  viewSetup: document.getElementById("view-setup"),
  viewForm: document.getElementById("view-form"),

  signin: document.getElementById("btn-signin"),
  loginError: document.getElementById("login-error"),

  formSearch: document.getElementById("form-search"),
  inputSearch: document.getElementById("input-search"),
  fileResults: document.getElementById("file-results"),
  setupDetails: document.getElementById("setup-details"),
  selectWorksheet: document.getElementById("select-worksheet"),
  inputTablename: document.getElementById("input-tablename"),
  btnConfirmSetup: document.getElementById("btn-confirm-setup"),
  setupError: document.getElementById("setup-error"),
  setupStatus: document.getElementById("setup-status"),

  currentFileName: document.getElementById("current-file-name"),
  btnChangeFile: document.getElementById("btn-change-file"),
  formEntry: document.getElementById("form-entry"),
  inputFecha: document.getElementById("input-fecha"),
  inputIngreso: document.getElementById("input-ingreso"),
  inputTipoIngreso: document.getElementById("input-tipo-ingreso"),
  inputGasto: document.getElementById("input-gasto"),
  inputCategoriaGasto: document.getElementById("input-categoria-gasto"),
  inputAhorro: document.getElementById("input-ahorro"),
  formError: document.getElementById("form-error"),
  formStatus: document.getElementById("form-status"),
  pendingBox: document.getElementById("pending-box"),
  pendingCount: document.getElementById("pending-count"),
  btnRetryPending: document.getElementById("btn-retry-pending"),
  recentList: document.getElementById("recent-list"),
};

let selectedFile = null; // { id, name }

function showView(name) {
  els.viewLogin.hidden = name !== "login";
  els.viewSetup.hidden = name !== "setup";
  els.viewForm.hidden = name !== "form";
  els.signout.hidden = name === "login";
}

function getConfig() {
  try {
    return JSON.parse(localStorage.getItem(CONFIG_KEY) || "null");
  } catch {
    return null;
  }
}

function saveConfig(config) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

function getRecent() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  } catch {
    return [];
  }
}

function pushRecent(entry) {
  const items = [entry, ...getRecent()].slice(0, 5);
  localStorage.setItem(RECENT_KEY, JSON.stringify(items));
  renderRecent();
}

function renderRecent() {
  const items = getRecent();
  els.recentList.innerHTML = "";
  for (const item of items) {
    const li = document.createElement("li");
    li.className = "static";
    li.textContent = `${item.fecha} · Ingreso $${item.ingreso.toLocaleString(
      "es-CO"
    )} (${item.tipoIngreso || "-"}) · Gasto $${item.gasto.toLocaleString(
      "es-CO"
    )} (${item.categoriaGasto || "-"}) · Ahorro $${item.ahorro.toLocaleString(
      "es-CO"
    )}`;
    els.recentList.appendChild(li);
  }
}

function getPending() {
  try {
    return JSON.parse(localStorage.getItem(PENDING_KEY) || "[]");
  } catch {
    return [];
  }
}

function savePending(items) {
  localStorage.setItem(PENDING_KEY, JSON.stringify(items));
  renderPending();
}

function renderPending() {
  const items = getPending();
  els.pendingBox.hidden = items.length === 0;
  els.pendingCount.textContent = String(items.length);
}

async function flushPending() {
  const config = getConfig();
  if (!config) return;
  let items = getPending();
  if (items.length === 0) return;

  const remaining = [];
  for (const row of items) {
    try {
      const token = await getAccessToken();
      await addTableRow(token, config.itemId, config.tableName, row.values);
    } catch (err) {
      remaining.push(row);
    }
  }
  savePending(remaining);
  if (remaining.length < items.length) {
    els.formStatus.hidden = false;
    els.formStatus.textContent = `Se enviaron ${
      items.length - remaining.length
    } registro(s) pendientes.`;
  }
}

function todayISO() {
  const now = new Date();
  const tz = now.getTimezoneOffset();
  const local = new Date(now.getTime() - tz * 60000);
  return local.toISOString().slice(0, 10);
}

async function enterFormView() {
  const config = getConfig();
  els.currentFileName.textContent = config.itemName;
  els.inputFecha.value = todayISO();
  showView("form");
  renderRecent();
  renderPending();
  flushPending();
}

async function enterSetupView() {
  showView("setup");
  els.setupDetails.hidden = true;
  els.fileResults.innerHTML = "";
  selectedFile = null;
}

// ---- Eventos ----

els.signin.addEventListener("click", async () => {
  els.loginError.hidden = true;
  try {
    await signIn();
    await afterLogin();
  } catch (err) {
    els.loginError.hidden = false;
    els.loginError.textContent = "No se pudo iniciar sesión: " + err.message;
  }
});

els.signout.addEventListener("click", async () => {
  try {
    await signOut();
  } catch {
    // el usuario puede cancelar el popup de logout, no es un error crítico
  }
  showView("login");
});

els.btnChangeFile.addEventListener("click", () => {
  enterSetupView();
});

els.formSearch.addEventListener("submit", async (e) => {
  e.preventDefault();
  els.setupError.hidden = true;
  els.fileResults.innerHTML = "<li class='static'>Buscando…</li>";
  els.setupDetails.hidden = true;
  try {
    const token = await getAccessToken();
    const files = await searchExcelFiles(token, els.inputSearch.value);
    els.fileResults.innerHTML = "";
    if (files.length === 0) {
      els.fileResults.innerHTML =
        "<li class='static'>No se encontraron archivos .xlsx con ese nombre.</li>";
      return;
    }
    for (const file of files) {
      const li = document.createElement("li");
      li.textContent = file.name;
      li.addEventListener("click", () => selectFile(file, li));
      els.fileResults.appendChild(li);
    }
  } catch (err) {
    els.setupError.hidden = false;
    els.setupError.textContent = "Error al buscar: " + err.message;
  }
});

async function selectFile(file, liEl) {
  document
    .querySelectorAll("#file-results li")
    .forEach((li) => li.classList.remove("selected"));
  liEl.classList.add("selected");
  selectedFile = { id: file.id, name: file.name };

  els.setupError.hidden = true;
  els.setupDetails.hidden = false;
  els.selectWorksheet.innerHTML = "<option>Cargando…</option>";
  try {
    const token = await getAccessToken();
    const sheets = await listWorksheets(token, file.id);
    els.selectWorksheet.innerHTML = "";
    for (const sheet of sheets) {
      const opt = document.createElement("option");
      opt.value = sheet.name;
      opt.textContent = sheet.name;
      els.selectWorksheet.appendChild(opt);
    }
  } catch (err) {
    els.setupError.hidden = false;
    els.setupError.textContent = "Error al leer las hojas: " + err.message;
  }
}

els.btnConfirmSetup.addEventListener("click", async () => {
  if (!selectedFile) return;
  els.setupError.hidden = true;
  els.setupStatus.hidden = false;
  els.setupStatus.textContent = "Preparando la tabla…";
  try {
    const token = await getAccessToken();
    const worksheetName = els.selectWorksheet.value;
    const tableName = els.inputTablename.value.trim() || "Gastos";
    const table = await ensureTable(
      token,
      selectedFile.id,
      worksheetName,
      tableName,
      TABLE_HEADERS
    );
    await ensureSummarySheet(token, selectedFile.id, table.name);
    saveConfig({
      itemId: selectedFile.id,
      itemName: selectedFile.name,
      worksheetName,
      tableName: table.name,
    });
    els.setupStatus.textContent = "¡Listo!";
    await enterFormView();
  } catch (err) {
    els.setupError.hidden = false;
    els.setupError.textContent = "Error al preparar la tabla: " + err.message;
  } finally {
    els.setupStatus.hidden = true;
  }
});

els.formEntry.addEventListener("submit", async (e) => {
  e.preventDefault();
  els.formError.hidden = true;
  els.formStatus.hidden = true;

  const config = getConfig();
  const fecha = els.inputFecha.value;
  const ingreso = Number(els.inputIngreso.value || 0);
  const tipoIngreso = els.inputTipoIngreso.value.trim();
  const gasto = Number(els.inputGasto.value || 0);
  const categoriaGasto = els.inputCategoriaGasto.value.trim();
  const ahorro = Number(els.inputAhorro.value || 0);

  const values = [fecha, ingreso, tipoIngreso, gasto, categoriaGasto, ahorro];

  try {
    const token = await getAccessToken();
    await addTableRow(token, config.itemId, config.tableName, values);
    els.formStatus.hidden = false;
    els.formStatus.textContent = "Guardado en Excel ✔";
    pushRecent({ fecha, ingreso, tipoIngreso, gasto, categoriaGasto, ahorro });
    els.formEntry.reset();
    els.inputFecha.value = todayISO();
  } catch (err) {
    const pending = getPending();
    pending.push({ values, savedAt: Date.now() });
    savePending(pending);
    els.formError.hidden = false;
    els.formError.textContent =
      "No se pudo guardar ahora (sin conexión o token vencido). Se guardó localmente y se reintentará.";
    els.formEntry.reset();
    els.inputFecha.value = todayISO();
  }
});

els.btnRetryPending.addEventListener("click", flushPending);

async function afterLogin() {
  const config = getConfig();
  if (config) {
    await enterFormView();
  } else {
    await enterSetupView();
  }
}

(async function init() {
  try {
    const account = await initAuth();
    if (account) {
      await afterLogin();
    } else {
      showView("login");
    }
  } catch (err) {
    showView("login");
    els.loginError.hidden = false;
    els.loginError.textContent =
      "Error al iniciar: " + err.message + " (revisa js/msal-config.js)";
  }

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  }

  window.addEventListener("online", flushPending);
})();
