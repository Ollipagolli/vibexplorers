const assert = require('assert');
const { makeEnv } = require('./harness');

let passed = 0;
function t(name, fn) {
  try { fn(); passed++; console.log('✓ ' + name); }
  catch (e) { console.log('✗ ' + name + '\n   ' + (e.stack || e).split('\n').slice(0, 4).join('\n   ')); process.exitCode = 1; }
}

let sid = 0;
function form(over = {}) {
  sid++;
  return Object.assign({
    action: 'register', city: 'testi', submissionId: 'sub-' + String(sid).padStart(6, '0'), elapsedMs: 20000,
    children: [{ name: 'Aino Testinen' + sid, year: 2021 }],
    guardian: 'Olli Testinen', street: 'Testitie 1', postcode: '02100', postCity: 'Espoo',
    email: `perhe${sid}@example.com`, phone: '040 123 4567', photo: 'no', terms: true, privacy: true,
    source: 'Instagram', notes: '', newsletter: false, host: false
  }, over);
}
function post(env, body) { return env.api.doPost({ postData: { contents: JSON.stringify(body) } }); }
function rows(env, city) {
  const sh = env.sheets[city]; const out = [];
  for (let r = 2; r <= sh.getLastRow(); r++) { const o = {}; env.api.COLS.forEach((c, i) => { o[c] = sh.get(r, i + 1); }); out.push(o); }
  return out;
}
function setting(env, city, col) {
  const sh = env.sheets['Asetukset'];
  for (let r = 2; r <= sh.getLastRow(); r++) if (sh.get(r, 1) === city) return sh.get(r, env.api.SETTINGS_COLS.indexOf(col) + 1);
}
function fresh() {
  const env = makeEnv();
  env.api.setup();
  env.now = new Date('2026-10-20T09:30:00Z'); // 12:30 Helsingissä, testi auki klo 12
  return env;
}

t('setup luo välilehdet ja ajastimet', () => {
  const env = fresh();
  ['Asetukset', 'vantaa', 'espoo', 'tampere', 'helsinki', 'testi', 'Sähköpostijono', 'Loki'].forEach(n => assert.ok(env.sheets[n], n));
  assert.deepStrictEqual(env.triggers.sort(), ['dailyBackup', 'expireOffers', 'onSheetEdit', 'processMailQueue']);
});

t('status: ennen avausta soon, avauksen jälkeen open', () => {
  const env = fresh();
  env.now = new Date('2026-11-03T17:59:00Z'); // 19:59 Helsinki
  let s = env.api.doGet({ parameter: { action: 'status', city: 'vantaa' } });
  assert.strictEqual(s.state, 'soon');
  assert.strictEqual(s.opensAt, '2026-11-03T18:00:00.000Z');
  env.now = new Date('2026-11-03T18:00:00Z');
  s = env.api.doGet({ parameter: { action: 'status', city: 'vantaa' } });
  assert.strictEqual(s.state, 'open'); assert.strictEqual(s.free, 27);
  assert.strictEqual(env.api.doGet({ parameter: { action: 'status', city: 'helsinki' } }).state, 'soon');
  assert.strictEqual(env.api.doGet({ parameter: { action: 'status', city: 'xx' } }).error, 'unknown_city');
});

t('palvelin hylkää liian aikaisen lähetyksen', () => {
  const env = fresh();
  env.now = new Date('2026-10-20T08:59:00Z'); // 11:59
  const r = post(env, form());
  assert.strictEqual(r.error, 'not_open');
  assert.strictEqual(rows(env, 'testi').length, 0);
});

t('kapasiteetti 3: neljäs jonoon, jonosijat kasvavat', () => {
  const env = fresh();
  for (let i = 0; i < 3; i++) assert.strictEqual(post(env, form()).status, 'booked');
  const q1 = post(env, form());
  assert.strictEqual(q1.status, 'queued'); assert.strictEqual(q1.queuePosition, 1);
  const q2 = post(env, form({ children: [{ name: 'Eka Lapsi', year: 2020 }, { name: 'Toka Lapsi', year: 2022 }] }));
  assert.strictEqual(q2.queuePosition, 2);
  assert.strictEqual(setting(env, 'testi', 'Varattu'), 3);
  assert.strictEqual(setting(env, 'testi', 'Jonossa'), 3);
  assert.strictEqual(env.api.doGet({ parameter: { action: 'status', city: 'testi' } }).state, 'queue');
  assert.ok(env.mails.some(m => /Olette jonossa/.test(m.subject)));
  assert.ok(/Paikka jonossa.*?>2</.test(env.mails[env.mails.length - 1].htmlBody));
});

t('sisarukset: mahtuvat ylärajaan 4, sen yli koko perhe jonoon', () => {
  const env = fresh();
  post(env, form()); post(env, form());
  const sib = post(env, form({ children: [{ name: 'Eka Lapsi', year: 2020 }, { name: 'Toka Lapsi', year: 2022 }] }));
  assert.strictEqual(sib.status, 'booked'); // 2 + 2 = 4 ≤ 4
  assert.strictEqual(setting(env, 'testi', 'Varattu'), 4);
  assert.strictEqual(post(env, form()).status, 'queued');

  const env2 = fresh();
  post(env2, form()); post(env2, form());
  const three = post(env2, form({ children: [{ name: 'A Lapsi', year: 2020 }, { name: 'B Lapsi', year: 2021 }, { name: 'C Lapsi', year: 2022 }] }));
  assert.strictEqual(three.status, 'queued'); // 2 + 3 = 5 > 4
  assert.strictEqual(rows(env2, 'testi').filter(r => r['Tila'] === 'Jonossa').length, 3);
});

t('sama lähetystunniste palauttaa saman tuloksen eikä tee uutta riviä', () => {
  const env = fresh();
  const f = form();
  const a = post(env, f);
  const b = post(env, f);
  assert.deepStrictEqual(a, b);
  assert.strictEqual(rows(env, 'testi').length, 1);
  env.api.CFG; // välimuistin ohi: tyhjennä välimuisti simuloimalla uutta ympäristöä ei tarvita
});

t('tuplailmoitus samalla sähköpostilla ja nimellä estetään', () => {
  const env = fresh();
  const f = form();
  post(env, f);
  const r = post(env, Object.assign({}, f, { submissionId: 'other-000001' }));
  assert.strictEqual(r.error, 'duplicate');
  const r2 = post(env, Object.assign({}, f, { submissionId: 'other-000002', allowDuplicate: true }));
  assert.strictEqual(r2.ok, true);
});

t('validointi palauttaa kenttäkohtaiset virheet', () => {
  const env = fresh();
  const r = post(env, form({ children: [{ name: 'Aino', year: 2015 }], email: 'x@', phone: '12', postcode: '021', photo: '', terms: false }));
  assert.strictEqual(r.error, 'invalid');
  ['child0Name', 'child0Year', 'email', 'phone', 'postcode', 'photo', 'terms'].forEach(k => assert.ok(r.fields[k], k));
  assert.strictEqual(post(env, form({ children: [1, 2, 3, 4].map(i => ({ name: 'L ' + i, year: 2021 })) })).error, 'invalid');
});

t('kaavat neutraloidaan, puhelin säilyy', () => {
  const env = fresh();
  post(env, form({ notes: '=IMPORTXML("http://x","//a")', guardian: '@Olli Testinen', phone: '+358 40 123 4567' }));
  const r = rows(env, 'testi')[0];
  assert.ok(r['Lisätiedot'].startsWith("'="));
  assert.ok(r['Huoltaja'].startsWith("'@"));
  assert.strictEqual(r['Puhelin'], '+358401234567');
  assert.strictEqual(r['Postinumero'], '02100');
});

t('botit: piilokenttä ja liian nopea lähetys', () => {
  const env = fresh();
  assert.strictEqual(post(env, form({ website: 'spam' })).ok, true);
  assert.strictEqual(post(env, form({ elapsedMs: 1200 })).error, 'too_fast');
  assert.strictEqual(rows(env, 'testi').length, 0);
});

t('eräpäivä: peruutusraja, myöhäinen 3 pv, viimeistään päivä ennen', () => {
  const env = fresh();
  const s = env.api.readCity_('espoo'); // 1. kerta 24.1.2027
  const d = iso => env.api.dueDate_(s, new Date(iso)).toISOString().slice(0, 10);
  assert.strictEqual(d('2026-10-28T18:00:00Z'), '2027-01-17');
  assert.strictEqual(d('2027-01-17T20:00:00Z'), '2027-01-17'); // klo 22 Helsingissä, sama päivä
  assert.strictEqual(d('2027-01-18T10:00:00Z'), '2027-01-21');
  assert.strictEqual(d('2027-01-22T10:00:00Z'), '2027-01-23');
  assert.strictEqual(d('2027-01-24T10:00:00Z'), '2027-01-24');
});

t('vahvistusviestissä eräpäivä, peruutusraja ja genetiivi', () => {
  const env = fresh();
  env.now = new Date('2026-10-28T18:00:05Z');
  const r = post(env, form({ city: 'espoo', host: true }));
  assert.strictEqual(r.dueDate, '17.1.2027'); assert.strictEqual(r.cancelBy, '17.1.2027');
  const m = env.mails[env.mails.length - 1];
  assert.ok(/Espoon ryhmään/.test(m.htmlBody)); assert.ok(/17\.1\.2027/.test(m.htmlBody));
  assert.ok(/Olli soittaa sinulle/.test(m.htmlBody));
  assert.strictEqual(m.name, 'VibeXplorers');
});

t('jonosta tarjous → vahvistus → varattu', () => {
  const env = fresh();
  for (let i = 0; i < 3; i++) post(env, form());
  post(env, form());                       // jonossa 1
  post(env, form());                       // jonossa 2
  // Olli perui yhden: Tila → Peruttu, laskurit päivitetään
  env.sheets['testi'].set(2, env.api.COLS.indexOf('Tila') + 1, 'Peruttu');
  env.api.recountAll();
  assert.strictEqual(env.api.doGet({ parameter: { action: 'status', city: 'testi' } }).state, 'queue'); // jonon ohitus estetty
  const msg = env.api.offerNext_('testi');
  assert.ok(/Paikka tarjottu/.test(msg), msg);
  const offer = env.mails[env.mails.length - 1];
  const token = offer.htmlBody.match(/vahvista#([a-f0-9]{64})/)[1];
  assert.strictEqual(env.api.offerNext_('testi'), 'Ei vapaita paikkoja (3/3).');
  const c = post(env, { action: 'confirm', token });
  assert.strictEqual(c.status, 'booked');
  assert.strictEqual(post(env, { action: 'confirm', token }).status, 'already');
  assert.strictEqual(setting(env, 'testi', 'Varattu'), 3);
  assert.strictEqual(setting(env, 'testi', 'Tarjottu'), 0);
  assert.strictEqual(setting(env, 'testi', 'Jonossa'), 1);
  assert.ok(/Paikka on varattu/.test(env.mails[env.mails.length - 1].subject));
});

t('vanhentunut tarjous siirtyy seuraavalle', () => {
  const env = fresh();
  for (let i = 0; i < 3; i++) post(env, form());
  post(env, form()); post(env, form());
  env.sheets['testi'].set(2, env.api.COLS.indexOf('Tila') + 1, 'Peruttu');
  env.api.recountAll();
  env.api.offerNext_('testi');
  const tok1 = env.mails[env.mails.length - 1].htmlBody.match(/vahvista#([a-f0-9]{64})/)[1];
  env.now = new Date(env.now.getTime() + 49 * 3600 * 1000);
  env.api.expireOffers();
  const states = rows(env, 'testi').map(r => r['Tila']);
  assert.deepStrictEqual(states, ['Peruttu', 'Varattu', 'Varattu', 'Tarjous vanhentui', 'Tarjottu']);
  assert.strictEqual(post(env, { action: 'confirm', token: tok1 }).error, 'expired');
});

t('kiintiö loppu → viesti jonoon, lähtee ajastimella', () => {
  const env = fresh();
  env.quota = 3; // varaus 3 → ei lähetetä
  const r = post(env, form());
  assert.strictEqual(r.status, 'booked');
  assert.strictEqual(env.mails.length, 0);
  const mq = env.sheets['Sähköpostijono'];
  assert.strictEqual(mq.get(2, 5), 'Odottaa');
  env.quota = 100;
  env.api.processMailQueue();
  assert.strictEqual(env.mails.length, 1);
  assert.strictEqual(mq.get(2, 5), 'Lähetetty');
});

t('sähköpostivirhe ei kaada ilmoittautumista', () => {
  const env = fresh();
  env.mailFail = true;
  assert.strictEqual(post(env, form()).status, 'booked');
  assert.strictEqual(env.sheets['Sähköpostijono'].get(2, 5), 'Odottaa');
});

t('rikkinäinen pyyntö', () => {
  const env = fresh();
  assert.strictEqual(env.api.doPost({ postData: { contents: 'not json' } }).error, 'bad_request');
  assert.strictEqual(post(env, form({ submissionId: '-bad' })).error, 'bad_request');
  assert.strictEqual(post(env, { action: 'confirm', token: 'x' }).error, 'invalid_token');
});

console.log(`\n${passed} testiä läpi`);
