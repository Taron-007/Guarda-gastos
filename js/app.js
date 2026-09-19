(function () {
  let transactions = [];
  let currentYear = new Date().getFullYear();

  const views = ["dashboard", "nuevo", "historial", "ajustes"];

  function showView(name) {
    views.forEach((v) => {
      document.getElementById("view-" + v).hidden = v !== name;
      document.getElementById("tab-" + v).classList.toggle("active", v === name);
    });
    if (name === "dashboard") renderDashboard(transactions, currentYear);
    if (name === "historial") renderHistorial();
  }

  function setupTabs() {
    views.forEach((v) => {
      document.getElementById("tab-" + v).addEventListener("click", () => showView(v));
    });
  }

  // ---------- Formulario "Nuevo" ----------

  function fillGroupSelect(tipo) {
    const groupSelect = document.getElementById("input-grupo");
    groupSelect.innerHTML = "";
    Object.entries(CATEGORIES[tipo].groups).forEach(([key, g]) => {
      const opt = document.createElement("option");
      opt.value = key;
      opt.textContent = g.label;
      groupSelect.appendChild(opt);
    });
    fillSubcatSelect(tipo, groupSelect.value);
  }

  function fillSubcatSelect(tipo, grupoKey) {
    const wrap = document.getElementById("subcat-wrap");
    const select = document.getElementById("input-subcat");
    const group = CATEGORIES[tipo].groups[grupoKey];
    if (!group || !group.subcats) {
      wrap.hidden = true;
      select.innerHTML = "";
      return;
    }
    wrap.hidden = false;
    select.innerHTML = "";
    group.subcats.forEach((s) => {
      const opt = document.createElement("option");
      opt.value = s;
      opt.textContent = s;
      select.appendChild(opt);
    });
  }

  function setupForm() {
    const tipoSelect = document.getElementById("input-tipo");
    const grupoSelect = document.getElementById("input-grupo");
    const fechaInput = document.getElementById("input-fecha");
    fechaInput.value = new Date().toISOString().slice(0, 10);

    tipoSelect.addEventListener("change", () => fillGroupSelect(tipoSelect.value));
    grupoSelect.addEventListener("change", () => fillSubcatSelect(tipoSelect.value, grupoSelect.value));
    fillGroupSelect(tipoSelect.value);

    document.getElementById("form-nuevo").addEventListener("submit", async (e) => {
      e.preventDefault();
      const tipo = tipoSelect.value;
      const grupo = grupoSelect.value;
      const subcatWrap = document.getElementById("subcat-wrap");
      const subcat = subcatWrap.hidden ? null : document.getElementById("input-subcat").value;
      const monto = Number(document.getElementById("input-monto").value);
      const fecha = fechaInput.value;
      const nota = document.getElementById("input-nota").value.trim();

      if (!fecha || !monto || monto <= 0) {
        showStatus("form-status", "Ingresa una fecha y un monto válido.", true);
        return;
      }

      await DB.add({ tipo, grupo, subcat, monto, fecha, nota });
      await reloadTransactions();

      document.getElementById("input-monto").value = "";
      document.getElementById("input-nota").value = "";
      showStatus("form-status", "Registro guardado.", false);
      currentYear = new Date(fecha + "T00:00:00").getFullYear();
      syncYearSelect();
    });
  }

  function showStatus(elId, msg, isError) {
    const el = document.getElementById(elId);
    el.textContent = msg;
    el.hidden = false;
    el.classList.toggle("error", isError);
    setTimeout(() => (el.hidden = true), 2500);
  }

  // ---------- Dashboard: selector de año ----------

  function syncYearSelect() {
    const select = document.getElementById("select-year");
    const years = availableYears(transactions);
    select.innerHTML = "";
    years.forEach((y) => {
      const opt = document.createElement("option");
      opt.value = y;
      opt.textContent = y;
      select.appendChild(opt);
    });
    select.value = currentYear;
    renderDashboard(transactions, currentYear);
  }

  function setupYearSelect() {
    document.getElementById("select-year").addEventListener("change", (e) => {
      currentYear = Number(e.target.value);
      renderDashboard(transactions, currentYear);
    });
  }

  // ---------- Historial ----------

  function renderHistorial() {
    const list = document.getElementById("historial-list");
    const yearFilter = document.getElementById("historial-year").value;
    const tipoFilter = document.getElementById("historial-tipo").value;

    let rows = transactions;
    if (yearFilter !== "todos") {
      rows = rows.filter((t) => String(new Date(t.fecha + "T00:00:00").getFullYear()) === yearFilter);
    }
    if (tipoFilter !== "todos") {
      rows = rows.filter((t) => t.tipo === tipoFilter);
    }

    list.innerHTML = "";
    if (rows.length === 0) {
      list.innerHTML = '<p class="empty-hint">No hay registros con este filtro.</p>';
      return;
    }

    rows.forEach((t) => {
      const item = document.createElement("li");
      item.className = "hist-item";
      const subcatTxt = t.subcat ? " · " + t.subcat : "";
      item.innerHTML = `
        <span class="hist-dot" style="background:${CATEGORIES[t.tipo].color}"></span>
        <div class="hist-main">
          <div class="hist-title">${groupLabel(t.tipo, t.grupo)}${subcatTxt}</div>
          <div class="hist-sub">${t.fecha}${t.nota ? " · " + t.nota : ""}</div>
        </div>
        <div class="hist-amount">${formatCOP(t.monto)}</div>
        <button class="hist-delete" aria-label="Eliminar" data-id="${t.id}">✕</button>
      `;
      list.appendChild(item);
    });

    list.querySelectorAll(".hist-delete").forEach((btn) => {
      btn.addEventListener("click", async () => {
        await DB.remove(btn.dataset.id);
        await reloadTransactions();
        renderHistorial();
      });
    });
  }

  function setupHistorialFilters() {
    const yearSelect = document.getElementById("historial-year");
    const fillYears = () => {
      yearSelect.innerHTML = '<option value="todos">Todos los años</option>';
      availableYears(transactions).forEach((y) => {
        const opt = document.createElement("option");
        opt.value = y;
        opt.textContent = y;
        yearSelect.appendChild(opt);
      });
    };
    fillYears();
    yearSelect.addEventListener("change", renderHistorial);
    document.getElementById("historial-tipo").addEventListener("change", renderHistorial);
  }

  // ---------- Ajustes: respaldo local ----------

  function setupAjustes() {
    document.getElementById("btn-export").addEventListener("click", () => {
      const blob = new Blob([JSON.stringify(transactions, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `guarda-gastos-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });

    document.getElementById("input-import").addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const text = await file.text();
      try {
        const data = JSON.parse(text);
        if (!Array.isArray(data)) throw new Error("formato inválido");
        if (!confirm(`Se importarán ${data.length} registros y se reemplazarán los datos actuales. ¿Continuar?`)) {
          e.target.value = "";
          return;
        }
        await DB.replaceAll(data);
        await reloadTransactions();
        showStatus("ajustes-status", "Datos importados correctamente.", false);
      } catch (err) {
        showStatus("ajustes-status", "El archivo no es un respaldo válido.", true);
      }
      e.target.value = "";
    });

    document.getElementById("btn-reset").addEventListener("click", async () => {
      if (!confirm("Esto borrará TODOS los registros guardados en este dispositivo. ¿Continuar?")) return;
      await DB.replaceAll([]);
      await reloadTransactions();
      showStatus("ajustes-status", "Todos los registros fueron borrados.", false);
    });
  }

  // ---------- Carga de datos ----------

  async function reloadTransactions() {
    transactions = await DB.all();
    syncYearSelect();
    const yearSelect = document.getElementById("historial-year");
    if (yearSelect) {
      const prev = yearSelect.value;
      yearSelect.innerHTML = '<option value="todos">Todos los años</option>';
      availableYears(transactions).forEach((y) => {
        const opt = document.createElement("option");
        opt.value = y;
        opt.textContent = y;
        yearSelect.appendChild(opt);
      });
      if (Array.from(yearSelect.options).some((o) => o.value === prev)) yearSelect.value = prev;
    }
  }

  async function init() {
    setupTabs();
    setupForm();
    setupYearSelect();
    setupHistorialFilters();
    setupAjustes();
    await reloadTransactions();
    showView("dashboard");

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("./service-worker.js").catch(() => {});
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
