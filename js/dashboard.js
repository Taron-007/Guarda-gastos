function computeYearSummary(transactions, year) {
  const rows = transactions.filter((t) => new Date(t.fecha + "T00:00:00").getFullYear() === year);

  const totales = { ingreso: 0, egreso: 0, ahorro: 0 };
  const porGrupo = { ingreso: {}, egreso: {}, ahorro: {} };
  const mensual = {
    ingreso: new Array(12).fill(0),
    egreso: new Array(12).fill(0),
    ahorro: new Array(12).fill(0),
  };

  rows.forEach((t) => {
    const monto = Number(t.monto) || 0;
    totales[t.tipo] += monto;
    porGrupo[t.tipo][t.grupo] = (porGrupo[t.tipo][t.grupo] || 0) + monto;
    const mes = new Date(t.fecha + "T00:00:00").getMonth();
    mensual[t.tipo][mes] += monto;
  });

  const sobrante = totales.ingreso - totales.egreso - totales.ahorro;

  return { totales, porGrupo, mensual, sobrante, count: rows.length };
}

function availableYears(transactions) {
  const years = new Set(transactions.map((t) => new Date(t.fecha + "T00:00:00").getFullYear()));
  years.add(new Date().getFullYear());
  return Array.from(years).sort((a, b) => b - a);
}

function renderDashboard(transactions, year) {
  const summary = computeYearSummary(transactions, year);

  document.getElementById("kpi-ingreso").textContent = formatCOP(summary.totales.ingreso);
  document.getElementById("kpi-egreso").textContent = formatCOP(summary.totales.egreso);
  document.getElementById("kpi-ahorro").textContent = formatCOP(summary.totales.ahorro);
  const kpiSobrante = document.getElementById("kpi-sobrante");
  kpiSobrante.textContent = formatCOP(summary.sobrante);
  kpiSobrante.closest(".kpi-card").classList.toggle("negative", summary.sobrante < 0);

  TIPOS_ORDEN.forEach((tipo) => {
    const data = Object.entries(summary.porGrupo[tipo])
      .map(([grupo, value]) => ({ label: groupLabel(tipo, grupo), value, color: CATEGORIES[tipo].color }))
      .sort((a, b) => b.value - a.value);
    renderBarList(document.getElementById("breakdown-" + tipo), data, summary.totales[tipo]);
  });

  renderMonthlyChart(document.getElementById("monthly-chart"), summary.mensual);

  document.getElementById("dashboard-empty").hidden = summary.count > 0;
}
