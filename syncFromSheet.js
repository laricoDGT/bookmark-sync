import { getAccessToken } from "./sheetsAPI.js";

export async function syncFromGoogleSheet() {
  const config = await chrome.storage.sync.get(["spreadsheetId", "sheetName"]);
  const spreadsheetId = config.spreadsheetId;
  const sheetName = config.sheetName;

  if (!spreadsheetId || !sheetName) {
    console.warn("⚠️ Missing configuration to sync from Sheet");
    chrome.notifications?.create({
      type: "basic",
      iconUrl: "icons/icon128.png",
      title: "Sync stopped",
      message: "Set your Spreadsheet ID and Sheet Name before syncing.",
    });
    return [];
  }

  try {
    console.log("🔄 Starting sync from Google Sheets...");

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

    // Create new
    for (const bookmark of remoteBookmarks) {
      const existing = await chrome.bookmarks.search({ url: bookmark.url });

      if (existing.length === 0) {
        await chrome.bookmarks.create({
          title: bookmark.title,
          url: bookmark.url,
        });

        newSynced.push(bookmark);
        console.log("✅ Created from Sheet → Chrome:", bookmark.url);
      } else {
        const current = existing[0];
        if (current.title !== bookmark.title) {
          await chrome.bookmarks.update(current.id, { title: bookmark.title });
          console.log("✏️ Title updated in Chrome:", bookmark.url);
        }
      }
    }

    // Debug comparison
    console.log("🧩 Comparing for removal from Chrome:");
    console.log("→ Sheet contains:", remoteBookmarks.length, "URLs");
    console.log("→ Local (stored) contains:", localBookmarks.length, "URLs");

    for (const local of localBookmarks) {
      if (!remoteUrls.has(local.url)) {
        console.log(
          "⛔ Bookmark no longer in Sheet, removing from Chrome:",
          local.url
        );

        const existing = await chrome.bookmarks.search({ url: local.url });
        if (existing.length > 0) {
          await chrome.bookmarks.remove(existing[0].id);
          console.log("🗑️ Removed from Chrome:", local.url);
        } else {
          console.warn("⚠️ Not found for removal:", local.url);
        }
      }
    }

    await chrome.storage.local.set({
      sheetBookmarks: remoteBookmarks,
      lastSyncedBookmarks: newSynced,
    });

    console.log("✅ Sync completed.");
    return newSynced;
  } catch (e) {
    console.error("❌ Error in syncFromGoogleSheet:", e);
    chrome.notifications?.create({
      type: "basic",
      iconUrl: "icons/icon128.png",
      title: "Error during sync",
      message: "There was a problem accessing the spreadsheet or the network.",
    });
    return [];
  }
}
