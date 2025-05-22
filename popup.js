import { syncFromGoogleSheet } from "./syncFromSheet.js";
import { exportAllBookmarksToSheet } from "./exportAllBookmarks.js";

document.addEventListener("DOMContentLoaded", () => {
  const sheetIdInput = document.getElementById("sheet-id");
  const sheetNameInput = document.getElementById("sheet-name");
  const status = document.getElementById("status");
  const list = document.getElementById("bookmark-list");
  const lastSync = document.getElementById("last-sync");
  const saveBtn = document.getElementById("save-config");

  // Cargar configuración
  chrome.storage.sync.get(["spreadsheetId", "sheetName"], (data) => {
    if (data.spreadsheetId) sheetIdInput.value = data.spreadsheetId;
    if (data.sheetName) sheetNameInput.value = data.sheetName;
  });

  // Guardar configuración
  saveBtn.addEventListener("click", () => {
    const spreadsheetId = sheetIdInput.value.trim();
    const sheetName = sheetNameInput.value.trim();

    if (!spreadsheetId || !sheetName) {
      status.textContent = "❌ Ambos campos son obligatorios";
      return;
    }

    chrome.storage.sync.set({ spreadsheetId, sheetName }, () => {
      status.textContent = "✅ Configuración guardada";
    });
  });

  // Botón de sincronización
  document.getElementById("sync-btn").addEventListener("click", async () => {
    status.textContent = "⏳ Sincronizando...";
    list.innerHTML = "";

    try {
      const newBookmarks = await syncFromGoogleSheet();
      status.textContent = `✅ ${newBookmarks.length} sincronizados`;

      const now = new Date();
      await chrome.storage.local.set({ lastSyncTime: now.toISOString() });

      newBookmarks.slice(0, 5).forEach((b) => {
        const li = document.createElement("li");
        li.textContent = b.title || b.url;
        list.appendChild(li);
      });

      lastSync.textContent = `Última sync: ${now.toLocaleString()}`;
    } catch (e) {
      status.textContent = "❌ Error al sincronizar";
      console.error(e);
    }
  });

  // Mostrar último estado guardado
  chrome.storage.local.get(["lastSyncedBookmarks", "lastSyncTime"], (data) => {
    const bookmarks = data.lastSyncedBookmarks || [];
    bookmarks.slice(0, 5).forEach((b) => {
      const li = document.createElement("li");
      li.textContent = b.title || b.url;
      list.appendChild(li);
    });

    if (data.lastSyncTime) {
      const date = new Date(data.lastSyncTime);
      lastSync.textContent = `Última sync: ${date.toLocaleString()}`;
    }
  });

  // exportar
  document.getElementById("export-btn").addEventListener("click", async () => {
    const status = document.getElementById("status");
    status.textContent = "📤 Exportando todos los bookmarks...";

    try {
      const count = await exportAllBookmarksToSheet();
      status.textContent = `✅ Exportados ${count} nuevos bookmarks`;
    } catch (e) {
      status.textContent = "❌ Error al exportar";
      console.error(e);
    }
  });
});
