// Configuración de autenticación con Microsoft (Azure AD / cuenta Microsoft personal).
//
// Debes completar clientId con el "Application (client) ID" que obtienes al
// registrar la app en https://entra.microsoft.com (gratis, ver README.md,
// sección "1. Registrar la app en Microsoft").
//
// No pongas aquí ninguna contraseña ni "client secret": esta es una app
// pública (SPA) y no los necesita.
const msalConfig = {
  auth: {
    // Reemplaza por el Application (client) ID de tu registro en Entra ID.
    clientId: "f8dce7b1-f61c-4874-999d-67979c29efd3",
    // "consumers" = solo cuentas personales (outlook.com, hotmail.com, etc.)
    // "organizations" = solo cuentas de trabajo/escuela
    // "common" = ambas
    authority: "https://login.microsoftonline.com/consumers",
    // Fija (no calculada desde window.location): abrir la app desde Safari
    // normal carga ".../Guarda-gastos/", pero abrirla desde el ícono
    // instalado en la pantalla de inicio carga ".../Guarda-gastos/index.html"
    // (por el start_url del manifest). Si esta URI se calculara dinámicamente,
    // cada forma de abrir la app generaría una redirectUri distinta y solo
    // una podría coincidir con la registrada en Entra ID. Debe coincidir
    // EXACTO con la URI de redirección configurada ahí.
    redirectUri: window.location.origin + "/Guarda-gastos/",
  },
  cache: {
    cacheLocation: "localStorage",
    storeAuthStateInCookie: false,
  },
};

// Permiso mínimo necesario: leer y escribir los archivos del propio usuario en OneDrive.
const graphScopes = ["Files.ReadWrite", "User.Read"];

const graphConfig = {
  graphMeEndpoint: "https://graph.microsoft.com/v1.0/me",
};
