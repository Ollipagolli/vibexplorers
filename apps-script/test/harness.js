// Kevyt Apps Script -mock, jolla Code.gs:n logiikka testataan Nodessa.
const fs = require('fs');
const vm = require('vm');
const crypto = require('crypto');

function tzParts(date, tz) {
  const f = new Intl.DateTimeFormat('en-GB', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const o = {};
  f.formatToParts(date).forEach(p => { o[p.type] = p.value; });
  if (o.hour === '24') o.hour = '00';
  return o;
}
function formatDate(d, tz, pat) {
  const p = tzParts(d, tz);
  return pat.replace(/yyyy|MM|dd|HH|mm|ss|d|M/g, t => ({
    yyyy: p.year, MM: p.month, dd: p.day, HH: p.hour, mm: p.minute, ss: p.second,
    d: String(Number(p.day)), M: String(Number(p.month)) }[t]));
}
function parseDate(str, tz, pat) {
  const keys = pat.match(/yyyy|MM|dd|HH|mm|ss/g);
  const re = new RegExp('^' + pat.replace(/yyyy/, '(\\d{4})').replace(/MM|dd|HH|mm|ss/g, '(\\d{2})') + '$');
  const m = String(str).match(re);
  if (!m) throw new Error('parseDate failed: ' + str + ' / ' + pat);
  const v = { yyyy: 0, MM: 1, dd: 1, HH: 0, mm: 0, ss: 0 };
  keys.forEach((k, i) => { v[k] = Number(m[i + 1]); });
  let guess = Date.UTC(v.yyyy, v.MM - 1, v.dd, v.HH, v.mm, v.ss);
  for (let i = 0; i < 2; i++) {
    const p = tzParts(new Date(guess), tz);
    const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
    guess -= (asUtc - Date.UTC(v.yyyy, v.MM - 1, v.dd, v.HH, v.mm, v.ss));
  }
  return new Date(guess);
}

class Sheet {
  constructor(name) { this.name = name; this.data = []; this.maxRows = 1000; }
  getName() { return this.name; }
  getLastRow() { for (let i = this.data.length; i > 0; i--) if ((this.data[i - 1] || []).some(v => v !== '' && v != null)) return i; return 0; }
  getMaxRows() { return this.maxRows; }
  getRange(r, c, nr = 1, nc = 1) { return new Range(this, r, c, nr, nc); }
  getDataRange() { const lr = this.getLastRow(); const lc = Math.max(1, ...this.data.map(r => (r || []).length)); return new Range(this, 1, 1, Math.max(lr, 1), lc); }
  appendRow(vals) { this.getRange(this.getLastRow() + 1, 1, 1, vals.length).setValues([vals]); }
  setFrozenRows() {}
  get(r, c) { return ((this.data[r - 1] || [])[c - 1]); }
  set(r, c, v) { while (this.data.length < r) this.data.push([]); const row = this.data[r - 1]; while (row.length < c) row.push(''); row[c - 1] = store(v); }
}
// Sheets: tekstimuotoisessa solussa alkuheittomerkki näkyy tallennettuna sellaisenaan (pessimistinen oletus)
function store(v) { return v === undefined || v === null ? '' : v; }
class Range {
  constructor(sh, r, c, nr, nc) { Object.assign(this, { sh, r, c, nr, nc }); }
  getValues() { const out = []; for (let i = 0; i < this.nr; i++) { const row = []; for (let j = 0; j < this.nc; j++) { const v = this.sh.get(this.r + i, this.c + j); row.push(v === undefined ? '' : v); } out.push(row); } return out; }
  setValues(vals) { if (vals.length !== this.nr || vals[0].length !== this.nc) throw new Error(`setValues dims ${vals.length}x${vals[0].length} vs ${this.nr}x${this.nc}`); vals.forEach((row, i) => row.forEach((v, j) => this.sh.set(this.r + i, this.c + j, v))); return this; }
  setValue(v) { this.sh.set(this.r, this.c, v); return this; }
  getColumn() { return this.c; } getLastColumn() { return this.c + this.nc - 1; } getSheet() { return this.sh; }
  setFontWeight() { return this; } setNumberFormat() { return this; } setDataValidation() { return this; }
}

function makeEnv() {
  const sheets = {};
  const order = [];
  const ss = {
    getSheetByName: n => sheets[n] || null,
    insertSheet: (n) => { sheets[n] = new Sheet(n); order.push(n); return sheets[n]; },
    setSpreadsheetTimeZone() {}, getId: () => 'ss1', getActiveSheet: () => sheets[env.activeSheet]
  };
  const cache = new Map();
  const mails = [];
  const env = {
    sheets, mails, now: new Date('2026-10-20T10:00:00Z'), quota: 100, activeSheet: null, mailFail: false,
    triggers: []
  };
  const ctx = {
    console,
    SpreadsheetApp: {
      getActiveSpreadsheet: () => ss, flush() {},
      newDataValidation: () => { const b = { requireValueInList: () => b, setAllowInvalid: () => b, build: () => ({}) }; return b; },
      getUi: () => ({ alert: m => { env.lastAlert = m; return 'YES'; }, ButtonSet: {}, Button: { YES: 'YES' }, createMenu: () => ({ addItem() { return this; }, addSeparator() { return this; }, addToUi() {} }) })
    },
    LockService: { getScriptLock: () => ({ tryLock: () => true, waitLock() {}, releaseLock() {} }), getDocumentLock: () => ({ tryLock: () => true, releaseLock() {} }) },
    CacheService: { getScriptCache: () => ({ get: k => cache.has(k) ? cache.get(k) : null, put: (k, v) => cache.set(k, v) }) },
    Utilities: { getUuid: () => crypto.randomUUID(), formatDate, parseDate },
    MailApp: {
      getRemainingDailyQuota: () => env.quota,
      sendEmail: (a, b, c) => { if (env.mailFail) throw new Error('mail down'); env.quota--; mails.push(typeof a === 'object' ? a : { to: a, subject: b, body: c }); }
    },
    ContentService: { createTextOutput: s => ({ s, setMimeType() { return JSON.parse(this.s); } }), MimeType: { JSON: 'json' } },
    ScriptApp: { getProjectTriggers: () => [], deleteTrigger() {}, newTrigger: h => { const b = { timeBased: () => b, everyHours: () => b, everyMinutes: () => b, atHour: () => b, everyDays: () => b, forSpreadsheet: () => b, onEdit: () => b, create: () => env.triggers.push(h) }; return b; } },
    DriveApp: {}
  };
  vm.createContext(ctx);
  const code = fs.readFileSync(__dirname + '/../Code.gs', 'utf8');
  vm.runInContext(code + '\nthis.__exports = { doGet, doPost, setup, recountAll, offerNext_, expireOffers, processMailQueue, readCity_, dueDate_, CFG, COLS, STATUS, SETTINGS_COLS };', ctx);
  vm.runInContext('now_ = function(){ return new Date(__env.now.getTime()); };', Object.assign(ctx, { __env: env }));
  env.api = ctx.__exports;
  return env;
}

module.exports = { makeEnv, formatDate, parseDate };
