async function getAccessToken() {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: true }, function (token) {
      if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
      else resolve(token);
    });
  });
}

async function getSheetConfig() {
  const config = await chrome.storage.sync.get(["spreadsheetId", "sheetName"]);
  const spreadsheetId = config.spreadsheetId;
  const sheetName = config.sheetName;

  if (!spreadsheetId || !sheetName) {
    console.warn("⚠️ Falta configuración para Google Sheets");
    chrome.notifications?.create({
      type: "basic",
      iconUrl: "/icons/icon128.png",
      title: "Bookmarks-Sync - Configuración requerida",
      message:
        "Configura el Spreadsheet ID y el nombre del Sheet desde el popup para activar la sincronización.",
    });
    throw new Error(
      "❌ Spreadsheet ID y nombre del Sheet no están configurados."
    );
  }

  return { spreadsheetId, sheetName };
}

export { getAccessToken };

export async function appendBookmarkToSheet(id, title, url) {
  console.log("➡️ Intentando agregar bookmark a Sheet:", url);
  try {
    const token = await getAccessToken();

    let config;
    try {
      config = await getSheetConfig();
    } catch (e) {
      console.warn("⚠️ Sin configuración, se aborta append");
      return;
    }

    const { spreadsheetId, sheetName } = config;

    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A:D`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const data = await response.json();
    const rows = data.values?.slice(1) || [];

    const exists = rows.some((row) => row[3] === url);
    if (exists) {
      console.log("🔁 Ya existe en Sheet, no se agrega:", url);
      return;
    }

    const body = {
      values: [[id, new Date().toISOString(), title, url]],
    };

    const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A:D:append?valueInputOption=RAW`;

    const appendResponse = await fetch(appendUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!appendResponse.ok) {
      const errorText = await appendResponse.text();
      throw new Error(
        `❌ Error al agregar a Sheet: ${appendResponse.status} ${errorText}`
      );
    }

    console.log("✅ Agregado a Sheet correctamente:", url);
  } catch (error) {
    console.error("❌ Falló appendBookmarkToSheet:", error.message);
    chrome.notifications?.create({
      type: "basic",
      iconUrl: "/icons/icon128.png",
      title: "Error al guardar en Sheet",
      message: error.message,
    });
  }
}

export async function updateBookmarkInSheet(id, title, url) {
  console.log("🛠️ Intentando actualizar bookmark en Sheet:", url);
  const token = await getAccessToken();

  let config;
  try {
    config = await getSheetConfig();
  } catch (e) {
    console.warn("⚠️ Sin configuración, se aborta update");
    return;
  }

  const { spreadsheetId, sheetName } = config;

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A:D`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  const data = await response.json();
  const rows = data.values?.slice(1) || [];

  const rowIndex = rows.findIndex((row) => row[3] === url);

  if (rowIndex > -1) {
    const range = `${sheetName}!A${rowIndex + 2}:D${rowIndex + 2}`;
    const body = { values: [[id, new Date().toISOString(), title, url]] };

    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=RAW`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    console.log("✏️ Actualizado en Sheet:", url);
  } else {
    console.log("❓ No se encontró el bookmark en Sheet para actualizar:", url);
  }
}

export async function deleteBookmarkFromSheet(id) {
  console.log("🧹 Intentando eliminar bookmark del Sheet con ID:", id);
  const token = await getAccessToken();

  let config;
  try {
    config = await getSheetConfig();
  } catch (e) {
    console.warn("⚠️ Sin configuración, se aborta delete");
    return;
  }

  const { spreadsheetId, sheetName } = config;

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A:D`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  const data = await response.json();
  const rows = data.values?.slice(1) || [];

  const rowIndex = rows.findIndex((row) => row[0] === id);

  if (rowIndex > -1) {
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requests: [
            {
              deleteDimension: {
                range: {
                  sheetId: 0,
                  dimension: "ROWS",
                  startIndex: rowIndex + 1,
                  endIndex: rowIndex + 2,
                },
              },
            },
          ],
        }),
      }
    );

    console.log("🗑️ Eliminado de Sheet:", id);
  } else {
    console.log("🔍 No se encontró en Sheet para eliminar:", id);
  }
}
