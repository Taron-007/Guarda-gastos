// Funciones de acceso a Microsoft Graph (búsqueda de archivos y lectura/escritura
// de tablas de Excel almacenadas en OneDrive).

const GRAPH_ROOT = "https://graph.microsoft.com/v1.0";

async function graphFetch(accessToken, path, options = {}) {
  const res = await fetch(`${GRAPH_ROOT}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    let detail = "";
    try {
      const body = await res.json();
      detail = body?.error?.message || JSON.stringify(body);
    } catch {
      detail = await res.text();
    }
    throw new Error(`Graph API ${res.status}: ${detail}`);
  }

  if (res.status === 204) return null;
  return res.json();
}

/** Busca archivos de Excel en el OneDrive del usuario cuyo nombre contenga `query`. */
async function searchExcelFiles(accessToken, query) {
  const term = query.trim().toLowerCase();
  const q = encodeURIComponent(query.trim());
  const data = await graphFetch(
    accessToken,
    `/me/drive/root/search(q='${q}')?$select=id,name,webUrl,parentReference,file`
  );
  const results = (data.value || []).filter((item) =>
    item.name.toLowerCase().endsWith(".xlsx")
  );
  if (results.length > 0) return results;

  // El buscador de OneDrive puede tardar minutos en indexar un archivo recién
  // creado. Como respaldo, si la búsqueda no encontró nada, revisamos también
  // los archivos que están directamente en la raíz del OneDrive (esto no
  // depende del índice de búsqueda, así que ve archivos nuevos al instante).
  const rootData = await graphFetch(
    accessToken,
    `/me/drive/root/children?$select=id,name,webUrl,parentReference,file`
  );
  return (rootData.value || []).filter(
    (item) =>
      item.name.toLowerCase().endsWith(".xlsx") &&
      item.name.toLowerCase().includes(term)
  );
}

/** Lista las hojas (worksheets) del libro de Excel indicado. */
async function listWorksheets(accessToken, itemId) {
  const data = await graphFetch(
    accessToken,
    `/me/drive/items/${itemId}/workbook/worksheets`
  );
  return data.value || [];
}

/** Lista las tablas existentes en el libro de Excel indicado. */
async function listTables(accessToken, itemId) {
  const data = await graphFetch(
    accessToken,
    `/me/drive/items/${itemId}/workbook/tables?$select=id,name`
  );
  return data.value || [];
}

/**
 * Garantiza que exista una tabla con el nombre y encabezados dados en la
 * primera hoja del libro. Si ya existe una tabla con ese nombre la reutiliza;
 * si no, escribe los encabezados en A1 y crea la tabla a partir de ese rango.
 */
async function ensureTable(accessToken, itemId, worksheetName, tableName, headers) {
  const tables = await listTables(accessToken, itemId);
  const existing = tables.find((t) => t.name === tableName);
  if (existing) return existing;

  const lastCol = String.fromCharCode("A".charCodeAt(0) + headers.length - 1);
  const range = `A1:${lastCol}1`;

  await graphFetch(
    accessToken,
    `/me/drive/items/${itemId}/workbook/worksheets('${encodeURIComponent(
      worksheetName
    )}')/range(address='${range}')`,
    {
      method: "PATCH",
      body: JSON.stringify({ values: [headers] }),
    }
  );

  const created = await graphFetch(
    accessToken,
    `/me/drive/items/${itemId}/workbook/worksheets('${encodeURIComponent(
      worksheetName
    )}')/tables/add`,
    {
      method: "POST",
      body: JSON.stringify({ address: range, hasHeaders: true }),
    }
  );

  if (created.name !== tableName) {
    await graphFetch(
      accessToken,
      `/me/drive/items/${itemId}/workbook/tables/${created.id}`,
      {
        method: "PATCH",
        body: JSON.stringify({ name: tableName }),
      }
    );
    created.name = tableName;
  }

  return created;
}

/**
 * Garantiza que exista una hoja "Resumen" con el total de ingresos, gastos y
 * ahorro, calculado con fórmulas que suman las columnas de la tabla de
 * registros (se actualizan solas cada vez que se agrega una fila nueva).
 */
async function ensureSummarySheet(accessToken, itemId, tableName) {
  const SHEET_NAME = "Resumen";
  const worksheets = await listWorksheets(accessToken, itemId);

  if (!worksheets.some((w) => w.name === SHEET_NAME)) {
    await graphFetch(accessToken, `/me/drive/items/${itemId}/workbook/worksheets/add`, {
      method: "POST",
      body: JSON.stringify({ name: SHEET_NAME }),
    });
  }

  await graphFetch(
    accessToken,
    `/me/drive/items/${itemId}/workbook/worksheets('${encodeURIComponent(
      SHEET_NAME
    )}')/range(address='A1:B3')`,
    {
      method: "PATCH",
      body: JSON.stringify({
        values: [
          ["Total ingresos (COP $)", `=SUM(${tableName}[Ingreso (COP $)])`],
          ["Total gastos (COP $)", `=SUM(${tableName}[Gasto (COP $)])`],
          ["Total ahorro (COP $)", `=SUM(${tableName}[Ahorro (COP $)])`],
        ],
      }),
    }
  );
}

/** Agrega una fila al final de la tabla indicada. `values` es un arreglo con un valor por columna. */
async function addTableRow(accessToken, itemId, tableName, values) {
  return graphFetch(
    accessToken,
    `/me/drive/items/${itemId}/workbook/tables/${encodeURIComponent(
      tableName
    )}/rows/add`,
    {
      method: "POST",
      body: JSON.stringify({ index: null, values: [values] }),
    }
  );
}
