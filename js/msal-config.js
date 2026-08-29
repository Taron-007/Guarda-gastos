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
    clientId: "REEMPLAZA_CON_TU_CLIENT_ID",
    // "consumers" = solo cuentas personales (outlook.com, hotmail.com, etc.)
    // "organizations" = solo cuentas de trabajo/escuela
    // "common" = ambas
    authority: "https://login.microsoftonline.com/consumers",
    // Debe coincidir EXACTO con la URI de redirección configurada en Entra ID
    // y con la URL donde publiques esta app (GitHub Pages, etc.).
    redirectUri: window.location.origin + window.location.pathname,
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
