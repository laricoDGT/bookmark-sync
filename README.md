# Bookmark Sync to Google Sheets (Chrome Extension)

Sincroniza automáticamente tus marcadores (bookmarks) de Chrome con una hoja de cálculo de Google Sheets. Ideal para tener un backup, compartir favoritos o gestionar enlaces desde la nube.

## 🚀 Funciones principales

- ✅ Sincronización automática de Chrome → Google Sheets (cuando guardas o eliminas un favorito)
- ✅ Sincronización manual de Google Sheets → Chrome (botón en el popup)
- ✅ Exportación completa de todos los bookmarks actuales a Sheets (opcional)
- ✅ Prevención de duplicados usando URL como clave
- ✅ Configuración desde el popup (ID de hoja y nombre del sheet)
- ✅ Notificaciones si falta configuración
- ✅ Interfaz visual con estado de sincronización

## 📦 Instalación

1. Clona este repositorio o descarga como ZIP.
2. Ve a `chrome://extensions/`
3. Activa el modo desarrollador.
4. Haz clic en "Cargar descomprimida" y selecciona la carpeta del proyecto.

## 🛠 Configuración inicial

1. Haz clic en el ícono de la extensión para abrir el popup.
2. Ingresa tu **Spreadsheet ID** y **nombre del sheet**.
3. Guarda los cambios.
4. La extensión ya está lista para sincronizar.

## 📌 Estructura del Sheet recomendada

Tu hoja debe tener los siguientes encabezados:
A: ID | B: Fecha | C: Título | D: URL

El nombre de la hoja debe coincidir con el que pongas en la configuración (ej: `Bookmarks`).

## 📥 Funciones del popup

- **Sincronizar desde Sheets**: Trae cambios de la hoja a Chrome.
- **Exportar bookmarks actuales**: Carga todos tus favoritos actuales a Sheets.
- Muestra los últimos sincronizados y la hora del último sync.

## 🛡 Permisos requeridos

- `bookmarks`: para acceder a tus favoritos
- `identity`: para autenticar con tu cuenta de Google
- `storage`: para guardar configuración
- `notifications`: para mostrar alertas si falta configuración

## 📄 Licencia

MIT. Usa, mejora y comparte sin restricciones.

Nota: agregar su client id: YOUR_CLIENT_ID en manifest.json.
ejemplo: 00000000-sadknasjdajdnbajn.apps.googleusercontent.com
