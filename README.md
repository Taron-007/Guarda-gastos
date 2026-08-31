# Guarda Gastos

App web (funciona como app instalable en el iPhone) para registrar ingresos y
gastos y guardarlos **directamente** en un archivo Excel que ya tienes
guardado en tu OneDrive — sin abrir Excel, sin copiar y pegar.

Cada vez que llenas el formulario y presionas "Guardar en Excel", la app
agrega una nueva fila a una tabla de tu archivo con estas columnas:

- **Fecha**
- **Ingreso (COP $)**
- **Tipo de ingreso**
- **Gasto (COP $)**
- **Categoría de gasto**
- **Ahorro (COP $)**

La app también crea una hoja aparte llamada **"Resumen"** con tres fórmulas
que se actualizan solas: el total de ingresos, el total de gastos y el total
ahorrado, sumando toda la tabla.

## Cómo funciona

Es un sitio web estático (HTML/CSS/JS, sin servidor propio) que usa el
[Microsoft Graph API](https://learn.microsoft.com/graph/api/resources/excel)
para leer y escribir tu archivo de Excel en OneDrive, con tu propio inicio de
sesión de Microsoft. Tus datos nunca pasan por un servidor intermedio: van
directo de tu iPhone a Microsoft.

Como es un sitio web, lo agregas a la pantalla de inicio del iPhone desde
Safari ("Agregar a inicio") y se comporta como una app: ícono propio, pantalla
completa, funciona sin conexión para lo básico.

## Requisitos previos

1. Una cuenta de Microsoft (outlook.com, hotmail.com o una cuenta de
   trabajo/escuela) con OneDrive.
2. Un archivo `.xlsx` guardado en tu OneDrive (puede estar vacío o ya tener
   datos, no importa el nombre).
3. Un lugar donde publicar estos archivos como sitio web. La opción más
   sencilla y gratuita es **GitHub Pages** (se explica abajo).

## 1. Registrar la app en Microsoft (una sola vez)

Esto es necesario para que Microsoft te deje autorizar a esta app a leer y
escribir tus archivos. Es gratis y toma unos minutos.

1. Entra a <https://entra.microsoft.com> con tu cuenta de Microsoft.
2. Ve a **Identity → Applications → App registrations → New registration**.
3. Nombre: `Guarda Gastos` (o el que quieras).
4. En "Supported account types" elige:
   - **"Personal Microsoft accounts only"** si usas una cuenta personal
     (outlook.com/hotmail.com), o
   - **"Accounts in any organizational directory and personal Microsoft
     accounts"** si no estás seguro.
5. En "Redirect URI" elige tipo **Single-page application (SPA)** y pon la
   URL donde vas a publicar la app, por ejemplo:
   `https://TU-USUARIO.github.io/guarda-gastos/`
   (puedes agregar más de una URI después, por ejemplo también
   `http://localhost:8080/` para probar en tu computador).
6. Crea el registro y copia el **Application (client) ID** que aparece en la
   página de resumen.
7. No necesitas crear ningún "client secret": esta app es pública (corre en
   el navegador) y no lo usa.

## 2. Configurar la app

Abre `js/msal-config.js` y reemplaza:

```js
clientId: "REEMPLAZA_CON_TU_CLIENT_ID",
```

con el Application (client) ID que copiaste. Si elegiste "solo cuentas
personales" en el paso anterior, deja `authority` como está
(`.../consumers`). Si elegiste la opción de cualquier cuenta, cambia esa
línea a:

```js
authority: "https://login.microsoftonline.com/common",
```

## 3. Publicar el sitio (GitHub Pages)

1. Sube este repositorio a GitHub (o usa el que ya tienes).
2. En el repositorio: **Settings → Pages → Build and deployment → Source:
   Deploy from a branch**, elige la rama y la carpeta raíz (`/`).
3. Espera un par de minutos y GitHub te dará una URL como
   `https://TU-USUARIO.github.io/guarda-gastos/`.
4. Verifica que esa URL sea **exactamente** igual a la que pusiste como
   "Redirect URI" en el paso 1 (incluyendo la barra `/` al final).

También puedes usar cualquier otro hosting estático (Netlify, Vercel,
Cloudflare Pages, un servidor propio con HTTPS, etc.) — solo asegúrate de
que la URL final coincida con la Redirect URI registrada.

### Probar en tu computador antes de publicar

```bash
python3 -m http.server 8080
```

y abre `http://localhost:8080/` (agrega esa URL también como Redirect URI en
Entra ID si quieres probar así).

## 4. Agregar la app al iPhone

1. Abre la URL publicada en **Safari** (tiene que ser Safari, no Chrome, para
   que "Agregar a inicio" funcione bien en iOS).
2. Toca el botón de compartir (el cuadrado con la flecha hacia arriba).
3. Elige **"Agregar a Inicio"**.
4. Ahora tienes un ícono de "Guarda Gastos" en tu pantalla de inicio que abre
   la app en pantalla completa.

## 5. Primer uso

1. Abre la app y toca **"Iniciar sesión con Microsoft"**. Acepta los
   permisos (solo pide acceso a tus propios archivos: `Files.ReadWrite`).
2. Busca el nombre de tu archivo de Excel guardado en OneDrive y selecciónalo
   de los resultados.
3. Elige la hoja donde quieres guardar los datos y el nombre de la tabla
   (por defecto `Gastos`). Si la tabla no existe, la app la crea
   automáticamente con las columnas correctas en la celda A1 de esa hoja, y
   también crea la hoja "Resumen" con los tres totales (KPI).
4. Listo — ya puedes llenar el formulario (Fecha, Ingreso, Tipo de ingreso,
   Gasto, Categoría de gasto, Ahorro) y cada envío agrega una fila nueva a tu
   Excel; la hoja "Resumen" se actualiza sola.

Puedes cambiar de archivo/tabla en cualquier momento con el botón "cambiar"
junto al nombre del archivo.

## Funcionamiento sin conexión

Si guardas un registro sin internet (o el envío falla), la app lo guarda
localmente en tu iPhone y lo reintenta automáticamente cuando vuelve la
conexión (o al tocar "Reintentar ahora").

## Estructura del proyecto

```
index.html          Pantallas de la app (login, configuración, formulario)
css/style.css        Estilos
js/msal-config.js     Configuración de tu registro de Microsoft (clientId)
js/auth.js            Inicio de sesión (MSAL)
js/graph.js            Llamadas a Microsoft Graph (buscar archivo, tablas, filas)
js/app.js              Lógica de interfaz
manifest.webmanifest  Metadatos de la app instalable (PWA)
service-worker.js     Cacheo básico para abrir rápido / instalar en iPhone
icons/                Íconos de la app
```

## Privacidad

Esta app no tiene backend ni base de datos propia. Los datos que ingresas se
envían directamente desde tu navegador a Microsoft Graph con tu propia
sesión; solo se guardan copias locales temporales en tu iPhone (últimos
registros mostrados en pantalla y registros pendientes por falta de
conexión), en el almacenamiento local del navegador.

## Solución de problemas

- **"AADSTS50011: redirect URI mismatch"**: la URL donde abriste la app no
  coincide exactamente con la Redirect URI registrada en Entra ID (revisa
  mayúsculas, `www`, y la barra `/` final).
- **No aparece mi archivo al buscarlo**: la búsqueda usa el nombre del
  archivo tal como está guardado en OneDrive; prueba con parte del nombre.
- **Error de permisos al crear la tabla**: confirma que aceptaste el permiso
  `Files.ReadWrite` al iniciar sesión.
