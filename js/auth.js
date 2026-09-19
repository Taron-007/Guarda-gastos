// Manejo de sesión con MSAL (Microsoft Authentication Library).

let activeAccount = null;

// Si algo falla al crear la instancia de MSAL (config inválida, la librería
// de msal-browser no cargó, etc.) lo capturamos aquí para poder mostrar el
// error real en pantalla, en vez de un error genérico y confuso más
// adelante. También esperamos initialize() una sola vez desde acá: todas
// las funciones usan la misma promesa, así no importa si el usuario toca
// "Iniciar sesión" antes de que termine de cargar.
let msalInstance;
let msalReady;
try {
  msalInstance = new msal.PublicClientApplication(msalConfig);
  msalReady = msalInstance.initialize();
} catch (err) {
  msalReady = Promise.reject(
    new Error("No se pudo crear la instancia de MSAL: " + err.message)
  );
}

async function initAuth() {
  await msalReady;
  const response = await msalInstance.handleRedirectPromise();
  if (response?.account) {
    activeAccount = response.account;
  } else {
    const accounts = msalInstance.getAllAccounts();
    if (accounts.length > 0) activeAccount = accounts[0];
  }
  return activeAccount;
}

async function signIn() {
  await msalReady;
  const result = await msalInstance.loginPopup({ scopes: graphScopes });
  activeAccount = result.account;
  return activeAccount;
}

async function signOut() {
  await msalReady;
  const account = activeAccount || msalInstance.getAllAccounts()[0];
  return msalInstance.logoutPopup({ account });
}

async function getAccessToken() {
  await msalReady;
  if (!activeAccount) throw new Error("No hay sesión iniciada");
  const request = { scopes: graphScopes, account: activeAccount };
  try {
    const result = await msalInstance.acquireTokenSilent(request);
    return result.accessToken;
  } catch (err) {
    const result = await msalInstance.acquireTokenPopup(request);
    return result.accessToken;
  }
}
