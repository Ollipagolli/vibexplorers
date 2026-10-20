/**
 * VibeXplorers – ilmoittautumisen taustapalvelu (Google Apps Script)
 *
 * Skripti on sidottu ilmoittautumistaulukkoon (Laajennukset → Apps Script).
 * Julkaisu: Ota käyttöön → Verkkosovellus, Suorita käyttäjänä: Minä (vibexhq),
 * Käyttöoikeus: Kuka tahansa.
 *
 * Rajapinta (kaikki vastaukset JSON):
 *   GET  ?action=status&city=espoo          → paikkatilanne
 *   POST {action:"register", ...}           → ilmoittautuminen (text/plain, ei CORS-esitarkistusta)
 *   POST {action:"confirm", token}          → jonosta tarjotun paikan vahvistus
 */

// ---------------------------------------------------------------- asetukset

const CFG = {
  TZ: 'Europe/Helsinki',
  SENDER_NAME: 'VibeXplorers',
  REPLY_TO: 'vibexhq@gmail.com',
  ADMIN_EMAIL: 'vibexhq@gmail.com',
  SITE: 'https://vibexplorers.com',
  TERMS_URL: 'https://vibexplorers.com/vibexplorers-osallistumisehdot.pdf',
  PRIVACY_URL: 'https://vibexplorers.com/vibexplorers-tietosuojaseloste.pdf',
  HOST_URL: 'https://vibexplorers.com/host',
  OFFER_HOURS: 48,
  CANCEL_DAYS_BEFORE: 7,     // maksuton peruutus ja eräpäivä: 7 pv ennen 1. kertaa
  LATE_DUE_DAYS: 3,          // myöhäisen ilmoittautumisen eräpäivä
  MIN_FILL_MS: 3000,         // nopeampi lähetys = botti
  MAX_CHILDREN: 3,
  LOCK_WAIT_MS: 20000,
  MAIL_RESERVE: 3,           // jätetään kiintiöstä hälytyksiä varten
  ERROR_ALERT_THRESHOLD: 3,  // virhettä tunnissa → hälytys
  BACKUP_FOLDER: 'VibeXplorers varmuuskopiot',
  BACKUP_KEEP_DAYS: 30,
  SOURCES: ['Kaveri', 'Instagram', 'Facebook', 'Päiväkoti', 'Seura', 'Muu'],
  GENITIVE: { Espoo: 'Espoon', Vantaa: 'Vantaan', Tampere: 'Tampereen', Helsinki: 'Helsingin', Testi: 'Testin' }
};

const SHEET = { SETTINGS: 'Asetukset', MAIL: 'Sähköpostijono', LOG: 'Loki' };

const STATUS = {
  BOOKED: 'Varattu', QUEUED: 'Jonossa', OFFERED: 'Tarjottu',
  CANCELLED: 'Peruttu', EXPIRED: 'Tarjous vanhentui'
};

// Kaupunkivälilehden sarakkeet (järjestys = taulukon järjestys)
const COLS = [
  'Aikaleima', 'Perhe-ID', 'Tila', 'Jonosija', 'Ryhmä',
  'Lapsi', 'Syntymävuosi',
  'Huoltaja', 'Katuosoite', 'Postinumero', 'Toimipaikka', 'Sähköposti', 'Puhelin',
  'Hätäyhteys nimi', 'Hätäyhteys puhelin',
  'Kuvauslupa', 'Lisätiedot', 'Mistä kuuli',
  'Ehdot hyväksytty', 'Tietosuoja luettu', 'Uutiskirje', 'Host-kiinnostus',
  'Eräpäivä', 'Laskutettu', 'Maksettu',
  'Tarjous-tunniste', 'Tarjous vanhenee', 'Lähetystunniste', 'Huom.'
];

const SETTINGS_COLS = [
  'Tunnus', 'Nimi', 'Ryhmiä', 'Paikkoja per ryhmä', 'Yläraja per ryhmä',
  'Avautuu', 'Sulkeutuu', 'Tila', 'Hinta', 'Viikot', 'Ensimmäinen kerta',
  'Syntymävuodet', 'Varattu', 'Tarjottu', 'Jonossa', 'Viimeisin jonosija'
];

const MAIL_COLS = ['Luotu', 'Vastaanottaja', 'Aihe', 'HTML', 'Tila', 'Yritykset', 'Virhe', 'Lähetetty'];
const LOG_COLS = ['Aikaleima', 'Taso', 'Viesti', 'Tiedot'];

// ---------------------------------------------------------------- HTTP

function doGet(e) {
  const p = (e && e.parameter) || {};
  try {
    if (p.action === 'status') return json_(getStatus_(String(p.city || '')));
    if (p.action === 'ping') return json_({ ok: true, time: now_().toISOString() });
    return json_({ ok: false, error: 'unknown_action' });
  } catch (err) {
    log_('ERROR', 'doGet', { action: p.action, err: errText_(err) });
    return json_({ ok: false, error: 'server_error' });
  }
}

function doPost(e) {
  let req;
  try {
    req = JSON.parse((e && e.postData && e.postData.contents) || '');
  } catch (err) {
    return json_({ ok: false, error: 'bad_request' });
  }
  try {
    if (req.action === 'register') return json_(register_(req));
    if (req.action === 'confirm') return json_(confirmOffer_(String(req.token || '')));
    return json_({ ok: false, error: 'unknown_action' });
  } catch (err) {
    log_('ERROR', 'doPost', { action: req && req.action, err: errText_(err) });
    return json_({ ok: false, error: 'server_error', message: 'Jokin meni vikaan. Yritä hetken päästä uudelleen.' });
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ---------------------------------------------------------------- paikkatilanne

function getStatus_(cityKey) {
  const s = readCity_(cityKey);
  if (!s) return { ok: false, error: 'unknown_city' };
  const st = cityState_(s, now_());
  return {
    ok: true, city: s.key, name: s.name, state: st.state,
    opensAt: s.opensAt ? s.opensAt.toISOString() : null,
    free: st.state === 'open' ? st.free : null,
    price: s.price, weeks: s.weeks
  };
}

/** state: soon | open | queue | closed. free = vapaat normaalit paikat. */
function cityState_(s, now) {
  const cap = s.groups * s.perGroup;
  const free = Math.max(0, cap - s.booked - s.offered);
  if (s.mode === 'Kiinni') return { state: 'closed', free: 0 };
  const isOpen = s.mode === 'Auki' ||
    (s.opensAt && now >= s.opensAt && (!s.closesAt || now < s.closesAt));
  if (!isOpen) return { state: (!s.opensAt || now < s.opensAt) ? 'soon' : 'closed', free: 0 };
  if (free <= 0 || s.queued > 0) return { state: 'queue', free: 0 };
  return { state: 'open', free: free };
}

// ---------------------------------------------------------------- ilmoittautuminen

function register_(req) {
  // 1. Roskapostisuoja: piilokenttä ja minimiaika. Botti saa "onnistuneen" vastauksen.
  if (req.website) {
    log_('INFO', 'honeypot', {});
    return { ok: true, status: 'booked', ref: '-' };
  }
  if (!(Number(req.elapsedMs) >= CFG.MIN_FILL_MS)) {
    return { ok: false, error: 'too_fast', message: 'Lähetys tuli liian nopeasti. Tarkista tiedot ja lähetä uudelleen.' };
  }

  // 2. Lähetystunniste: sama tunniste palauttaa saman tuloksen (tuplaklikkaus, uudelleenyritys).
  const subId = String(req.submissionId || '');
  if (!/^[A-Za-z0-9][A-Za-z0-9-]{7,63}$/.test(subId)) return { ok: false, error: 'bad_request' };
  const cache = CacheService.getScriptCache();
  const cached = cache.get('sub:' + subId);
  if (cached) return JSON.parse(cached);

  // 3. Validointi (palvelimella aina, selaimen tarkistus on vain käytettävyyttä).
  const s0 = readCity_(String(req.city || ''));
  if (!s0) return { ok: false, error: 'unknown_city' };
  const v = validate_(req, s0);
  if (!v.ok) return { ok: false, error: 'invalid', fields: v.fields, message: 'Tarkista merkityt kentät.' };
  const d = v.data;

  // 4. Lukon alla vain tarkistus, päätös ja rivien kirjoitus.
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(CFG.LOCK_WAIT_MS)) {
    log_('WARN', 'lock_timeout', { city: d.city });
    return { ok: false, error: 'busy', retry: true, message: 'Ruuhkaa. Yritetään uudelleen…' };
  }
  let result, family;
  try {
    const sheet = citySheet_(d.city);
    const prev = findRowsBy_(sheet, 'Lähetystunniste', subId);
    if (prev.length) {
      result = resultFromRows_(sheet, prev);
    } else {
      const s = readCity_(d.city); // tuoreet laskurit lukon alla
      const st = cityState_(s, now_());
      if (st.state === 'soon') {
        result = { ok: false, error: 'not_open', opensAt: s.opensAt && s.opensAt.toISOString(),
          message: 'Ilmoittautuminen ei ole vielä auki.' };
      } else if (st.state === 'closed') {
        result = { ok: false, error: 'closed', message: 'Ilmoittautuminen on sulkeutunut.' };
      } else if (!req.allowDuplicate && isDuplicate_(sheet, d)) {
        result = { ok: false, error: 'duplicate',
          message: 'Tällä sähköpostilla on jo ilmoitettu sama lapsi. Lähetä uudelleen vain, jos kyse on eri lapsesta.' };
      } else {
        family = placeFamily_(sheet, s, d, subId);
        result = family.result;
      }
    }
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }

  // 5. Sähköposti lukon ulkopuolella.
  if (family) {
    const mail = family.status === STATUS.BOOKED
      ? mailBooked_(family.settings, family.data, family.dueDate)
      : mailQueued_(family.settings, family.data, family.queuePos);
    sendOrQueue_(family.data.email, mail.subject, mail.html);
  }
  if (result.ok) cache.put('sub:' + subId, JSON.stringify(result), 21600);
  return result;
}

/** Päättää paikan tai jonon ja kirjoittaa rivit. Kutsutaan lukon alla. */
function placeFamily_(sheet, s, d, subId) {
  const n = d.children.length;
  const cap = s.groups * s.perGroup;
  const max = s.groups * s.maxPerGroup;
  const used = s.booked + s.offered;
  // Ensimmäinen lapsi mahtuu normaaliin kapasiteettiin ja kaikki ylärajaan.
  // Jos jonossa on jo joku, uusi ilmoittautuja ei ohita jonoa.
  const fits = s.queued === 0 && used < cap && used + n <= max;
  const now = now_();
  const familyId = Utilities.getUuid().slice(0, 8).toUpperCase();
  const status = fits ? STATUS.BOOKED : STATUS.QUEUED;
  const queueNo = fits ? '' : s.lastQueueNo + 1;
  const dueDate = fits ? dueDate_(s, now) : null;

  const rows = d.children.map(c => rowFor_({
    'Aikaleima': fmt_(now, 'yyyy-MM-dd HH:mm:ss'),
    'Perhe-ID': familyId, 'Tila': status, 'Jonosija': queueNo,
    'Lapsi': c.name, 'Syntymävuosi': c.year,
    'Huoltaja': d.guardian, 'Katuosoite': d.street, 'Postinumero': d.postcode, 'Toimipaikka': d.cityName,
    'Sähköposti': d.email, 'Puhelin': d.phone,
    'Hätäyhteys nimi': d.emergencyName, 'Hätäyhteys puhelin': d.emergencyPhone,
    'Kuvauslupa': d.photo ? 'Kyllä' : 'Ei', 'Lisätiedot': d.notes, 'Mistä kuuli': d.source,
    'Ehdot hyväksytty': 'Kyllä', 'Tietosuoja luettu': 'Kyllä',
    'Uutiskirje': d.newsletter ? 'Kyllä' : 'Ei', 'Host-kiinnostus': d.host ? 'Kyllä' : 'Ei',
    'Eräpäivä': dueDate ? fmt_(dueDate, 'yyyy-MM-dd') : '',
    'Lähetystunniste': subId
  }));
  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, COLS.length).setValues(rows);

  if (fits) s.booked += n; else { s.queued += n; s.lastQueueNo = queueNo; }
  writeCounters_(s);

  const queuePos = fits ? null : queuePosition_(sheet, queueNo);
  log_('INFO', 'register', { city: s.key, family: familyId, status: status, children: n });
  return {
    status: status, settings: s, data: d, dueDate: dueDate, queuePos: queuePos,
    result: {
      ok: true, status: fits ? 'booked' : 'queued', ref: familyId,
      children: n, queuePosition: queuePos,
      dueDate: dueDate ? fmt_(dueDate, 'd.M.yyyy') : null,
      cancelBy: fmt_(cancelDeadline_(s), 'd.M.yyyy'),
      email: d.email
    }
  };
}

function resultFromRows_(sheet, rowNums) {
  const r = rowObj_(sheet, rowNums[0]);
  const booked = r['Tila'] === STATUS.BOOKED;
  return {
    ok: true, status: booked ? 'booked' : 'queued', ref: r['Perhe-ID'], children: rowNums.length,
    queuePosition: booked ? null : queuePosition_(sheet, Number(r['Jonosija'])),
    dueDate: r['Eräpäivä'] ? fmt_(parseDay_(r['Eräpäivä']), 'd.M.yyyy') : null,
    email: r['Sähköposti']
  };
}

function isDuplicate_(sheet, d) {
  const last = sheet.getLastRow();
  if (last < 2) return false;
  const vals = sheet.getRange(2, 1, last - 1, COLS.length).getValues();
  const iMail = col_('Sähköposti') - 1, iChild = col_('Lapsi') - 1, iState = col_('Tila') - 1;
  const names = d.children.map(c => c.name.toLowerCase());
  return vals.some(r => String(r[iMail]).toLowerCase() === d.email &&
    names.indexOf(String(r[iChild]).replace(/^'/, '').toLowerCase()) >= 0 &&
    r[iState] !== STATUS.CANCELLED && r[iState] !== STATUS.EXPIRED);
}

/** Monesko perhe jonossa (jonossa olevat perheet, joiden jonosija ≤ oma). */
function queuePosition_(sheet, queueNo) {
  const last = sheet.getLastRow();
  if (last < 2) return 1;
  const vals = sheet.getRange(2, 1, last - 1, COLS.length).getValues();
  const iState = col_('Tila') - 1, iNo = col_('Jonosija') - 1;
  const ahead = {};
  vals.forEach(r => {
    if (r[iState] === STATUS.QUEUED && Number(r[iNo]) <= queueNo) ahead[r[iNo]] = true;
  });
  return Math.max(1, Object.keys(ahead).length);
}

// ---------------------------------------------------------------- validointi

function validate_(req, s) {
  const f = {};
  const txt = (v, max) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max);
  const years = parseYears_(s.years);

  const kids = Array.isArray(req.children) ? req.children.slice(0, CFG.MAX_CHILDREN + 1) : [];
  if (kids.length < 1) f.children = 'Lisää vähintään yksi lapsi.';
  if (kids.length > CFG.MAX_CHILDREN) f.children = 'Yhdellä lomakkeella voi ilmoittaa enintään ' + CFG.MAX_CHILDREN + ' lasta.';
  const children = kids.slice(0, CFG.MAX_CHILDREN).map((k, i) => {
    const name = txt(k && k.name, 80);
    const year = Number(k && k.year);
    if (name.length < 3 || name.indexOf(' ') < 0) f['child' + i + 'Name'] = 'Kirjoita lapsen etu- ja sukunimi.';
    if (years.indexOf(year) < 0) f['child' + i + 'Year'] = 'Valitse syntymävuosi ' + years[0] + '–' + years[years.length - 1] + '.';
    return { name: name, year: year };
  });

  const guardian = txt(req.guardian, 80);
  if (guardian.length < 3 || guardian.indexOf(' ') < 0) f.guardian = 'Kirjoita huoltajan etu- ja sukunimi.';
  const street = txt(req.street, 100);
  if (street.length < 3) f.street = 'Kirjoita katuosoite.';
  const postcode = txt(req.postcode, 5);
  if (!/^\d{5}$/.test(postcode)) f.postcode = 'Postinumerossa on viisi numeroa.';
  const cityName = txt(req.postCity, 50);
  if (cityName.length < 2) f.postCity = 'Kirjoita postitoimipaikka.';
  const email = txt(req.email, 120).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) f.email = 'Tarkista sähköpostiosoite.';
  const phone = normPhone_(req.phone);
  if (!phone) f.phone = 'Tarkista puhelinnumero.';

  const emergencyName = txt(req.emergencyName, 80);
  const emergencyPhone = req.emergencyPhone ? normPhone_(req.emergencyPhone) : '';
  if (req.emergencyPhone && !emergencyPhone) f.emergencyPhone = 'Tarkista puhelinnumero.';

  if (req.photo !== 'yes' && req.photo !== 'no') f.photo = 'Valitse, saako lasta kuvata.';
  if (req.terms !== true) f.terms = 'Hyväksy osallistumisehdot.';
  if (req.privacy !== true) f.privacy = 'Vahvista, että olet lukenut tietosuojaselosteen.';

  const source = CFG.SOURCES.indexOf(req.source) >= 0 ? req.source : '';
  const notes = txt(req.notes, 500);

  if (Object.keys(f).length) return { ok: false, fields: f };
  return {
    ok: true,
    data: {
      city: s.key, children: children, guardian: guardian, street: street, postcode: postcode,
      cityName: cityName, email: email, phone: phone,
      emergencyName: emergencyName, emergencyPhone: emergencyPhone,
      photo: req.photo === 'yes', notes: notes, source: source,
      newsletter: req.newsletter === true, host: req.host === true
    }
  };
}

function normPhone_(v) {
  let p = String(v == null ? '' : v).replace(/[\s\-().]/g, '');
  if (/^00\d+$/.test(p)) p = '+' + p.slice(2);
  if (/^\+358\d{6,11}$/.test(p) || /^0\d{6,11}$/.test(p) || /^\+[1-9]\d{6,14}$/.test(p)) return p;
  return '';
}

function parseYears_(v) {
  const m = String(v || '').match(/(\d{4})\s*[-–]\s*(\d{4})/);
  if (!m) return [];
  const out = [];
  for (let y = Number(m[1]); y <= Number(m[2]); y++) out.push(y);
  return out;
}

/** Arvo tekstinä; kaavaksi tulkittavat merkit neutraloidaan. */
function safe_(v) {
  const s = String(v == null ? '' : v);
  if (/^\+\d{6,15}$/.test(s)) return s; // puhelinnumero, sarake on tekstimuotoinen
  return /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
}

// ---------------------------------------------------------------- jonosta tarjoaminen

/** Tarjoaa vapautuneen paikan jonon ensimmäiselle perheelle. Palauttaa selitteen. */
function offerNext_(cityKey) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(CFG.LOCK_WAIT_MS)) return 'Lukko varattu, yritä hetken päästä uudelleen.';
  let mail = null, msg;
  try {
    const sheet = citySheet_(cityKey);
    recountLocked_(cityKey);
    const s = readCity_(cityKey);
    const cap = s.groups * s.perGroup, max = s.groups * s.maxPerGroup;
    const used = s.booked + s.offered;
    if (used >= cap) {
      msg = 'Ei vapaita paikkoja (' + used + '/' + cap + ').';
    } else {
      const fam = firstQueuedFamily_(sheet);
      if (!fam) {
        msg = 'Jonossa ei ole ketään.';
      } else if (used + fam.rows.length > max) {
        msg = 'Jonon ensimmäisessä perheessä on ' + fam.rows.length + ' lasta, eivätkä kaikki mahdu. Tarkista tilanne käsin.';
      } else {
        const token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
        const expires = new Date(now_().getTime() + CFG.OFFER_HOURS * 3600 * 1000);
        fam.rows.forEach(r => setCells_(sheet, r, {
          'Tila': STATUS.OFFERED, 'Tarjous-tunniste': token,
          'Tarjous vanhenee': fmt_(expires, 'yyyy-MM-dd HH:mm:ss')
        }));
        recountLocked_(cityKey);
        const first = rowObj_(sheet, fam.rows[0]);
        mail = { to: first['Sähköposti'], m: mailOffer_(s, first, fam.rows.map(r => rowObj_(sheet, r)['Lapsi']), token, expires) };
        msg = 'Paikka tarjottu perheelle ' + first['Perhe-ID'] + ' (' + first['Huoltaja'] + '), voimassa ' + fmt_(expires, 'd.M. HH:mm') + ' asti.';
        log_('INFO', 'offer', { city: cityKey, family: first['Perhe-ID'] });
      }
    }
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }
  if (mail) sendOrQueue_(mail.to, mail.m.subject, mail.m.html);
  return msg;
}

function firstQueuedFamily_(sheet) {
  const last = sheet.getLastRow();
  if (last < 2) return null;
  const vals = sheet.getRange(2, 1, last - 1, COLS.length).getValues();
  const iState = col_('Tila') - 1, iNo = col_('Jonosija') - 1, iFam = col_('Perhe-ID') - 1;
  let best = null;
  vals.forEach((r, i) => {
    if (r[iState] !== STATUS.QUEUED) return;
    const no = Number(r[iNo]);
    if (!best || no < best.no) best = { no: no, fam: r[iFam], rows: [] };
  });
  if (!best) return null;
  vals.forEach((r, i) => {
    if (r[iState] === STATUS.QUEUED && r[iFam] === best.fam) best.rows.push(i + 2);
  });
  return best;
}

function confirmOffer_(token) {
  if (!/^[a-f0-9]{64}$/.test(token)) return { ok: false, error: 'invalid_token', message: 'Linkki ei ole kelvollinen.' };
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(CFG.LOCK_WAIT_MS)) return { ok: false, error: 'busy', retry: true, message: 'Ruuhkaa. Yritä hetken päästä uudelleen.' };
  let result, mail = null;
  try {
    let found = null;
    listCities_().some(key => {
      const sh = citySheet_(key);
      const rows = findRowsBy_(sh, 'Tarjous-tunniste', token);
      if (rows.length) found = { key: key, sheet: sh, rows: rows };
      return !!found;
    });
    if (!found) {
      result = { ok: false, error: 'invalid_token', message: 'Linkki ei ole kelvollinen.' };
    } else {
      const first = rowObj_(found.sheet, found.rows[0]);
      const s = readCity_(found.key);
      if (first['Tila'] === STATUS.BOOKED) {
        result = { ok: true, status: 'already', message: 'Paikka on jo vahvistettu.' };
      } else if (first['Tila'] !== STATUS.OFFERED || parseStamp_(first['Tarjous vanhenee']) <= now_()) {
        result = { ok: false, error: 'expired', message: 'Tarjous on valitettavasti vanhentunut.' };
      } else {
        const due = dueDate_(s, now_());
        found.rows.forEach(r => setCells_(found.sheet, r, { 'Tila': STATUS.BOOKED, 'Eräpäivä': fmt_(due, 'yyyy-MM-dd') }));
        recountLocked_(found.key);
        const sNew = readCity_(found.key);
        const data = dataFromRows_(found.sheet, found.rows);
        mail = { to: data.email, m: mailBooked_(sNew, data, due) };
        result = { ok: true, status: 'booked', ref: first['Perhe-ID'], dueDate: fmt_(due, 'd.M.yyyy'), city: s.name };
        log_('INFO', 'confirm', { city: found.key, family: first['Perhe-ID'] });
      }
    }
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }
  if (mail) sendOrQueue_(mail.to, mail.m.subject, mail.m.html);
  return result;
}

/** Tunneittain: vanhentuneet tarjoukset pois ja paikka seuraavalle. */
function expireOffers() {
  listCities_().forEach(key => {
    let expired = 0;
    const lock = LockService.getScriptLock();
    if (!lock.tryLock(CFG.LOCK_WAIT_MS)) return;
    try {
      const sh = citySheet_(key);
      const last = sh.getLastRow();
      if (last < 2) return;
      const vals = sh.getRange(2, 1, last - 1, COLS.length).getValues();
      const iState = col_('Tila') - 1, iExp = col_('Tarjous vanhenee') - 1;
      const now = now_();
      vals.forEach((r, i) => {
        if (r[iState] === STATUS.OFFERED && parseStamp_(r[iExp]) <= now) {
          setCells_(sh, i + 2, { 'Tila': STATUS.EXPIRED });
          expired++;
        }
      });
      if (expired) recountLocked_(key);
      SpreadsheetApp.flush();
    } finally {
      lock.releaseLock();
    }
    if (expired) {
      log_('INFO', 'offer_expired', { city: key, rows: expired });
      offerNext_(key);
    }
  });
}

// ---------------------------------------------------------------- päivämäärät

function cancelDeadline_(s) {
  return addDays_(s.firstSession, -CFG.CANCEL_DAYS_BEFORE);
}

/** Eräpäivä = peruutusraja. Sen jälkeen 3 pv, kuitenkin viimeistään 1. kertaa edeltävä päivä. */
function dueDate_(s, now) {
  const today = parseDay_(fmt_(now, 'yyyy-MM-dd'));
  const deadline = cancelDeadline_(s);
  if (today <= deadline) return deadline;
  const late = addDays_(today, CFG.LATE_DUE_DAYS);
  const dayBefore = addDays_(s.firstSession, -1);
  const due = late < dayBefore ? late : dayBefore;
  return due < today ? today : due;
}

function addDays_(d, n) {
  const x = new Date(d.getTime());
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

/** 'yyyy-MM-dd' → Date (Helsingin keskipäivä, jottei aikavyöhyke siirrä päivää). */
function parseDay_(v) {
  if (v instanceof Date) return parseDay_(fmt_(v, 'yyyy-MM-dd'));
  return Utilities.parseDate(String(v).replace(/^'/, '').slice(0, 10) + ' 12:00', CFG.TZ, 'yyyy-MM-dd HH:mm');
}

function parseStamp_(v) {
  if (v instanceof Date) return v;
  const s = String(v || '').replace(/^'/, '');
  if (!s) return new Date(0);
  const fmt = s.length > 16 ? 'yyyy-MM-dd HH:mm:ss' : 'yyyy-MM-dd HH:mm';
  return Utilities.parseDate(s, CFG.TZ, fmt);
}

function fmt_(d, pattern) { return Utilities.formatDate(d, CFG.TZ, pattern); }
function now_() { return new Date(); }

// ---------------------------------------------------------------- asetukset ja laskurit

function readCity_(key) {
  key = String(key || '').toLowerCase();
  if (!/^[a-z0-9-]{2,30}$/.test(key)) return null;
  const sh = ss_().getSheetByName(SHEET.SETTINGS);
  const vals = sh.getDataRange().getValues();
  for (let i = 1; i < vals.length; i++) {
    const r = vals[i];
    if (String(r[0]).toLowerCase() !== key) continue;
    const g = n => r[SETTINGS_COLS.indexOf(n)];
    return {
      key: key, row: i + 1, name: String(g('Nimi')),
      groups: Number(g('Ryhmiä')) || 1,
      perGroup: Number(g('Paikkoja per ryhmä')) || 27,
      maxPerGroup: Number(g('Yläraja per ryhmä')) || Number(g('Paikkoja per ryhmä')) || 27,
      opensAt: g('Avautuu') ? parseStamp_(g('Avautuu')) : null,
      closesAt: g('Sulkeutuu') ? parseStamp_(g('Sulkeutuu')) : null,
      mode: String(g('Tila') || 'Auto'),
      price: String(g('Hinta')), weeks: String(g('Viikot')),
      firstSession: parseDay_(g('Ensimmäinen kerta')),
      years: String(g('Syntymävuodet')),
      booked: Number(g('Varattu')) || 0, offered: Number(g('Tarjottu')) || 0,
      queued: Number(g('Jonossa')) || 0, lastQueueNo: Number(g('Viimeisin jonosija')) || 0
    };
  }
  return null;
}

function writeCounters_(s) {
  const sh = ss_().getSheetByName(SHEET.SETTINGS);
  const c0 = SETTINGS_COLS.indexOf('Varattu') + 1;
  sh.getRange(s.row, c0, 1, 4).setValues([[s.booked, s.offered, s.queued, s.lastQueueNo]]);
}

/** Laskee laskurit uudelleen kaupunkivälilehdeltä. Kutsuttava lukon alla. */
function recountLocked_(key) {
  const s = readCity_(key);
  const sh = citySheet_(key);
  const last = sh.getLastRow();
  let b = 0, o = 0, q = 0, maxNo = s.lastQueueNo;
  if (last >= 2) {
    const vals = sh.getRange(2, 1, last - 1, COLS.length).getValues();
    const iState = col_('Tila') - 1, iNo = col_('Jonosija') - 1;
    vals.forEach(r => {
      if (r[iState] === STATUS.BOOKED) b++;
      else if (r[iState] === STATUS.OFFERED) o++;
      else if (r[iState] === STATUS.QUEUED) q++;
      if (Number(r[iNo]) > maxNo) maxNo = Number(r[iNo]);
    });
  }
  s.booked = b; s.offered = o; s.queued = q; s.lastQueueNo = maxNo;
  writeCounters_(s);
  return s;
}

function recountAll() {
  const lock = LockService.getScriptLock();
  lock.waitLock(CFG.LOCK_WAIT_MS);
  try { listCities_().forEach(recountLocked_); } finally { lock.releaseLock(); }
}

/** Asennettava onEdit: kun Olli muuttaa Tila-saraketta, laskurit päivittyvät. */
function onSheetEdit(e) {
  try {
    const sh = e.range.getSheet();
    const key = sh.getName().toLowerCase();
    if (listCities_().indexOf(key) < 0) return;
    const c = col_('Tila');
    if (e.range.getColumn() > c || e.range.getLastColumn() < c) return;
    const lock = LockService.getScriptLock();
    if (!lock.tryLock(CFG.LOCK_WAIT_MS)) return;
    try { recountLocked_(key); } finally { lock.releaseLock(); }
  } catch (err) {
    log_('ERROR', 'onSheetEdit', { err: errText_(err) });
  }
}

function listCities_() {
  const vals = ss_().getSheetByName(SHEET.SETTINGS).getDataRange().getValues();
  return vals.slice(1).map(r => String(r[0]).toLowerCase()).filter(k => /^[a-z0-9-]{2,30}$/.test(k));
}

// ---------------------------------------------------------------- taulukkoapurit

function ss_() { return SpreadsheetApp.getActiveSpreadsheet(); }
function col_(name) { return COLS.indexOf(name) + 1; }

function citySheet_(key) {
  const sh = ss_().getSheetByName(key);
  if (!sh) throw new Error('Välilehti puuttuu: ' + key);
  return sh;
}

function rowFor_(obj) {
  return COLS.map(c => safe_(obj[c] == null ? '' : obj[c]));
}

function rowObj_(sheet, row) {
  const vals = sheet.getRange(row, 1, 1, COLS.length).getValues()[0];
  const o = {};
  COLS.forEach((c, i) => { o[c] = typeof vals[i] === 'string' ? vals[i].replace(/^'/, '') : vals[i]; });
  return o;
}

function setCells_(sheet, row, obj) {
  Object.keys(obj).forEach(k => sheet.getRange(row, col_(k)).setValue(safe_(obj[k])));
}

function findRowsBy_(sheet, colName, value) {
  const last = sheet.getLastRow();
  if (last < 2 || !value) return [];
  const vals = sheet.getRange(2, col_(colName), last - 1, 1).getValues();
  const out = [];
  vals.forEach((r, i) => { if (String(r[0]) === value) out.push(i + 2); });
  return out;
}

function dataFromRows_(sheet, rows) {
  const r = rowObj_(sheet, rows[0]);
  return {
    guardian: r['Huoltaja'], email: r['Sähköposti'], host: r['Host-kiinnostus'] === 'Kyllä',
    children: rows.map(n => { const x = rowObj_(sheet, n); return { name: x['Lapsi'], year: x['Syntymävuosi'] }; })
  };
}

// ---------------------------------------------------------------- sähköposti

/** Lähettää heti, jos kiintiötä on. Muuten viesti jää jonoon ja lähtee ajastetusti. */
function sendOrQueue_(to, subject, html) {
  const sh = ss_().getSheetByName(SHEET.MAIL);
  const stamp = fmt_(now_(), 'yyyy-MM-dd HH:mm:ss');
  let status = 'Odottaa', error = '', sentAt = '';
  try {
    if (MailApp.getRemainingDailyQuota() > CFG.MAIL_RESERVE) {
      sendMail_(to, subject, html);
      status = 'Lähetetty'; sentAt = stamp;
    } else {
      error = 'Päiväkiintiö täynnä';
      log_('WARN', 'mail_quota', { to: to });
    }
  } catch (err) {
    error = errText_(err);
    log_('ERROR', 'mail_send', { to: to, err: error });
  }
  sh.appendRow([stamp, safe_(to), safe_(subject), html, status, status === 'Lähetetty' ? 1 : 0, error, sentAt]);
}

function sendMail_(to, subject, html) {
  MailApp.sendEmail({ to: to, subject: subject, htmlBody: html, name: CFG.SENDER_NAME, replyTo: CFG.REPLY_TO });
}

/** Ajastin (15 min): lähettää jonossa odottavat viestit. */
function processMailQueue() {
  const lock = LockService.getDocumentLock();
  if (!lock.tryLock(5000)) return;
  try {
    const sh = ss_().getSheetByName(SHEET.MAIL);
    const last = sh.getLastRow();
    if (last < 2) return;
    const vals = sh.getRange(2, 1, last - 1, MAIL_COLS.length).getValues();
    let quota = MailApp.getRemainingDailyQuota() - CFG.MAIL_RESERVE;
    vals.forEach((r, i) => {
      if (r[4] !== 'Odottaa' || quota <= 0 || Number(r[5]) >= 5) return;
      const row = i + 2;
      try {
        sendMail_(String(r[1]).replace(/^'/, ''), String(r[2]).replace(/^'/, ''), r[3]);
        sh.getRange(row, 5, 1, 4).setValues([['Lähetetty', Number(r[5]) + 1, '', fmt_(now_(), 'yyyy-MM-dd HH:mm:ss')]]);
        quota--;
      } catch (err) {
        sh.getRange(row, 6, 1, 2).setValues([[Number(r[5]) + 1, errText_(err)]]);
        log_('ERROR', 'mail_retry', { row: row, err: errText_(err) });
      }
    });
  } finally {
    lock.releaseLock();
  }
}

// ---------------------------------------------------------------- viestipohjat

function esc_(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function layout_(title, bodyHtml) {
  return '<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#14171f;max-width:560px;margin:0 auto;padding:24px">' +
    '<div style="font-weight:700;font-size:18px;letter-spacing:.5px;margin-bottom:20px">VibeXplorers</div>' +
    '<h1 style="font-size:22px;line-height:1.25;margin:0 0 16px">' + esc_(title) + '</h1>' + bodyHtml +
    '<p style="margin:28px 0 0;color:#5b6170;font-size:13px">Kysyttävää? Vastaa tähän viestiin tai kirjoita ' +
    '<a href="mailto:' + CFG.REPLY_TO + '" style="color:#14171f">' + CFG.REPLY_TO + '</a>.<br>' +
    'VibeXplorers Oy · <a href="' + CFG.SITE + '" style="color:#14171f">vibexplorers.com</a></p></div>';
}

function kidsList_(children) {
  return '<ul style="margin:0 0 16px;padding-left:20px">' +
    children.map(c => '<li>' + esc_(c.name || c) + (c.year ? ' (' + esc_(c.year) + ')' : '') + '</li>').join('') + '</ul>';
}

function mailBooked_(s, d, due) {
  const n = d.children.length;
  const hostP = d.host
    ? '<p>Kiitos, että olet kiinnostunut toimimaan ryhmän VibeXplorers Hostina! Olli ottaa sinuun yhteyttä viikon sisällä.</p>'
    : '<p style="color:#5b6170">Etsimme ryhmille VibeXplorers Hosteja. <a href="' + CFG.HOST_URL + '" style="color:#14171f">Lue lisää</a>.</p>';
  const body =
    '<p>Hei ' + esc_(firstName_(d.guardian)) + ',</p>' +
    '<p>kiitos ilmoittautumisesta! ' + (n > 1 ? 'Lapsille on' : 'Lapselle on') + ' varattu paikka VibeXplorersin ' + esc_(gen_(s.name)) + ' ryhmään:</p>' +
    kidsList_(d.children) +
    '<table style="border-collapse:collapse;margin:0 0 16px;font-size:15px">' +
    tr_('Kausi', 'Viikot ' + s.weeks) +
    tr_('Ensimmäinen kerta', fmt_(s.firstSession, 'd.M.yyyy')) +
    tr_('Hinta', s.price + ' / lapsi') +
    tr_('Laskun eräpäivä', fmt_(due, 'd.M.yyyy')) +
    '</table>' +
    '<p>Lasku tulee erikseen sähköpostilla. Paikka on vahvistettu, kun lasku on maksettu. ' +
    'Voit perua osallistumisen maksutta ' + fmt_(cancelDeadline_(s), 'd.M.yyyy') + ' asti vastaamalla tähän viestiin.</p>' +
    '<p>Ennen kauden alkua saat tervetuloviestin, jossa kerrotaan ryhmä, ensimmäisen kerran paikka ja muut käytännöt.</p>' +
    hostP +
    '<p style="font-size:13px;color:#5b6170"><a href="' + CFG.TERMS_URL + '" style="color:#5b6170">Osallistumisehdot</a> · ' +
    '<a href="' + CFG.PRIVACY_URL + '" style="color:#5b6170">Tietosuojaseloste</a></p>';
  return { subject: 'Paikka varattu – VibeXplorers ' + s.name, html: layout_('Paikka varattu', body) };
}

function mailQueued_(s, d, pos) {
  const body =
    '<p>Hei ' + esc_(firstName_(d.guardian)) + ',</p>' +
    '<p>kiitos ilmoittautumisesta! ' + esc_(gen_(s.name)) + ' ryhmät ovat tällä hetkellä täynnä, joten ' +
    (d.children.length > 1 ? 'lapset ovat' : 'lapsi on') + ' jonotuslistalla:</p>' +
    kidsList_(d.children) +
    '<p><b>Olette jonossa sijalla ' + esc_(pos) + '.</b></p>' +
    '<p>Jos paikka vapautuu, lähetämme sähköpostin, jossa on vahvistuslinkki. Paikka on voimassa ' + CFG.OFFER_HOURS +
    ' tuntia, joten seuraathan sähköpostia (myös roskapostikansiota). Jonossa oleminen ei maksa mitään eikä sido mihinkään.</p>' +
    '<p>Jos haluat poistua jonosta, vastaa tähän viestiin.</p>';
  return { subject: 'Olet jonossa – VibeXplorers ' + s.name, html: layout_('Olette jonotuslistalla', body) };
}

function mailOffer_(s, first, childNames, token, expires) {
  const link = CFG.SITE + '/vahvista#' + token;
  const body =
    '<p>Hei ' + esc_(firstName_(first['Huoltaja'])) + ',</p>' +
    '<p>hyviä uutisia: VibeXplorersin ' + esc_(gen_(s.name)) + ' ryhmästä vapautui paikka!</p>' +
    kidsList_(childNames) +
    '<p>Vahvista paikka viimeistään <b>' + fmt_(expires, 'd.M.yyyy') + ' klo ' + fmt_(expires, 'HH:mm') + '</b>. ' +
    'Muuten paikka tarjotaan jonossa seuraavalle.</p>' +
    '<p style="margin:24px 0"><a href="' + link + '" style="background:#14171f;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:700">Vahvista paikka</a></p>' +
    '<p>Hinta on ' + esc_(s.price) + ' / lapsi. Lasku tulee vahvistuksen jälkeen sähköpostilla.</p>' +
    '<p>Jos ette halua paikkaa, voit jättää viestin huomiotta tai vastata tähän viestiin.</p>';
  return { subject: 'Paikka vapautui – vahvista ' + fmt_(expires, 'd.M. HH:mm') + ' mennessä', html: layout_('Paikka vapautui', body) };
}

function tr_(k, v) {
  return '<tr><td style="padding:4px 16px 4px 0;color:#5b6170">' + esc_(k) + '</td><td style="padding:4px 0;font-weight:700">' + esc_(v) + '</td></tr>';
}

function gen_(name) { return CFG.GENITIVE[name] || name + 'n'; }

function firstName_(full) { return String(full || '').split(' ')[0]; }

// ---------------------------------------------------------------- loki ja hälytys

function log_(level, msg, data) {
  try {
    const sh = ss_().getSheetByName(SHEET.LOG);
    sh.appendRow([fmt_(now_(), 'yyyy-MM-dd HH:mm:ss'), level, msg, safe_(JSON.stringify(data || {}))]);
    if (level !== 'ERROR') return;
    const cache = CacheService.getScriptCache();
    const hourKey = 'err:' + fmt_(now_(), 'yyyyMMddHH');
    const n = Number(cache.get(hourKey) || 0) + 1;
    cache.put(hourKey, String(n), 3600);
    if (n === CFG.ERROR_ALERT_THRESHOLD) {
      MailApp.sendEmail(CFG.ADMIN_EMAIL, 'VibeXplorers-ilmoittautuminen: virheitä',
        n + ' virhettä viimeisen tunnin aikana. Katso Loki-välilehti.\n\nViimeisin: ' + msg + ' ' + JSON.stringify(data || {}));
    }
  } catch (e) { /* loki ei saa kaataa pyyntöä */ }
}

function errText_(err) { return String((err && err.stack) || err).slice(0, 1000); }

// ---------------------------------------------------------------- varmuuskopio

/** Ajastin (kerran vuorokaudessa): kopio taulukosta, yli 30 pv vanhat poistetaan. */
function dailyBackup() {
  const it = DriveApp.getFoldersByName(CFG.BACKUP_FOLDER);
  const folder = it.hasNext() ? it.next() : DriveApp.createFolder(CFG.BACKUP_FOLDER);
  const file = DriveApp.getFileById(ss_().getId());
  file.makeCopy(file.getName() + ' ' + fmt_(now_(), 'yyyy-MM-dd'), folder);
  const cutoff = new Date(now_().getTime() - CFG.BACKUP_KEEP_DAYS * 86400000);
  const files = folder.getFiles();
  while (files.hasNext()) {
    const f = files.next();
    if (f.getDateCreated() < cutoff) f.setTrashed(true);
  }
}

// ---------------------------------------------------------------- valikko ja asennus

function onOpen() {
  SpreadsheetApp.getUi().createMenu('VibeXplorers')
    .addItem('Tarjoa vapautunut paikka (avoin välilehti)', 'menuOfferNext')
    .addItem('Päivitä laskurit', 'menuRecount')
    .addItem('Lähetä odottavat sähköpostit', 'processMailQueue')
    .addSeparator()
    .addItem('Asenna / tarkista asetukset', 'setup')
    .addToUi();
}

function menuOfferNext() {
  const key = ss_().getActiveSheet().getName().toLowerCase();
  const ui = SpreadsheetApp.getUi();
  if (listCities_().indexOf(key) < 0) { ui.alert('Avaa ensin kaupungin välilehti (esim. espoo).'); return; }
  const ok = ui.alert('Tarjotaanko vapautunut paikka jonon ensimmäiselle (' + key + ')?', ui.ButtonSet.YES_NO);
  if (ok !== ui.Button.YES) return;
  ui.alert(offerNext_(key));
}

function menuRecount() {
  recountAll();
  SpreadsheetApp.getUi().alert('Laskurit päivitetty.');
}

/**
 * Luo välilehdet, otsikot ja ajastimet. Turvallinen ajaa uudelleen:
 * olemassa olevia rivejä tai asetuksia ei ylikirjoiteta.
 */
function setup() {
  const ss = ss_();
  ss.setSpreadsheetTimeZone(CFG.TZ);

  let set = ss.getSheetByName(SHEET.SETTINGS);
  if (!set) {
    set = ss.insertSheet(SHEET.SETTINGS, 0);
    set.getRange(1, 1, 1, SETTINGS_COLS.length).setValues([SETTINGS_COLS]).setFontWeight('bold');
    set.getRange(2, 1, 200, SETTINGS_COLS.length).setNumberFormat('@');
    set.getRange(2, 1, 5, SETTINGS_COLS.length).setValues(DEFAULT_CITIES_);
    set.setFrozenRows(1);
  }

  listCities_().forEach(key => {
    if (ss.getSheetByName(key)) return;
    const sh = ss.insertSheet(key);
    sh.getRange(1, 1, 1, COLS.length).setValues([COLS]).setFontWeight('bold');
    sh.getRange(2, 1, sh.getMaxRows() - 1, COLS.length).setNumberFormat('@');
    sh.setFrozenRows(1);
    const rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(Object.keys(STATUS).map(k => STATUS[k]), true).setAllowInvalid(false).build();
    sh.getRange(2, col_('Tila'), sh.getMaxRows() - 1, 1).setDataValidation(rule);
  });

  [[SHEET.MAIL, MAIL_COLS], [SHEET.LOG, LOG_COLS]].forEach(([name, cols]) => {
    if (ss.getSheetByName(name)) return;
    const sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold');
    sh.getRange(2, 1, sh.getMaxRows() - 1, cols.length).setNumberFormat('@');
    sh.setFrozenRows(1);
  });

  const handlers = ['expireOffers', 'processMailQueue', 'dailyBackup', 'onSheetEdit'];
  ScriptApp.getProjectTriggers().forEach(t => {
    if (handlers.indexOf(t.getHandlerFunction()) >= 0) ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('expireOffers').timeBased().everyHours(1).create();
  ScriptApp.newTrigger('processMailQueue').timeBased().everyMinutes(15).create();
  ScriptApp.newTrigger('dailyBackup').timeBased().atHour(3).everyDays(1).create();
  ScriptApp.newTrigger('onSheetEdit').forSpreadsheet(ss).onEdit().create();

  recountAll();
  return 'OK';
}

// Tunnus, Nimi, Ryhmiä, Paikkoja/ryhmä, Yläraja/ryhmä, Avautuu, Sulkeutuu, Tila, Hinta, Viikot,
// Ensimmäinen kerta, Syntymävuodet, Varattu, Tarjottu, Jonossa, Viimeisin jonosija
const DEFAULT_CITIES_ = [
  ['vantaa',   'Vantaa',   '1', '27', '28', '2026-10-27 20:00', '', 'Auto',   '69 €', '4–12', '2027-01-30', '2020–2023', '0', '0', '0', '0'],
  ['espoo',    'Espoo',    '2', '27', '28', '2026-10-28 20:00', '', 'Auto',   '79 €', '3–11', '2027-01-24', '2020–2023', '0', '0', '0', '0'],
  ['tampere',  'Tampere',  '2', '27', '28', '2026-10-29 20:00', '', 'Auto',   '69 €', '4–12', '2027-01-30', '2020–2023', '0', '0', '0', '0'],
  ['helsinki', 'Helsinki', '2', '27', '28', '',                 '', 'Auto',   '79 €', '4–12', '2027-01-30', '2020–2023', '0', '0', '0', '0'],
  ['testi',    'Testi',    '1', '3',  '4',  '2026-10-20 12:00', '', 'Auto',   '1 €',  '4–12', '2027-01-30', '2020–2023', '0', '0', '0', '0']
];
