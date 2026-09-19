# Guarda Gastos

App web instalable en el iPhone (PWA) para controlar ingresos, egresos y
ahorros del hogar, con un **Dashboard** del año. Todos los registros se
guardan en una base de datos local del propio dispositivo (**IndexedDB**),
sin cuentas externas, sin servidor y sin conexión a internet.

## Categorías

- **Ingresos**: Salario · Renta de apartamentos (Vissani, Masseratti, Nuvo
  Park) · Negocios (Préstamos, Varios)
- **Egresos**: Servicios públicos (Agua, Energía, Gas, Internet) · Tarjeta
  de crédito (Visa, Mastercard) · Carro (Gasolina, Mantenimiento,
  Reparaciones, SOAT, Tecnomecánica) · Leasing (Barceloneta, Vissani) ·
  Comida (Restaurantes, Mercado) · Diversión · Administración apartamentos
  (Vissani, Barceloneta, Masseratti, Nuvo Park) · Compras · Médico · Violeta
  · Pago muchacha
- **Ahorros**: Fiducuenta · Aptos · Impuestos · Emergencia
- **Sobrante**: se calcula solo, como `Ingresos − Egresos − Ahorros`

## Dashboard

Con el selector de año en la parte de arriba puedes ver, para ese año:

- Tarjetas con el total de Ingresos, Egresos, Ahorros y Sobrante.
- Gráfico de barras mensual (ingreso/egreso/ahorro por mes).
- Desglose por categoría de cada tipo (con % sobre el total).

## Instalar en el iPhone

1. Publica este sitio (ver abajo) o ábrelo directamente con la URL de GitHub
   Pages en **Safari** (tiene que ser Safari, no Chrome).
2. Toca el botón de compartir (el cuadrado con la flecha hacia arriba).
3. Elige **"Agregar a Inicio"**.
4. Se crea un ícono de "Guarda Gastos" que abre la app en pantalla completa,
   sin la barra de Safari.

### Publicar con GitHub Pages

1. En el repositorio: **Settings → Pages → Build and deployment → Source:
   Deploy from a branch**, elige la rama y la carpeta raíz (`/`).
2. Espera un par de minutos y GitHub te dará una URL pública.

### Probar en tu computador antes de publicar

```bash
python3 -m http.server 8080
```

y abre `http://localhost:8080/`.

## Uso

1. Pestaña **Nuevo**: elige Tipo (Ingreso/Egreso/Ahorro), la categoría, el
   detalle (si aplica), el monto y la fecha. Al guardar queda en la base de
   datos local al instante.
2. Pestaña **Resumen**: elige el año y revisa las tarjetas y gráficos.
3. Pestaña **Historial**: lista todos los registros, con filtro por año y
   tipo, y botón para borrar cada uno.
4. Pestaña **Ajustes**: exportar/importar un respaldo en JSON, o borrar
   todos los registros.

## Respaldo de tus datos (importante)

Como los datos viven únicamente en el navegador de ese dispositivo (no hay
sincronización en la nube), usa **Ajustes → Exportar respaldo** de vez en
cuando y guarda ese archivo `.json` en otro lugar (correo, iCloud Drive,
etc.). Si cambias de teléfono, reinstalas la app o borras datos de Safari,
podrías perder la información si no tienes un respaldo. **Ajustes →
Importar respaldo** la restaura.

## Estructura del proyecto

```
index.html            Pantallas: Resumen, Nuevo, Historial, Ajustes
css/style.css          Estilos
js/categories.js        Catálogo de categorías/subcategorías
js/db.js                Base de datos local (IndexedDB)
js/charts.js            Gráficos (SVG, sin librerías externas)
js/dashboard.js         Cálculo de totales anuales/mensuales/por categoría
js/app.js               Navegación y lógica de las pantallas
manifest.webmanifest   Metadatos de la app instalable (PWA)
service-worker.js      Cacheo para abrir rápido / funcionar sin conexión
icons/                 Íconos de la app
```

> Nota: `js/auth.js`, `js/graph.js`, `js/msal-config.js` y `js/vendor/` son
> restos de una versión anterior que sincronizaba con un Excel de OneDrive.
> Ya no se usan en la app actual y se pueden borrar del repositorio.

## Privacidad

Esta app no tiene backend propio. Todo se guarda en la base de datos local
del navegador (IndexedDB) del dispositivo donde la instalaste; nada se
envía a ningún servidor.
