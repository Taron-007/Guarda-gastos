// Manejo de sesión con MSAL (Microsoft Authentication Library).

const msalInstance = new msal.PublicClientApplication(msalConfig);
let activeAccount = null;

async function initAuth() {
  await msalInstance.initialize();
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
  const result = await msalInstance.loginPopup({ scopes: graphScopes });
  activeAccount = result.account;
  return activeAccount;
}

function signOut() {
  const account = activeAccount || msalInstance.getAllAccounts()[0];
  return msalInstance.logoutPopup({ account });
}

async function getAccessToken() {
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
