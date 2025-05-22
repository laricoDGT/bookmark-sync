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
    console.warn("⚠️ Missing configuration for Google Sheets");
    chrome.notifications?.create({
      type: "basic",
      iconUrl: "/icons/icon128.png",
      title: "Bookmarks-Sync - Configuration required",
      message:
        "Set the Spreadsheet ID and Sheet name from the popup to enable sync.",
    });
    throw new Error("❌ Spreadsheet ID and Sheet name are not configured.");
  }

  return { spreadsheetId, sheetName };
}

export { getAccessToken };

export async function appendBookmarkToSheet(id, title, url) {
  console.log("➡️ Trying to add bookmark to Sheet:", url);
  try {
    const token = await getAccessToken();

    let config;
    try {
      config = await getSheetConfig();
    } catch (e) {
      console.warn("⚠️ No configuration, aborting append");
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
    console.log("📄 Current Sheet rows:", data.values?.length || 0);

    const rows = data.values?.slice(1) || [];
    const exists = rows.some((row) => row[3] === url);

    if (exists) {
      console.log("🔁 Already exists in Sheet, not adding:", url);
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
        `❌ Error adding to Sheet: ${appendResponse.status} ${errorText}`
      );
    }

    console.log("✅ Successfully added to Sheet:", url);
  } catch (error) {
    console.error("❌ appendBookmarkToSheet failed:", error.message);
    chrome.notifications?.create({
      type: "basic",
      iconUrl: "/icons/icon128.png",
      title: "Error saving to Sheet",
      message: error.message,
    });
  }
}

export async function updateBookmarkInSheet(id, title, url) {
  console.log("🛠️ Trying to update bookmark in Sheet:", url);
  const token = await getAccessToken();

  let config;
  try {
    config = await getSheetConfig();
  } catch (e) {
    console.warn("⚠️ No configuration, aborting update");
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

    console.log("✏️ Updated in Sheet:", url);
  } else {
    console.log("❓ Bookmark not found in Sheet for update:", url);
  }
}

export async function deleteBookmarkFromSheet(id) {
  console.log("🧹 Trying to delete bookmark from Sheet with ID:", id);
  const token = await getAccessToken();

  let config;
  try {
    config = await getSheetConfig();
  } catch (e) {
    console.warn("⚠️ No configuration, aborting delete");
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

    console.log("🗑️ Deleted from Sheet:", id);
  } else {
    console.log("🔍 Not found in Sheet for deletion:", id);
  }
}
