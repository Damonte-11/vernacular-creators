/**
 * The Google Apps Script the team pastes into a sheet (Extensions → Apps
 * Script). It sends the sheet's rows to the app every hour and writes back the
 * numbers the app returns. No Google Cloud project or key is needed.
 */
export function sheetScript(appUrl: string, token: string, projectName: string): string {
  const url = `${appUrl.replace(/\/+$/, "")}/api/sheet-hook`;
  return `/**
 * Vernacular Creators: keeps this sheet in step with the project
 * "${projectName.replace(/[\r\n*/]/g, " ")}".
 * Paste this into Extensions > Apps Script, save, then run "connect" once.
 * The code below is private to this project: don't share this script.
 */
const VC_URL = ${JSON.stringify(url)};
const VC_CODE = ${JSON.stringify(token)};

/** Adds the Vernacular menu when the sheet opens. */
function onOpen() {
  SpreadsheetApp.getUi().createMenu("Vernacular").addItem("Sync now", "syncNow").addToUi();
}

/** Run once: allows the script, sets up the hourly sync, and syncs straight away. */
function connect() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === "sync") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("sync").timeBased().everyHours(1).create();
  Logger.log(sync());
}

/** From the menu: sync now and say what happened. */
function syncNow() {
  SpreadsheetApp.getUi().alert(sync());
}

function sync() {
  var ss = SpreadsheetApp.getActive();
  var tabs = ss.getSheets().map(function (s) { return s.getName(); });
  var which = vcCall({ token: VC_CODE, tabs: tabs });
  var sheet = ss.getSheetByName(which.tab) || ss.getSheets()[0];
  var rows = sheet.getDataRange().getDisplayValues();
  var reply = vcCall({ token: VC_CODE, tabs: tabs, tab: sheet.getName(), rows: rows });
  (reply.cells || []).forEach(function (c) { sheet.getRange(c.a1).setValue(c.value); });
  return reply.message || "Synced.";
}

function vcCall(body) {
  var res = UrlFetchApp.fetch(VC_URL, { method: "post", contentType: "application/json", payload: JSON.stringify(body), muteHttpExceptions: true });
  var data = {};
  try { data = JSON.parse(res.getContentText() || "{}"); } catch (e) {}
  if (res.getResponseCode() >= 300) throw new Error(data.error || ("The app answered " + res.getResponseCode()));
  return data;
}
`;
}
