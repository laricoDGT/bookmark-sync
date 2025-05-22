import {
  appendBookmarkToSheet,
  updateBookmarkInSheet,
  deleteBookmarkFromSheet,
} from "./sheetsAPI.js";

chrome.bookmarks.onCreated.addListener(async function (id, bookmark) {
  console.log("📌 Bookmark created:", bookmark);
  if (bookmark.url) {
    await appendBookmarkToSheet(bookmark.id, bookmark.title, bookmark.url);
  }
});

chrome.bookmarks.onChanged.addListener(async function (id, changeInfo) {
  const bookmark = await chrome.bookmarks.get(id);
  if (bookmark[0] && bookmark[0].url) {
    await updateBookmarkInSheet(
      id,
      changeInfo.title || bookmark[0].title,
      changeInfo.url || bookmark[0].url
    );
  }
});

chrome.bookmarks.onRemoved.addListener(async function (id, removeInfo) {
  await deleteBookmarkFromSheet(id);
});

chrome.runtime.onStartup.addListener(() => {
  console.log("🔄 Background reloaded (onStartup)");
});

chrome.runtime.onInstalled.addListener(() => {
  console.log("📦 Extension installed (onInstalled)");
});
