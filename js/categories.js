// Catálogo de categorías de la app. Estructura fija a propósito (no es un
// CRUD de categorías): estas son las cuentas reales que se quieren controlar.
const CATEGORIES = {
  ingreso: {
    label: "Ingreso",
    color: "#16a34a",
    groups: {
      salario: { label: "Salario", subcats: null },
      renta: { label: "Renta de apartamentos", subcats: ["Vissani", "Masseratti", "Nuvo Park"] },
      negocio: { label: "Negocios", subcats: ["Préstamos", "Varios"] },
    },
  },
  egreso: {
    label: "Egreso",
    color: "#dc2626",
    groups: {
      servicios: { label: "Servicios públicos", subcats: ["Agua", "Energía", "Gas", "Internet"] },
      tarjeta: { label: "Tarjeta de crédito", subcats: ["Visa", "Mastercard"] },
      carro: { label: "Carro", subcats: ["Gasolina", "Mantenimiento", "Reparaciones", "SOAT", "Tecnomecánica"] },
      leasing: { label: "Leasing", subcats: ["Barceloneta", "Vissani"] },
      comida: { label: "Comida", subcats: ["Restaurantes", "Mercado"] },
      diversion: { label: "Diversión", subcats: null },
      admon: { label: "Administración apartamentos", subcats: ["Vissani", "Barceloneta", "Masseratti", "Nuvo Park"] },
      compras: { label: "Compras", subcats: null },
      medico: { label: "Médico", subcats: null },
      violeta: { label: "Violeta", subcats: null },
      muchacha: { label: "Pago muchacha", subcats: null },
    },
  },
  ahorro: {
    label: "Ahorro",
    color: "#2563eb",
    groups: {
      fiducuenta: { label: "Fiducuenta", subcats: null },
      aptos: { label: "Aptos", subcats: null },
      impuestos: { label: "Impuestos", subcats: null },
      emergencia: { label: "Emergencia", subcats: null },
    },
  },
};

const TIPOS_ORDEN = ["ingreso", "egreso", "ahorro"];

function groupLabel(tipo, grupo) {
  const g = CATEGORIES[tipo] && CATEGORIES[tipo].groups[grupo];
  return g ? g.label : grupo;
}

function formatCOP(value) {
  const n = Math.round(Number(value) || 0);
  return n.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
}
