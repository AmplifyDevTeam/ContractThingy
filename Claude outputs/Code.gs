/**
 * Steady Claims Billing — website form → Google Sheets
 *
 * Receives submissions from the two forms on /contact and writes each one as a row:
 *   • "Quick Questions"        ← the "Quick question" tab
 *   • "Consultation Requests"  ← the "Full billing consultation" tab
 *
 * Setup (once):
 *   1. Paste this file into the Apps Script project and save.
 *   2. Run `setup` from the toolbar and approve the permissions. It creates and formats both tabs.
 *   3. Deploy → New deployment → Web app. Execute as: Me. Who has access: Anyone.
 *   4. Copy the Web app URL (ends in /exec) into the website (lib/site.ts → formEndpoint).
 *
 * After changing this code later: Deploy → Manage deployments → edit (pencil) → Version: New version → Deploy.
 * That keeps the same /exec URL, so the website does not need to change.
 */

const SHEET_ID = '1PvDrEbvt8VGrKWUhlR-sC_0jKRvQo9eT-SA3fuRofbE';

// Optional: an email address to notify on every new submission. Leave blank to turn notifications off.
const NOTIFY_EMAIL = '';

const STATUS_OPTIONS = ['New', 'Contacted', 'In progress', 'Client', 'Not a fit', 'Spam'];

/** Each tab: [column heading, key in the submitted data, column width]. */
const TABS = {
  quick: {
    name: 'Quick Questions',
    columns: [
      ['Submitted At', '_submittedAt', 160],
      ['Status', '_status', 110],
      ['First Name', 'firstName', 130],
      ['Last Name', 'lastName', 130],
      ['Practice Name', 'practiceName', 200],
      ['Email', 'email', 220],
      ['Phone', 'phone', 140],
      ['Specialty', 'specialty', 160],
      ['No. of Providers', 'providers', 120],
      ['Services Interested In', 'services', 260],
      ['Message', 'message', 360],
      ['Page', 'page', 200],
    ],
  },
  full: {
    name: 'Consultation Requests',
    columns: [
      ['Submitted At', '_submittedAt', 160],
      ['Status', '_status', 110],
      ['Contact Name', 'contactName', 170],
      ['Business Email', 'email', 220],
      ['Phone', 'phone', 140],
      ['Practice Name', 'practiceName', 200],
      ['Practice Website', 'website', 200],
      ['Specialty', 'specialty', 160],
      ['Practice Location', 'location', 170],
      ['No. of Providers', 'providers', 120],
      ['Monthly Claim Volume', 'claimVolume', 150],
      ['EHR / PM System', 'ehr', 160],
      ['Current Billing Method', 'billingMethod', 180],
      ['Main Billing Challenge', 'mainChallenge', 220],
      ['Preferred Contact', 'preferredContact', 140],
      ['Services Interested In', 'services', 260],
      ['Additional Information', 'message', 360],
      ['Page', 'page', 200],
    ],
  },
};

const NAVY = '#0B1F3A';
const TEAL = '#37D3C1';
const TINT = '#F2F6FA';

/** Run once from the editor: creates both tabs with headings, widths, a Status dropdown and banding. */
function setup() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  Object.keys(TABS).forEach(function (key) {
    prepareSheet_(ss, TABS[key]);
  });
  // Remove the empty default "Sheet1" if it is still there.
  const blank = ss.getSheetByName('Sheet1');
  if (blank && ss.getSheets().length > 1 && blank.getLastRow() === 0) ss.deleteSheet(blank);
  ss.setActiveSheet(ss.getSheetByName(TABS.full.name));
}

function prepareSheet_(ss, tab) {
  let sh = ss.getSheetByName(tab.name);
  if (!sh) sh = ss.insertSheet(tab.name);
  const n = tab.columns.length;

  if (sh.getMaxColumns() < n) sh.insertColumnsAfter(sh.getMaxColumns(), n - sh.getMaxColumns());

  const header = sh.getRange(1, 1, 1, n);
  header
    .setValues([tab.columns.map(function (c) { return c[0]; })])
    .setBackground(NAVY)
    .setFontColor('#FFFFFF')
    .setFontWeight('bold')
    .setFontFamily('Arial')
    .setVerticalAlignment('middle')
    .setWrap(true);
  sh.setRowHeight(1, 40);
  sh.setFrozenRows(1);
  sh.setFrozenColumns(2);
  tab.columns.forEach(function (c, i) { sh.setColumnWidth(i + 1, c[2]); });

  // Data area: top-aligned, wrapped text, dates readable, Status as a dropdown.
  const rows = sh.getMaxRows() - 1;
  sh.getRange(2, 1, rows, n).setVerticalAlignment('top').setWrap(true).setFontFamily('Arial');
  sh.getRange(2, 1, rows, 1).setNumberFormat('mmm d, yyyy h:mm am/pm');
  sh.getRange(2, 2, rows, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(STATUS_OPTIONS, true).setAllowInvalid(false).build()
  );

  // Alternating row colours (only add once).
  if (sh.getBandings().length === 0) {
    sh.getRange(1, 1, sh.getMaxRows(), n)
      .applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY, true, false)
      .setHeaderRowColor(NAVY)
      .setFirstRowColor('#FFFFFF')
      .setSecondRowColor(TINT);
  }

  // Colour the Status cells.
  const statusRange = sh.getRange(2, 2, rows, 1);
  const colours = { New: TEAL, Contacted: '#CFE3FA', 'In progress': '#FFE7A8', Client: '#BDEFC9', 'Not a fit': '#E4E8EE', Spam: '#FFD3C6' };
  const rules = sh.getConditionalFormatRules().filter(function (r) {
    return r.getRanges().every(function (rg) { return rg.getColumn() !== 2; });
  });
  Object.keys(colours).forEach(function (label) {
    rules.push(
      SpreadsheetApp.newConditionalFormatRule()
        .whenTextEqualTo(label)
        .setBackground(colours[label])
        .setFontColor(NAVY)
        .setRanges([statusRange])
        .build()
    );
  });
  sh.setConditionalFormatRules(rules);
  return sh;
}

/** The website posts JSON here. */
function doPost(e) {
  try {
    const data = JSON.parse((e && e.postData && e.postData.contents) || '{}');

    // Hidden "honeypot" field: real visitors never fill it, bots usually do.
    if (data.company) return json_({ ok: true });

    const tab = data.formType === 'quick' ? TABS.quick : TABS.full;
    if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(data.email))) {
      return json_({ ok: false, error: 'A valid email is required.' });
    }

    data._submittedAt = new Date();
    data._status = 'New';

    const row = tab.columns.map(function (c) { return clean_(data[c[1]]); });

    const lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      const ss = SpreadsheetApp.openById(SHEET_ID);
      const sh = ss.getSheetByName(tab.name) || prepareSheet_(ss, tab);
      sh.appendRow(row);
    } finally {
      lock.releaseLock();
    }

    if (NOTIFY_EMAIL) notify_(tab, row);
    return json_({ ok: true });
  } catch (err) {
    console.error(err);
    return json_({ ok: false, error: 'Server error' });
  }
}

/** Lets you open the /exec URL in a browser to check the deployment is live. */
function doGet() {
  return json_({ ok: true, service: 'Steady Claims Billing forms' });
}

function clean_(v) {
  if (v instanceof Date) return v;
  if (v === null || v === undefined) return '';
  if (Array.isArray(v)) v = v.join(', ');
  v = String(v).trim().slice(0, 5000);
  // Stop anything that looks like a spreadsheet formula from running.
  if (/^[=+\-@]/.test(v)) v = "'" + v;
  return v;
}

function notify_(tab, row) {
  const lines = tab.columns
    .map(function (c, i) { return row[i] ? c[0] + ': ' + row[i] : ''; })
    .filter(String);
  MailApp.sendEmail({
    to: NOTIFY_EMAIL,
    subject: 'New website ' + (tab === TABS.quick ? 'question' : 'consultation request') + ' — Steady Claims Billing',
    body: lines.join('\n') + '\n\nSheet: https://docs.google.com/spreadsheets/d/' + SHEET_ID,
  });
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
