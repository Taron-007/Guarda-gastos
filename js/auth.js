// Manejo de sesión con MSAL (Microsoft Authentication Library).

const msalInstance = new msal.PublicClientApplication(msalConfig);
let activeAccount = null;

// MSAL exige que initialize() termine antes de llamar cualquier otro método.
// Se dispara una sola vez aquí y todas las funciones esperan esta misma
// promesa, para no depender de que initAuth() ya haya corrido (por ejemplo,
// si el usuario toca "Iniciar sesión" muy rápido apenas carga la página).
const msalReady = msalInstance.initialize();

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
