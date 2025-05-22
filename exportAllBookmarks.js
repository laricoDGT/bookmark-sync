import { appendBookmarkToSheet, getAccessToken } from "./sheetsAPI.js";

export async function exportAllBookmarksToSheet() {
  const token = await getAccessToken();

  let config;
  try {
    config = await chrome.storage.sync.get(["spreadsheetId", "sheetName"]);
  } catch (e) {
    console.warn("⚠️ Configuration not available");
    return 0;
  }

  const spreadsheetId = config.spreadsheetId;
  const sheetName = config.sheetName;

  if (!spreadsheetId || !sheetName) {
    chrome.notifications?.create({
      type: "basic",
      iconUrl: "/icons/icon128.png",
      title: "Bookmark-Sync - Configuration required",
      message: "You must set Spreadsheet ID and Sheet before exporting.",
    });
    return 0;
  }

  // Get current URLs in the sheet
  const sheetResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A:D`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  const sheetData = await sheetResponse.json();
  const existingRows = sheetData.values?.slice(1) || [];
  const existingUrls = new Set(existingRows.map((row) => row[3]));

  // Get all Chrome bookmarks
  const allBookmarks = [];
  function traverse(bookmarks) {
    for (const node of bookmarks) {
      if (node.url) {
        allBookmarks.push({ id: node.id, title: node.title, url: node.url });
      }
      if (node.children) traverse(node.children);
    }
  }

  const tree = await chrome.bookmarks.getTree();
  traverse(tree);

  let addedCount = 0;

  for (const bookmark of allBookmarks) {
    if (!existingUrls.has(bookmark.url)) {
      await appendBookmarkToSheet(bookmark.id, bookmark.title, bookmark.url);
      addedCount++;
    }
  }

  return addedCount;
}
