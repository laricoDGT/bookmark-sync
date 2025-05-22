import { getAccessToken } from "./sheetsAPI.js";

export async function syncFromGoogleSheet() {
  const config = await chrome.storage.sync.get(["spreadsheetId", "sheetName"]);
  const spreadsheetId = config.spreadsheetId;
  const sheetName = config.sheetName;

  if (!spreadsheetId || !sheetName) {
    console.warn("⚠️ Falta configuración para sincronizar desde Sheet");
    chrome.notifications?.create({
      type: "basic",
      iconUrl: "icons/icon128.png",
      title: "Sincronización detenida",
      message: "Configura tu Spreadsheet ID y Sheet Name antes de sincronizar.",
    });
    return [];
  }

  try {
    console.log("🔄 Iniciando sincronización desde Google Sheets...");

    const token = await getAccessToken();

    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A:D`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const data = await res.json();
    const rows = data.values?.slice(1) || [];

    const remoteBookmarks = rows
      .filter((row) => row.length >= 4 && row[3])
      .map((row) => ({
        title: row[2],
        url: row[3],
      }));

    const newSynced = [];

    const stored = await chrome.storage.local.get("sheetBookmarks");
    const localBookmarks = stored.sheetBookmarks || [];

    const remoteUrls = new Set(remoteBookmarks.map((b) => b.url));

    // Crear nuevos
    for (const bookmark of remoteBookmarks) {
      const existing = await chrome.bookmarks.search({ url: bookmark.url });

      if (existing.length === 0) {
        await chrome.bookmarks.create({
          title: bookmark.title,
          url: bookmark.url,
        });

        newSynced.push(bookmark);
        console.log("✅ Creado desde Sheet → Chrome:", bookmark.url);
      } else {
        const current = existing[0];
        if (current.title !== bookmark.title) {
          await chrome.bookmarks.update(current.id, { title: bookmark.title });
          console.log("✏️ Título actualizado en Chrome:", bookmark.url);
        }
      }
    }

    // Depuración de comparación
    console.log("🧩 Comparando para eliminar desde Chrome:");
    console.log("→ Sheet contiene:", remoteBookmarks.length, "URLs");
    console.log(
      "→ Local (almacenado) contiene:",
      localBookmarks.length,
      "URLs"
    );

    for (const local of localBookmarks) {
      if (!remoteUrls.has(local.url)) {
        console.log(
          "⛔ Bookmark ya no está en Sheet, eliminar en Chrome:",
          local.url
        );

        const existing = await chrome.bookmarks.search({ url: local.url });
        if (existing.length > 0) {
          await chrome.bookmarks.remove(existing[0].id);
          console.log("🗑️ Eliminado desde Chrome:", local.url);
        } else {
          console.warn("⚠️ No se encontró para eliminar:", local.url);
        }
      }
    }

    await chrome.storage.local.set({
      sheetBookmarks: remoteBookmarks,
      lastSyncedBookmarks: newSynced,
    });

    console.log("✅ Sincronización completada.");
    return newSynced;
  } catch (e) {
    console.error("❌ Error en syncFromGoogleSheet:", e);
    chrome.notifications?.create({
      type: "basic",
      iconUrl: "icons/icon128.png",
      title: "Error durante la sincronización",
      message: "Hubo un problema accediendo a la hoja de cálculo o la red.",
    });
    return [];
  }
}
