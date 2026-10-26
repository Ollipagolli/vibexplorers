/* VibeXplorers – ilmoittautumislomake */
(function () {
  'use strict';
  var sec = document.getElementById('ilmoittaudu');
  if (!sec) return;
  var API = sec.getAttribute('data-api');
  var CITY = sec.getAttribute('data-city');
  var form = sec.querySelector('form');
  var statusEl = sec.querySelector('[data-status]');
  var titleEl = sec.querySelector('[data-title]');
  var btn = form.querySelector('[type=submit]');
  var btnText = btn.querySelector('span');
  var msgEl = form.querySelector('[data-form-msg]');
  var soonNote = form.querySelector('[data-soon-note]');
  var kidsEl = form.querySelector('[data-kids]');
  var addKid = form.querySelector('[data-add-kid]');
  var tpl = document.getElementById('kid-tpl');
  var MAX_KIDS = 3;
  var t0 = Date.now();
  var state = null, opensAt = null, sending = false, subId = newId(), allowDuplicate = false, timer = null;
  var DRAFT = 'vx-draft-' + CITY;
  var CODE = '';
  try { CODE = (new URLSearchParams(location.search).get('ennakko') || '').trim(); } catch (e) { /* vanha selain */ }

  function newId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
  }

  // ---------------------------------------------------------------- lapset
  function kidCount() { return kidsEl.querySelectorAll('.kid').length; }
  function renumber() {
    kidsEl.querySelectorAll('.kid').forEach(function (k, i) {
      k.querySelector('legend').textContent = ['Lapsi', 'Toinen lapsi', 'Kolmas lapsi'][i];
      k.querySelectorAll('[data-k]').forEach(function (el) {
        var f = el.getAttribute('data-k');
        el.id = 'child' + i + f;
        el.name = 'child' + i + f;
        var lab = k.querySelector('[data-for="' + f + '"]');
        if (lab) lab.setAttribute('for', el.id);
        var err = k.querySelector('[data-err="' + f + '"]');
        if (err) { err.id = 'err-child' + i + f; el.setAttribute('aria-describedby', err.id); }
      });
      var rm = k.querySelector('[data-rm]');
      if (rm) rm.hidden = i === 0;
    });
    addKid.hidden = kidCount() >= MAX_KIDS;
  }
  function addChild(focus) {
    if (kidCount() >= MAX_KIDS) return;
    kidsEl.appendChild(tpl.content.cloneNode(true));
    renumber();
    var last = kidsEl.lastElementChild;
    last.querySelector('[data-rm]').addEventListener('click', function () { last.remove(); renumber(); saveDraft(); });
    if (focus) last.querySelector('input').focus();
  }
  addKid.addEventListener('click', function () { addChild(true); });
  addChild(false);

  // ---------------------------------------------------------------- tarkistus
  var years = (sec.getAttribute('data-years') || '').split(',').map(Number);
  function val(name) { var el = form.elements[name]; return el ? String(el.value || '').trim() : ''; }
  function phoneOk(v) {
    var p = v.replace(/[\s\-().]/g, '');
    if (/^00\d+$/.test(p)) p = '+' + p.slice(2);
    return /^\+358\d{6,11}$/.test(p) || /^0\d{6,11}$/.test(p) || /^\+[1-9]\d{6,14}$/.test(p);
  }
  function check(name) {
    var v = val(name), m = '';
    var kid = name.match(/^child(\d)(Name|Year)$/);
    if (kid && kid[2] === 'Name' && (v.length < 3 || v.indexOf(' ') < 0)) m = 'Kirjoita lapsen etu- ja sukunimi.';
    else if (kid && kid[2] === 'Year' && years.indexOf(Number(v)) < 0) m = 'Valitse syntymävuosi.';
    else if (name === 'guardian' && (v.length < 3 || v.indexOf(' ') < 0)) m = 'Kirjoita etu- ja sukunimi.';
    else if (name === 'street' && v.length < 3) m = 'Kirjoita katuosoite.';
    else if (name === 'postcode' && !/^\d{5}$/.test(v)) m = 'Postinumerossa on viisi numeroa.';
    else if (name === 'postCity' && v.length < 2) m = 'Kirjoita postitoimipaikka.';
    else if (name === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) m = v.indexOf('@') < 0 ? 'Tarkista sähköpostiosoite, siitä puuttuu @-merkki.' : 'Tarkista sähköpostiosoite.';
    else if (name === 'phone' && !phoneOk(v)) m = 'Tarkista puhelinnumero, esim. 040 123 4567.';
    else if (name === 'emergencyPhone' && v && !phoneOk(v)) m = 'Tarkista puhelinnumero.';
    else if (name === 'photo' && !form.querySelector('[name=photo]:checked')) m = 'Valitse kyllä tai ei.';
    else if (name === 'terms' && !form.elements.terms.checked) m = 'Hyväksy osallistumisehdot.';
    else if (name === 'privacy' && !form.elements.privacy.checked) m = 'Vahvista, että olet lukenut tietosuojaselosteen.';
    showErr(name, m);
    return !m;
  }
  function showErr(name, m) {
    var err = document.getElementById('err-' + name);
    var el = form.elements[name];
    if (err) err.textContent = m;
    if (el && el.setAttribute) el.setAttribute('aria-invalid', m ? 'true' : 'false');
  }
  function fieldNames() {
    var names = [];
    for (var i = 0; i < kidCount(); i++) names.push('child' + i + 'Name', 'child' + i + 'Year');
    return names.concat(['guardian', 'street', 'postcode', 'postCity', 'email', 'phone', 'emergencyPhone', 'photo', 'terms', 'privacy']);
  }
  form.addEventListener('focusout', function (ev) {
    var n = ev.target && ev.target.name;
    if (n && n !== 'photo' && fieldNames().indexOf(n) >= 0 && (ev.target.value || ev.target.getAttribute('aria-invalid') === 'true')) check(n);
  });
  form.addEventListener('change', function (ev) {
    var n = ev.target && ev.target.name;
    if (n === 'photo' || n === 'terms' || n === 'privacy' || /Year$/.test(n || '')) check(n);
    saveDraft();
  });
  form.addEventListener('input', saveDraft);

  // ---------------------------------------------------------------- luonnos selaimeen
  var SKIP = { terms: 1, privacy: 1, website: 1 };
  function saveDraft() {
    try {
      var d = { kids: kidCount() };
      Array.prototype.forEach.call(form.elements, function (el) {
        if (!el.name || SKIP[el.name]) return;
        if (el.type === 'radio' || el.type === 'checkbox') { if (el.checked) d[el.name] = el.type === 'radio' ? el.value : true; }
        else d[el.name] = el.value;
      });
      localStorage.setItem(DRAFT, JSON.stringify(d));
    } catch (e) { /* ei tallennusta */ }
  }
  function loadDraft() {
    try {
      var d = JSON.parse(localStorage.getItem(DRAFT) || 'null');
      if (!d) return;
      while (kidCount() < Math.min(d.kids || 1, MAX_KIDS)) addChild(false);
      Object.keys(d).forEach(function (k) {
        var el = form.elements[k];
        if (!el || k === 'kids') return;
        if (el.length && el[0] && el[0].type === 'radio') { Array.prototype.forEach.call(el, function (r) { r.checked = r.value === d[k]; }); }
        else if (el.type === 'checkbox') el.checked = !!d[k];
        else el.value = d[k];
      });
    } catch (e) { /* ei luonnosta */ }
  }
  function clearDraft() { try { localStorage.removeItem(DRAFT); } catch (e) { /* */ } }
  loadDraft();

  // ---------------------------------------------------------------- paikkatilanne
  var DAYS = ['su', 'ma', 'ti', 'ke', 'to', 'pe', 'la'];
  function when(d) {
    return DAYS[d.getDay()] + ' ' + d.getDate() + '.' + (d.getMonth() + 1) + '. klo ' + d.getHours() + '.' + String(d.getMinutes()).padStart(2, '0');
  }
  function setState(s) {
    state = s.state;
    opensAt = s.opensAt ? new Date(s.opensAt) : null;
    clearInterval(timer);
    sec.setAttribute('data-state', state);
    if (state === 'soon') {
      titleEl.textContent = opensAt ? 'Ilmoittautuminen aukeaa ' + when(opensAt) + '.' : 'Ilmoittautuminen aukeaa pian.';
      btn.disabled = true;
      if (soonNote) { soonNote.hidden = false; soonNote.textContent = opensAt ? 'Lomakkeen voi lähettää ' + when(opensAt) + ' alkaen.' : 'Lomaketta ei voi vielä lähettää.'; }
      if (opensAt) {
        tick();
        timer = setInterval(tick, 1000);
      } else {
        statusEl.innerHTML = '<b>Avautumisaika julkaistaan pian.</b><br>Voit jo täyttää tiedot valmiiksi. Ne säilyvät tällä laitteella.';
        btnText.textContent = 'Ei vielä auki';
      }
    } else if (state === 'open') {
      if (soonNote) soonNote.hidden = true;
      titleEl.textContent = s.early ? 'Ilmoittaudu ennakkoon.' : 'Ilmoittaudu.';
      statusEl.textContent = (s.early ? 'Syksyn perheille ennen yleistä avautumista. ' : '') + (s.free < 10 ? 'Paikkoja on jäljellä ' + s.free + '.' : 'Mukaan mahtuu.');
      btn.disabled = false; btnText.textContent = 'Ilmoittaudu';
    } else if (state === 'queue') {
      if (soonNote) soonNote.hidden = true;
      titleEl.textContent = 'Ryhmät ovat täynnä.';
      statusEl.textContent = 'Voit liittyä jonoon. Jos paikka vapautuu, saat siitä sähköpostin.';
      btn.disabled = false; btnText.textContent = 'Liity jonoon';
    } else {
      titleEl.textContent = 'Ilmoittautuminen on sulkeutunut.';
      statusEl.innerHTML = 'Kysy vapaista paikoista: <a href="mailto:vibexhq@gmail.com">vibexhq@gmail.com</a>';
      form.hidden = true;
    }
  }
  function tick() {
    var ms = opensAt - Date.now();
    if (ms <= 0) {
      clearInterval(timer);
      statusEl.textContent = 'Aukeaa nyt…';
      // Pieni hajautus, ettei kaikki selaimet kysy samalla sekunnilla.
      setTimeout(loadStatus, 300 + Math.random() * 2500);
      return;
    }
    var s = Math.floor(ms / 1000), d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60), ss = s % 60;
    var left = d > 0 ? d + ' pv ' + h + ' h' : h > 0 ? h + ' h ' + m + ' min' : m + ' min ' + String(ss).padStart(2, '0') + ' s';
    statusEl.innerHTML = '<b>Aikaa avautumiseen ' + left + '.</b><br>Voit jo täyttää tiedot valmiiksi. Ne säilyvät tällä laitteella, ja lomakkeen voi lähettää heti, kun ilmoittautuminen aukeaa.';
    btnText.textContent = 'Aukeaa ' + when(opensAt).replace(/^.. /, '');
  }
  function loadStatus() {
    fetchTimeout(API + '?action=status&city=' + encodeURIComponent(CITY) + (CODE ? '&code=' + encodeURIComponent(CODE) : ''), {}, 20000)
      .then(function (r) { return r.json(); })
      .then(function (s) { if (s.ok) setState(s); else throw new Error(s.error); })
      .catch(function () {
        // Tilanne ei latautunut: lomake toimii silti, palvelin päättää.
        statusEl.textContent = '';
        btn.disabled = false; btnText.textContent = 'Ilmoittaudu';
      });
  }
  loadStatus();

  // ---------------------------------------------------------------- lähetys
  function fetchTimeout(url, opts, ms) {
    var ctrl = window.AbortController ? new AbortController() : null;
    if (ctrl) opts.signal = ctrl.signal;
    var t = setTimeout(function () { if (ctrl) ctrl.abort(); }, ms);
    return fetch(url, opts).finally(function () { clearTimeout(t); });
  }
  function payload() {
    var children = [];
    for (var i = 0; i < kidCount(); i++) children.push({ name: val('child' + i + 'Name'), year: Number(val('child' + i + 'Year')) });
    var photo = form.querySelector('[name=photo]:checked');
    return {
      action: 'register', city: CITY, code: CODE, submissionId: subId, elapsedMs: Date.now() - t0, allowDuplicate: allowDuplicate,
      children: children, guardian: val('guardian'), street: val('street'), postcode: val('postcode'), postCity: val('postCity'),
      email: val('email'), phone: val('phone'), emergencyName: val('emergencyName'), emergencyPhone: val('emergencyPhone'),
      photo: photo ? photo.value : '', notes: val('notes'), source: val('source'),
      terms: form.elements.terms.checked, privacy: form.elements.privacy.checked,
      newsletter: form.elements.newsletter.checked, host: form.elements.host.checked,
      website: val('website')
    };
  }
  function busy(on, text) {
    sending = on;
    btn.disabled = on;
    btn.setAttribute('aria-busy', on ? 'true' : 'false');
    if (text) btnText.textContent = text;
  }
  function say(html, kind) {
    msgEl.innerHTML = html;
    msgEl.className = 'form-msg' + (kind ? ' ' + kind : '');
    msgEl.hidden = !html;
  }

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    if (sending) return;
    say('');
    var bad = fieldNames().filter(function (n) { return !check(n); });
    if (bad.length) {
      var first = form.elements[bad[0]];
      (first && first.focus ? first : form.querySelector('[name=' + bad[0] + ']')).focus();
      say('Muutama kohta puuttuu. Tarkista punaisella merkityt.', 'err');
      return;
    }
    send(1);
  });

  function send(attempt) {
    busy(true, attempt > 1 ? 'Lähetetään… (yritys ' + attempt + ')' : 'Lähetetään…');
    fetchTimeout(API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload()) }, 45000)
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (res.ok) return done(res);
        if (res.retry && attempt < 4) return later(attempt);
        busy(false, state === 'queue' ? 'Liity jonoon' : 'Ilmoittaudu');
        if (res.error === 'invalid' && res.fields) {
          Object.keys(res.fields).forEach(function (k) { showErr(k, res.fields[k]); });
          say('Muutama kohta puuttuu. Tarkista punaisella merkityt.', 'err');
        } else if (res.error === 'duplicate') {
          say(esc(res.message) + ' <button type="button" class="linkbtn" data-dup>Lähetä silti</button>', 'err');
          msgEl.querySelector('[data-dup]').addEventListener('click', function () { allowDuplicate = true; subId = newId(); say(''); send(1); });
        } else if (res.error === 'not_open') {
          say('Ilmoittautuminen ei ole vielä auki.', 'err');
          loadStatus();
        } else {
          say(esc(res.message || 'Jokin meni vikaan. Yritä uudelleen.'), 'err');
          if (res.error === 'too_fast') subId = newId();
        }
      })
      .catch(function () {
        if (attempt < 4) return later(attempt);
        busy(false, 'Yritä uudelleen');
        say('Yhteys katkesi. Tiedot ovat tallessa, joten paina nappia uudelleen. Jos ongelma jatkuu, kirjoita <a href="mailto:vibexhq@gmail.com">vibexhq@gmail.com</a>.', 'err');
      });
  }
  // Sama lähetystunniste: palvelin ei tee tuplailmoitusta, vaikka edellinen yritys olisi mennyt perille.
  function later(attempt) {
    busy(true, 'Ruuhkaa, yritetään uudelleen…');
    setTimeout(function () { send(attempt + 1); }, 1500 * Math.pow(2, attempt - 1) + Math.random() * 1000);
  }

  function done(res) {
    clearDraft();
    clearInterval(timer);
    var kids = res.children > 1 ? 'Lapsille on varattu paikat' : 'Lapselle on varattu paikka';
    var html;
    if (res.status === 'booked') {
      html = '<h3>Paikka on varattu!</h3>' +
        '<p>' + kids + '. Lähetimme vahvistuksen osoitteeseen <b>' + esc(res.email || '') + '</b>. Jos sitä ei näy, kurkkaa roskapostiin.</p>' +
        (res.dueDate ? '<p>Lasku tulee sähköpostilla, eräpäivä <b>' + esc(res.dueDate) + '</b>. Voit perua maksutta ' + esc(res.cancelBy || res.dueDate) + ' asti.</p>' : '') +
        '<p>Ennen kauden alkua lähetämme tervetuloviestin, jossa kerromme ryhmän, ensimmäisen kerran paikan ja muut käytännöt. Nähdään kentän laidalla!</p>';
    } else {
      html = '<h3>Olette jonossa' + (res.queuePosition ? ' sijalla ' + esc(res.queuePosition) : '') + '.</h3>' +
        '<p>Jos paikka vapautuu, lähetämme sähköpostin osoitteeseen <b>' + esc(res.email || '') + '</b>. Vahvistukseen on aikaa 48 tuntia, joten pidäthän silmällä myös roskapostia.</p>' +
        '<p>Jonossa oleminen ei maksa mitään eikä sido mihinkään.</p>';
    }
    form.hidden = true;
    statusEl.textContent = '';
    titleEl.textContent = res.status === 'booked' ? 'Tervetuloa mukaan!' : 'Kiitos!';
    var box = sec.querySelector('[data-done]');
    box.innerHTML = html;
    box.hidden = false;
    box.setAttribute('tabindex', '-1');
    box.focus();
    sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
})();
