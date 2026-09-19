// Gráficos ligeros dibujados a mano en SVG (sin librerías externas, para que
// la app funcione 100% sin conexión).

function svg(tag, attrs) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const k in attrs) el.setAttribute(k, attrs[k]);
  return el;
}

// Barras horizontales: data = [{label, value, color}]
function renderBarList(container, data, total) {
  container.innerHTML = "";
  const max = Math.max(1, ...data.map((d) => d.value));
  data.forEach((d) => {
    const row = document.createElement("div");
    row.className = "bar-row";

    const top = document.createElement("div");
    top.className = "bar-row-top";
    const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
    top.innerHTML = `<span class="bar-label">${d.label}</span><span class="bar-value">${formatCOP(d.value)} <small>(${pct}%)</small></span>`;
    row.appendChild(top);

    const track = document.createElement("div");
    track.className = "bar-track";
    const fill = document.createElement("div");
    fill.className = "bar-fill";
    fill.style.width = Math.max(2, (d.value / max) * 100) + "%";
    fill.style.background = d.color;
    track.appendChild(fill);
    row.appendChild(track);

    container.appendChild(row);
  });
  if (data.length === 0) {
    container.innerHTML = '<p class="empty-hint">Sin registros todavía.</p>';
  }
}

// Barras agrupadas por mes: series = [{key, color}], monthly = {ingreso:[12], egreso:[12], ahorro:[12]}
function renderMonthlyChart(el, monthly) {
  const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const W = 340, H = 180, padTop = 10, padBottom = 22, padLeft = 4;
  const chartH = H - padTop - padBottom;
  const max = Math.max(1, ...monthly.ingreso, ...monthly.egreso, ...monthly.ahorro);

  el.innerHTML = "";
  el.setAttribute("viewBox", `0 0 ${W} ${H}`);
  el.setAttribute("preserveAspectRatio", "none");

  const groupW = (W - padLeft) / 12;
  const barW = groupW / 4.2;
  const colors = { ingreso: "#16a34a", egreso: "#dc2626", ahorro: "#2563eb" };

  for (let m = 0; m < 12; m++) {
    const gx = padLeft + m * groupW;
    ["ingreso", "egreso", "ahorro"].forEach((key, i) => {
      const v = monthly[key][m] || 0;
      const h = (v / max) * chartH;
      const x = gx + i * (barW + 2);
      const y = padTop + (chartH - h);
      el.appendChild(
        svg("rect", { x, y, width: barW, height: Math.max(h, v > 0 ? 1 : 0), fill: colors[key], rx: 1.5 })
      );
    });
    const label = svg("text", { x: gx + groupW / 2 - 6, y: H - 6, class: "chart-axis-label" });
    label.textContent = meses[m];
    el.appendChild(label);
  }
}
