#!/usr/bin/env python3
"""VibeXplorers Talvi 2027 – sivugeneraattori (v4, minimal).
Päivitä CITIES ja aja:  python3 build.py"""
import html, json, pathlib

OUT = pathlib.Path(__file__).parent
FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLSe_YJ9dkoUE5K3sF5b0w_JwyZYUpLwiZAT1DXrKAmhbZa-1VA/viewform?usp=publish-editor"
EMAIL = "vibexhq@gmail.com"
# Ilmoittautumisen taustapalvelu (Apps Script /exec): tuotanto ja testitaulukko.
API_URL = "https://script.google.com/macros/s/AKfycbxaE8k7ecQkRbApqkRnJxMLZdKQ932snYAb1148hZ644TEFt3Ra5DZ1m1UEX1Vsi7Tr/exec"
API_TEST_URL = "https://script.google.com/macros/s/AKfycbwpaGGxiNfeCe-fEAa7WxTKQgsAnlOfkSeM9Txe16iZOwWGrtiJBPius-hAwYCuT9dB/exec"
# Kaupungit, joiden sivulla näkyy oma ilmoittautumislomake. Muilla on kiinnostuslista.
REG_CITIES = {"vantaa", "espoo", "tampere"}
OPEN_ORDER = ["Espoo", "Vantaa", "Tampere", "Helsinki"]  # avautumisjärjestys etusivulla
BIRTH_YEARS = [2020, 2021, 2022, 2023]
PRICE = "69 €"  # oletushinta; kaupunkikohtainen hinta CITIES-listassa ("price")

# Seuran nimi -> logo (img/logot/). Lisää uusia seuroja tähän.
LOGOS = {
    "Espoon Jäätaiturit": "esjt.png",
    "Espoon Urheilijat": "esu.png",
    "GrIFK Handboll": "grifk.png",
    "GrIFK Alpine": "grani.png",
    "Olarin Voimistelijat": "ovo.png",
    "Espoon Palloseura": "eps.png",
    "Laaksolahden Sulkapallo": "lasupa.png",
    "Sirkus- ja teatterikoulu Esko": "esko.png",
    # Vantaa
    "Vantaan Voimisteluseura": "vvs.png",
    "Atlas Handball": "atlas.png",
    "Ylä-Tikkurilan Kipinä": "ytk.png",
    "Vantaan Tanssiopisto": "vantaan-tanssiopisto.png",
    "Vanders": "vanders.png",
    "Vantaan Hiihtoseura": "vhs.png",
    "Pakkalan Palloseura": "paps.png",
    "Vantaan Lentopalloseura": "vanle.png",
    # Tampere
    "TATS": "tats.png",
    "Tampereen Pyrintö": "pyrinto.png",
    "Tampereen Hiihtoseura": "tahs.png",
    "KooVee": "koovee.png",
    "Tanssiseura Spiral": "spiral.png",
    "Pakilan Voimistelijat": "pnv.png",
    "Sirkus Magenta": "magenta.png",
    "Helsinki Rugby Club": "hrc.png",
    "Helsingin Tanssiopisto": "htanssiopisto.png",
    "HLK": "hlk.png",
    "Sapa": "sapa.png",
}


def logo_tile(club):
    f = LOGOS.get(club)
    return f'<div class="logo-tile"><img src="img/logot/{f}" alt="{e(club)}" loading="lazy" /></div>' if f else '<div></div>'

# ---- SYKSY 2026 (käynnissä oleva ryhmä) ----
# Kun syksyn ryhmä päättyy, vaihda FALL_ACTIVE = False -> linkit katoavat etusivulta ja valikosta.
FALL_ACTIVE = False
# (viikko, ISO-päivä, laji, seura, paikka, ajankohta, logo)
FALL = [
    (35, "2026-08-26", "Pesäpallo", "Espoon Pesis", "Saunalahden koulun kenttä", "Ke 26.8. klo 17.00–18.00", "pesis.png"),
    (36, "2026-09-02", "Yleisurheilu", "Leppävaaran Sisu", "Leppävaaran urheilupuisto", "Ke 2.9. klo 17.30–18.30", "lesi.png"),
    (37, "2026-09-12", "Teline\u00advoimistelu", "Espoon Telinetaiturit", "Kameleonten-halli, Monikonkatu 8", "La 12.9. klo 14.00–15.00", "telinetaiturit.png"),
    (38, "2026-09-19", "Tennis", "Espoon Tennisseura", "Laaksolahden Tenniskeskus", "La 19.9. klo 9.30–10.30", "ets.png"),
    (39, "2026-09-26", "Judo", "Espoon Urheilijat", "Ruukintie 3", "La 26.9. klo 10.00–11.00", "eu-judo.png"),
    (40, "2026-10-03", "Koripallo", "Espoo Basket Team", "Espoonlahden koulu", "La 3.10. klo 10.00–11.00", "ebt.png"),
    (43, "2026-10-24", "Tanssi", "Espoon Tanssiopisto", "Piispanportti 12 B", "La 24.10. klo 15.00–15.50", "tanssiopisto.png"),
    (44, "2026-10-28", "Salibandy", "Esport Oilers", "Esport Arena, kenttä 6", "Ke 28.10. klo 17.30–18.30", "oilers.png"),
]

# Tulossa olevat kaupungit: oma sivu + rivi etusivulle ilman ohjelmaa
COMING = {
}

# (viikko, laji, seura, paikka, ajankohta) – laji=None => julkistetaan pian
CITIES = {
    "espoo": {
        "name": "Espoo", "full": True, "opens": "ke 28.10. klo 20", "gear": "Luisteluun tarvitaan omat luistimet ja kypärä ja lasketteluun omat varusteet. Lasketteluvarusteet voi vuokrata Granibackenilta 20 eurolla.", "price": "79 €", "hero": "kuva-piiri.jpg", "pos": "50% 45%",
        "weeks": "3–11", "dates": "18.1.–21.3.", "break": 8,
        "sessions": [
            (3, "Luistelu", "Espoon Jäätaiturit", "Genano Arena, Leppävaara", "Su 24.1. klo 12.30–13.15", "Omat luistimet ja kypärä mukaan."),
            (4, "Paini", "Espoon Urheilijat", "Itätuulenkuja 9", "Su 31.1. klo 14 ja 15"),
            (5, "Käsipallo", "GrIFK Handboll", None, "Ke 3.2."),
            (6, "Voimistelu", "Olarin Voimistelijat", "Vanttilan koulu", "To 11.2. klo 17 ja 18"),
            (7, "Laskettelu", "GrIFK Alpine", "Granibacken, Kauniainen", "Ke 17.2. klo 17.30 ja 18.30", "Omat varusteet mukaan. Ne voi myös vuokrata Granibackenilta 20 eurolla."),
            (9, "Jalkapallo", "Espoon Palloseura", "Myntinsyrjän jalkapallohalli, Myntinsyrjä 7", "Su 7.3. klo 13 ja 14"),
            (10, "Sulkapallo", "Laaksolahden Sulkapallo", "Laaksolahden Tenniskeskus", "La 13.3. klo 8 ja 9"),
            (11, "Sirkus", "Sirkus- ja teatterikoulu Esko", "Järvenperän sirkustila, Auroranmäki 1", "La 20.3. klo 15.30 ja 16.30"),
        ],
    },
    "vantaa": {
        "name": "Vantaa", "opens": "ti 3.11. klo 20", "groups": 1, "price": "79 €", "hero": "kuva-stadion.jpg", "pos": "50% 60%",
        "weeks": "4–13", "dates": "25.1.–4.4.", "break": 8, "extra_breaks": [(12, "Pääsiäinen")],
        "sessions": [
            (4, "Voimistelu", "Vantaan Voimisteluseura", "Vetokuja 1 B, Vantaa", "La 30.1. klo 10–11"),
            (5, "Käsipallo", "Atlas Handball", "Kivimäen koulu, Lintukallionkuja 6", "La 6.2. klo 10–11"),
            (6, "Tanssi", "Vantaan Tanssiopisto", "Leinikkitie 20", "La 13.2. klo 10 ja 11"),
            (7, "Uinti", "Vanders", "Myyrmäen uimahalli, Myyrmäen raitti 4", "La 20.2. klo 17–19"),
            (9, "Paini", "Ylä-Tikkurilan Kipinä", "Tikkurilan urheilutalo", "La 6.3. klo 12"),
            (10, "Hiihto", "Vantaan Hiihtoseura", "Hakunilan urheilupuisto", "La 13.3."),
            (11, "Jalkapallo", "Pakkalan Palloseura", None, "La 20.3."),
            (13, "Lentopallo", "Vantaan Lentopalloseura", None, "La 3.4. klo 12.30–13.30"),
        ],
    },
    "tampere": {
        "name": "Tampere", "opens": "su 15.11. klo 20", "hero": "kuva-tennis.jpg", "pos": "50% 62%",
        "weeks": "4–12", "dates": "25.1.–28.3.", "break": 9,
        "sessions": [
            (4, "Tennis", "TATS", "Tampereen tenniskeskus", "La 30.1. klo 10–12"),
            (5, "Luistelu", "KooVee", "Hakametsän jäähalli 3", "Su 7.2. klo 15–16.30"),
            (6, "Padel", "TATS", "Tampereen tenniskeskus", "La 13.2. klo 10–12"),
            (7, "Käsipallo", "KooVee", None, "To 18.2."),
            (8, "Yleisurheilu", "Tampereen Pyrintö", "Pirkkahalli", "La 27.2. klo 11–13"),
            (10, "Hiihto", "Tampereen Hiihtoseura", "Kaupin hiihtoladut", "La 13.3. klo 10–12"),
            (11, "Lentopallo", "Tampereen Pyrintö", None, "Su 21.3."),
            (12, "Tanssi", "Tanssiseura Spiral", "Ikurin liikuntahalli", None),
        ],
    },
    "helsinki": {
        "name": "Helsinki", "groups": 2, "price": "79 €", "hero": "kuva-trampoliini.jpg", "pos": "50% 30%",
        "weeks": "3–11", "dates": "18.1.–21.3.", "break": 8,
        "sessions": [
            (3, None, None, None, None),
            (4, "Voimistelu", "Pakilan Voimistelijat", "PNV liikuntakeskus, Itä-Pakila", "La 30.1. klo 12–13"),
            (5, "Perhesirkus", "Sirkus Magenta", "Itis, Itäkatu 7", "La 6.2. klo 15.15–16"),
            (6, None, None, None, None),
            (7, "Rugby", "Helsinki Rugby Club", None, "La 20.2."),
            (9, "Tanssi", "Helsingin Tanssiopisto", "Leipätehdas, Kaikukatu 4 A", "La 6.3. klo 14.45 ja 15.45"),
            (10, "Jalkapallo", "Sapa", "Haapaniemen kenttä, Haapaniemenkatu 2", "La 13.3. klo 12–13"),
            (11, "Tennis", "HLK", "Meilahden liikuntakeskus", "La 20.3. klo 12 ja 13"),
        ],
    },
}

e = html.escape
ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'


def head(title, desc, path, preload):
    return f"""<!DOCTYPE html>
<html lang="fi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{e(title)}</title>
  <meta name="description" content="{e(desc)}" />
  <meta name="theme-color" content="#0b0b0b" />
  <meta property="og:title" content="{e(title)}" />
  <meta property="og:description" content="{e(desc)}" />
  <meta property="og:image" content="https://vibexplorers.com/share-2027.jpg" />
  <meta property="og:image:type" content="image/jpeg" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="VibeXplorers – Kokeile eri lajeja. Löydä oma juttu." />
  <meta property="og:locale" content="fi_FI" />
  <meta property="og:site_name" content="VibeXplorers" />
  <meta property="og:url" content="https://vibexplorers.com/{path}" />
  <link rel="canonical" href="https://vibexplorers.com/{path}" />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:image" content="https://vibexplorers.com/share-2027.jpg" />
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
  <link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png">
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <link rel="manifest" href="/site.webmanifest">
  <link rel="preload" as="image" href="img/{preload}">
  <link rel="stylesheet" href="style.css?v=8" />
</head>
<body>
"""


def nav(active):
    def li(slug, label):
        cur = ' aria-current="page"' if slug == active else ""
        return f'<li><a href="/{slug}"{cur}>{label}</a></li>'
    return f"""  <nav class="nav" aria-label="Päävalikko">
    <div class="wrap">
      <a href="/" class="logo"><img src="logo.png" alt="" width="32" height="32" /><span>VibeXplorers</span></a>
      <ul>
        {li("syksy", "Syksy<span class=\"yr\"> 2026</span>") if FALL_ACTIVE else ""}{li("espoo", "Espoo")}{li("vantaa", "Vantaa")}{li("tampere", "Tampere")}{li("helsinki", "Helsinki")}
        <li><a href="{'#ilmoittaudu' if active in REG_CITIES else '/#kaupungit'}" class="cta">Ilmoittaudu</a></li>
      </ul>
    </div>
  </nav>
"""


def cta(title, button="Liity listalle", href=None, sub=""):
    link = f'href="{href}"' if href else f'href="{FORM_URL}" target="_blank" rel="noopener noreferrer"'
    return f"""    <section class="sec cta">
      <div class="wrap rv">
        <h2>{title}</h2>
        {sub}<a {link} class="btn">{button} {ARROW}</a>
        <div class="contact">
          <img src="olli.jpg" alt="" width="56" height="56" />
          <div style="text-align:left"><strong>Olli Syrjälä</strong><a href="mailto:{EMAIL}">{EMAIL}</a><a href="tel:+358400854493" class="tel">040 085 4493</a></div>
        </div>
      </div>
    </section>
"""


FOOTER = f"""  <footer>
    <div class="wrap">
      <span>&copy; 2026 VibeXplorers Oy · 3628620-7</span>
      <nav aria-label="Alatunniste">
        <a href="/kokemukset">Kokemuksia</a>
        <a href="/seuroille">Seuroille</a>
        <a href="/syksy">Syksy 2026</a>
        <a href="vibexplorers-osallistumisehdot.pdf" target="_blank" rel="noopener noreferrer">Osallistumisehdot</a>
        <a href="vibexplorers-tietosuojaseloste.pdf" target="_blank" rel="noopener noreferrer">Tietosuoja</a>
        <a href="vibexplorers-saannot.pdf" target="_blank" rel="noopener noreferrer">Säännöt</a>
        <a href="https://www.instagram.com/vibexplorers_/" target="_blank" rel="noopener noreferrer">Instagram</a>
      </nav>
    </div>
  </footer>
  <script>
    (function () {{
      var nav = document.querySelector('.nav');
      var onScroll = function () {{ nav.classList.toggle('solid', window.scrollY > 40); }};
      onScroll(); window.addEventListener('scroll', onScroll, {{ passive: true }});
      var els = document.querySelectorAll('.rv');
      if (!('IntersectionObserver' in window)) {{ els.forEach(function (el) {{ el.classList.add('in'); }}); return; }}
      var io = new IntersectionObserver(function (entries) {{
        entries.forEach(function (en) {{ if (en.isIntersecting) {{ en.target.classList.add('in'); io.unobserve(en.target); }} }});
      }}, {{ rootMargin: '0px 0px -8% 0px' }});
      els.forEach(function (el) {{ io.observe(el); }});
    }})();
  </script>
</body>
</html>
"""


FALL_NOTICE = f'<a href="/syksy" class="notice"><span class="dot"></span>Syksyn ryhmä on käynnissä – katso aikataulu {ARROW}</a>\n      '


def fig(name, cls=""):
    c = f' class="{cls}"' if cls else ""
    return f'<figure{c}><img src="img/{name}" alt="" loading="lazy" /></figure>'


def city_logos(c):
    seen = []
    for s in c["sessions"]:
        if s[2] in LOGOS and LOGOS[s[2]] not in [LOGOS[x] for x in seen]:
            seen.append(s[2])
    if not seen:
        return ""
    return '<div class="mini-logos">' + "".join(f'<span title="{e(n)}"><img src="img/logot/{LOGOS[n]}" alt="{e(n)}" loading="lazy" /></span>' for n in seen) + '</div>'


# ------------------------------------------------------------------ registration
def reg_section(slug, c, api=None):
    api = api or API_URL
    years = "".join(f'<option value="{y}">{y}</option>' for y in BIRTH_YEARS)
    srcs = "".join(f'<option>{x}</option>' for x in ["Kaveri", "Instagram", "Facebook", "Päiväkoti", "Seura", "Muu"])
    def field(name, label, typ="text", ac="", extra="", hint=""):
        h = f'<span class="hint">{hint}</span>' if hint else ""
        return f"""<div class="field"><label for="{name}">{label}</label>{h}<input id="{name}" name="{name}" type="{typ}" autocomplete="{ac}" aria-describedby="err-{name}" {extra}/><span class="err" id="err-{name}" aria-live="polite"></span></div>"""
    return f"""    <section class="sec reg light" id="ilmoittaudu" data-api="{api}" data-city="{slug}" data-years="{','.join(map(str, BIRTH_YEARS))}" data-groups="{c.get('groups', 1) if slug == 'testi' else c.get('groups', 2)}" data-per-group="{3 if slug == 'testi' else 27}">
      <div class="wrap narrow">
        <span class="label">{e(c['name'])} · Talvi 2027</span>
        <h2 data-title>{'Ryhmät ovat täynnä.' if c.get('full') else ('Ilmoittautuminen aukeaa ' + e(c['opens']) + '.' if c.get('opens') else 'Ilmoittaudu.')}</h2>
        <p class="reg-status" data-status aria-live="polite"></p>
        <div class="reg-done" data-done hidden aria-live="polite"></div>
        <form novalidate>
          <div data-kids></div>
          <button type="button" class="linkbtn add" data-add-kid>+ Lisää sisarus</button>

          <fieldset><legend>Huoltaja</legend>
            {field("guardian", "Nimi", ac="name")}
            {field("street", "Katuosoite", ac="street-address", hint="Laskutusta varten")}
            <div class="two">
              {field("postcode", "Postinumero", ac="postal-code", extra='inputmode="numeric" maxlength="5"')}
              {field("postCity", "Postitoimipaikka", ac="address-level2")}
            </div>
            {field("email", "Sähköposti", typ="email", ac="email", extra='inputmode="email"')}
            {field("phone", "Puhelin", typ="tel", ac="tel")}
          </fieldset>

          <fieldset><legend>Varayhteyshenkilö <span class="opt">vapaaehtoinen</span></legend>
            <p class="hint">Kenelle soitamme, jos emme tavoita sinua?</p>
            <div class="two">
              {field("emergencyName", "Nimi", ac="off")}
              {field("emergencyPhone", "Puhelin", typ="tel", ac="off")}
            </div>
          </fieldset>

          <fieldset id="photo" aria-describedby="err-photo"><legend>Saako lapsi näkyä jakamissamme kuvissa?</legend>
            <p class="hint">Otamme lajikerroilta kuvia someen ja verkkosivuille. Kuvaamme niin, etteivät lasten kasvot näy.</p>
            <div class="choice"><label><input type="radio" name="photo" value="yes" /> Kyllä</label><label><input type="radio" name="photo" value="no" /> Ei</label></div>
            <span class="err" id="err-photo" aria-live="polite"></span>
          </fieldset>

          <fieldset><legend>Lisätiedot <span class="opt">vapaaehtoinen</span></legend>
            <div class="field"><label for="notes">Onko jotain, mitä meidän olisi hyvä tietää?</label><span class="hint">Älä kirjaa tähän terveystietoja.</span><textarea id="notes" name="notes" rows="3" maxlength="500"></textarea></div>
            <div class="field"><label for="source">Mistä kuulit meistä?</label><select id="source" name="source"><option value="">Valitse</option>{srcs}</select></div>
          </fieldset>

          <fieldset class="checks"><legend class="sr">Hyväksynnät</legend>
            <label class="check"><input type="checkbox" name="terms" id="terms" aria-describedby="err-terms" /> <span>Hyväksyn <a href="/vibexplorers-osallistumisehdot.pdf" target="_blank" rel="noopener">osallistumisehdot</a> ja <a href="/vibexplorers-saannot.pdf" target="_blank" rel="noopener">tapahtumasäännöt</a>.</span></label>
            <span class="err" id="err-terms" aria-live="polite"></span>
            <label class="check"><input type="checkbox" name="privacy" id="privacy" aria-describedby="err-privacy" /> <span>Olen lukenut <a href="/vibexplorers-tietosuojaseloste.pdf" target="_blank" rel="noopener">tietosuojaselosteen</a>.</span></label>
            <span class="err" id="err-privacy" aria-live="polite"></span>
            <label class="check"><input type="checkbox" name="newsletter" /> <span>Haluan kuulla tulevista kausista sähköpostilla.</span></label>
            <label class="check"><input type="checkbox" name="host" /> <span>Voisin toimia ryhmän VibeXplorers Hostina. <a href="/host" target="_blank" rel="noopener">Mikä on Host?</a></span></label>
          </fieldset>

          <div class="hp" aria-hidden="true"><label for="website">Älä täytä</label><input id="website" name="website" type="text" tabindex="-1" autocomplete="off" /></div>

          <p class="fine">{e(c['gear']) + ' ' if c.get('gear') else ''}Hinta on {c.get('price', PRICE)} / lapsi koko kaudelta (8 kertaa). Lasku tulee sähköpostilla, ja sen eräpäivä on viikko ennen ensimmäistä kertaa. Siihen asti voit perua maksutta.</p>
          <p class="soon-note" data-soon-note hidden></p>
          <div class="form-msg" data-form-msg hidden role="alert"></div>
          <button type="submit" class="btn submit" disabled><span>Ladataan…</span> {ARROW}</button>
        </form>
        <template id="kid-tpl">
          <fieldset class="kid"><legend>Lapsi</legend>
            <div class="field"><label data-for="Name">Lapsen etu- ja sukunimi</label><input data-k="Name" type="text" autocomplete="off" /><span class="err" data-err="Name" aria-live="polite"></span></div>
            <div class="field"><label data-for="Year">Syntymävuosi</label><select data-k="Year"><option value="">Valitse</option>{years}</select><span class="err" data-err="Year" aria-live="polite"></span></div>
            <button type="button" class="linkbtn rm" data-rm hidden>Poista</button>
          </fieldset>
        </template>
      </div>
    </section>
    <script src="/ilmo.js?v=13" defer></script>
"""


def test_page():
    c = {"name": "Testi", "price": "1 €"}
    return head("VibeXplorers – ilmoittautumisen testi", "Testisivu.", "ilmo-testi", "kuva-trampoliini.jpg").replace(
        "<title>", '<meta name="robots" content="noindex, nofollow" />\n  <title>', 1).replace('  <link rel="preload" as="image" href="img/kuva-trampoliini.jpg">\n', '') + nav("") + f"""
  <main style="padding-top:72px">
{reg_section("testi", c, API_TEST_URL)}  </main>
""" + FOOTER


def confirm_page():
    return head("VibeXplorers – vahvista paikka", "Jonotuslistalta tarjotun paikan vahvistus.", "vahvista", "kuva-trampoliini.jpg").replace(
        "<title>", '<meta name="robots" content="noindex, nofollow" />\n  <title>', 1).replace('  <link rel="preload" as="image" href="img/kuva-trampoliini.jpg">\n', '') + nav("") + f"""
  <main style="padding-top:72px">
    <section class="sec reg light" id="vahvista">
      <div class="wrap narrow">
        <span class="label">Jonotuslista</span>
        <h2 data-title>Vahvistetaan paikkaa…</h2>
        <div class="reg-done" data-out aria-live="polite"><p>Hetki…</p></div>
      </div>
    </section>
  </main>
  <script>
  (function () {{
    var t = (location.hash || '').slice(1), out = document.querySelector('[data-out]'), h = document.querySelector('[data-title]');
    function show(title, html) {{ h.textContent = title; out.innerHTML = html; }}
    if (!/^[a-f0-9]{{64}}$/.test(t)) {{ show('Linkki ei toimi.', '<p>Avaa linkki suoraan sähköpostista tai kirjoita <a href="mailto:{EMAIL}">{EMAIL}</a>.</p>'); return; }}
    var tries = 0, apis = ['{API_URL}', '{API_TEST_URL}'], ai = 0;
    function go() {{
      fetch(apis[ai], {{ method: 'POST', headers: {{ 'Content-Type': 'text/plain;charset=utf-8' }}, body: JSON.stringify({{ action: 'confirm', token: t }}) }})
        .then(function (r) {{ return r.json(); }})
        .then(function (r) {{
          if (r.ok && r.status === 'booked') show('Paikka on vahvistettu!', '<p>Tervetuloa mukaan! Vahvistus tulee sähköpostiin, ja lasku lähtee erikseen. Laskun eräpäivä on <b>' + r.dueDate + '</b>.</p>');
          else if (r.ok) show('Paikka on jo vahvistettu.', '<p>Kaikki on kunnossa. Tiedot löytyvät sähköpostistasi.</p>');
          else if (r.retry && tries++ < 3) setTimeout(go, 2000 * tries);
          else if (r.error === 'invalid_token' && ai < apis.length - 1) {{ ai++; go(); }}
          else if (r.error === 'expired') show('Tarjous on vanhentunut.', '<p>Valitettavasti 48 tunnin vahvistusaika ehti umpeutua, ja paikka on tarjottu seuraavalle. Kysy tilannetta: <a href="mailto:{EMAIL}">{EMAIL}</a>.</p>');
          else show('Linkki ei toimi.', '<p>' + (r.message || 'Kirjoita meille') + ' <a href="mailto:{EMAIL}">{EMAIL}</a></p>');
        }})
        .catch(function () {{ if (tries++ < 3) setTimeout(go, 2000 * tries); else show('Yhteys ei toiminut.', '<p>Päivitä sivu hetken päästä.</p>'); }});
    }}
    go();
  }})();
  </script>
""" + FOOTER


def host_page():
    tasks = [
        "Tulet paikalle viimeistään 10 minuuttia ennen alkua, esittäydyt ohjaajille ja kerrot auttavasi tarvittaessa ryhmän kanssa.",
        "Toivotat lapset tervetulleiksi ja kyselet kuulumisia.",
        "Kerrot lapsille, missä ollaan ja mitä tänään kokeillaan.",
        "Otat kuvia ja videoita somea varten. Saat kuvaamiseen erilliset ohjeet.",
        "Lopuksi kiität seuraa ja huolehdit, että vanhemmat saavat tietää, miten lapsi voi jatkaa lajin parissa.",
        "Jaat lapsille tarrat Lajipasseihin. Ensimmäisellä kerralla jaat myös passit.",
    ]
    li = "".join(f"<li>{e(t)}</li>" for t in tasks)
    return head("VibeXplorers Host", "Ryhmän oma vanhempi, joka on mukana jokaisella lajikerralla.", "host", "kuva-trampoliini.jpg").replace(
        '  <link rel="preload" as="image" href="img/kuva-trampoliini.jpg">\n', '') + nav("") + f"""
  <main style="padding-top:72px">
    <section class="sec reg light page">
      <div class="wrap narrow prose">
        <span class="label">Talvi 2027</span>
        <h2>VibeXplorers Host.</h2>
        <p class="lead">Host on yksi ryhmän vanhemmista. Hän on mukana jokaisella lajikerralla ja pitää huolen, että porukalla on hyvä fiilis. Seuran ohjaajat vetävät lajin, ja Host on se tuttu aikuinen, joka kulkee ryhmän mukana lajista toiseen.</p>
        <h3>Mitä Host tekee</h3>
        <ol class="steps">{li}</ol>
        <h3>Mitä tehtävä vaatii</h3>
        <p>Olet mukana kauden kaikilla kahdeksalla lajikerralla, ja oma lapsesi on samassa ryhmässä. Aiempaa kokemusta ei tarvita: saat perehdytyksen ja ohjeet. Tehtävästä maksetaan palkkio jokaiselta pidetyltä kerralta.</p>
        <h3>Kiinnostuitko?</h3>
        <p>Rastita ilmoittautumislomakkeelta kohta ”Voisin toimia ryhmän VibeXplorers Hostina”. Jos olet jo ilmoittautunut, voit kertoa kiinnostuksesta osoitteeseen <a href="mailto:{EMAIL}?subject=VibeXplorers%20Host">{EMAIL}</a>.</p>
        <p>Jokaiseen ryhmään valitaan yksi Host ja tarvittaessa varahost. Olemme yhteydessä kaikkiin kiinnostuneisiin lähempänä kauden alkua.</p>
      </div>
    </section>
  </main>
""" + FOOTER


# ------------------------------------------------------------------ index
def index_page():
    rows = "\n".join(
        f"""        <a href="/{s}" class="city-row rv"{f' data-city="{s}" data-groups="{c.get('groups', 2)}"' if s in REG_CITIES else ''}>
          <div><h3>{c['name']}{' <span class="full-tag">Täynnä</span>' if c.get('full') else ''}</h3>{'<span class="opens">Ryhmät täynnä · liity jonoon</span>' if c.get('full') else (f'<span class="opens">Ilmoittautuminen {c["opens"]} alkaen</span>' if c.get('opens') else '')}{city_logos(c)}</div>
          <span class="when">{c['dates']}2027</span>
          <span class="arrow">{ARROW}</span>
        </a>""" for s, c in CITIES.items()) + "\n" + "\n".join(
        f"""        <a href="/{s}" class="city-row rv soon">
          <div><h3>{c['name']} <span class="soon-tag">Tulossa</span></h3></div>
          <span class="when">Seuraavaksi</span>
          <span class="arrow">{ARROW}</span>
        </a>""" for s, c in COMING.items())
    return head(
        "VibeXplorers – 8 lajin liikkari 4–6-vuotiaille",
        "Kokeile eri lajeja. Löydä oma juttu. 8 lajin liikkari 4–6-vuotiaille – talvi 2027 Espoossa, Vantaalla, Tampereella ja Helsingissä.",
        "", "hero-porukka.jpg") + nav("home") + f"""
  <header class="hero">
    <img src="img/hero-porukka.jpg" alt="Iso porukka lapsia rivissä kentällä ohjaajien edessä" width="1600" height="1200" />
    <div class="wrap">
      {FALL_NOTICE if FALL_ACTIVE else ""}<span class="label">Talvi 2027 · Espoo · Vantaa · Tampere · Helsinki</span>
      <h1>Kokeile eri lajeja.<br><span class="o">Löydä oma juttu.</span></h1>
      <p>8 lajin liikkari 4–6-vuotiaille.</p>
      <div class="actions">
        <a href="#kaupungit" class="btn">Valitse kaupunki {ARROW}</a>
      </div>
    </div>
  </header>

  <main>
{proof_strip()}
    <section class="sec">
      <div class="wrap">
        <div class="head rv">
          <div>
            <h2 class="statement">8 lajia. Yksi porukka.</h2>
            <p class="sub">Joka viikko uusi laji paikallisen seuran ohjaamana. Ei aiempaa kokemusta, ei sitoutumista.</p>
          </div>
        </div>
        <div class="bento rv">
          {fig("kuva-judo.jpg", "t")}{fig("kuva-trampoliini.jpg")}{fig("kuva-maila.jpg", "t")}{fig("kuva-lahtoviiva.jpg")}{fig("kuva-pituushyppy.jpg")}{fig("kuva-piiri.jpg")}
        </div>
      </div>
    </section>

    <section class="sec" id="kaupungit" style="padding-top:0">
      <div class="wrap">
        <div class="head rv"><div><span class="label">Talvi 2027</span><h2 class="statement" style="margin-top:.8rem">Valitse kaupunki.</h2></div></div>
        <div class="cities">
{rows}
        </div>
      </div>
    </section>

    <section class="sec light">
      <div class="wrap split">
        <div class="rv">
          <span class="label">Lajipassi</span>
          <h2 class="statement" style="margin-top:.8rem">Tarra jokaisesta kokeilusta.</h2>
          <p class="sub">Ei siksi, että olisi paras. Vaan siksi, että uskalsi kokeilla.</p>
        </div>
        <div class="passi-img rv"><span class="sticker"><span>Rohkea kokeilija</span></span><img src="img/lajipassi-kansi.jpg" alt="VibeXplorers Lajipassi" width="638" height="900" loading="lazy" /></div>
      </div>
    </section>

{cta("Ilmoittaudu talven ryhmiin.", "Valitse kaupunki", "#kaupungit")}  </main>
{LIVE_STATUS_JS}

""" + FOOTER


# ------------------------------------------------------------------ city
def row(s):
    wk, sport, club, place, time = s[:5]
    gear = f'<div class="gear">{e(s[5])}</div>' if len(s) > 5 else ""
    if not sport:
        return f"""        <div class="row tba"><div class="wk">Viikko<b>{wk}</b></div><div><h3>Julkistetaan pian</h3></div><div class="time"></div><div class="place"></div><div></div></div>"""
    return f"""        <div class="row"><div class="wk">Viikko<b>{wk}</b></div><div><h3>{e(sport)}</h3><div class="club">{e(club)}</div>{gear}</div><div class="time">{e(time) if time else "Aika tarkentuu"}</div><div class="place">{e(place) if place else "Paikka tarkentuu"}</div>{logo_tile(club)}</div>"""


def city_page(slug, c):
    items = list(c["sessions"])
    rows = []
    breaks = ([(c["break"], "Hiihtoloma")] if c["break"] else []) + list(c.get("extra_breaks", []))
    for s in sorted(items + [(w, ("__break", label)) for w, label in breaks], key=lambda x: x[0]):
        if len(s) == 2:
            rows.append(f'        <div class="row off"><div class="wk">Viikko<b>{s[0]}</b></div><div><h3>{s[1][1]}</h3></div><div></div><div></div><div></div></div>')
        else:
            rows.append(row(s))
    allc = {**CITIES, **COMING}
    others = " · ".join(f'<a href="/{s}" style="color:var(--white);font-weight:700">{allc[s]["name"]}</a>' for s in allc if s != slug)
    return head(
        f"VibeXplorers {c['name']} – Talvi 2027",
        f"8 lajin liikkari 4–6-vuotiaille, {c['name']}, talvi 2027.",
        slug, c["hero"]) + nav(slug) + f"""
  <header class="hero city-hero">
    <img src="img/{c['hero']}" alt="" style="object-position:{c['pos']}" />
    <div class="wrap">
      <span class="label">Talvi 2027 · {c['dates']}2027</span>
      <h1>{c['name']}</h1>
      <div class="facts"><span>4–6-vuotiaat</span><span>Viikot {c['weeks']}</span>{f'<span>{c.get("groups", 2)} {"ryhmä" if c.get("groups", 2) == 1 else "ryhmää"}</span>' if c.get("groups", 2) else ''}<span><b>{c.get('price', PRICE)}</b> / kausi</span>{'<span class="full-tag">Ryhmät täynnä</span>' if c.get('full') else (f'<span data-opens-fact>Ilmoittautuminen {e(c["opens"])}</span>' if c.get('opens') and slug in REG_CITIES else '')}</div>
    </div>
  </header>

  <main>
    <section class="sec light">
      <div class="wrap">
        <div class="head rv"><h2 class="statement">Talven lajit.</h2></div>
        <div class="program rv">
{chr(10).join(rows)}
        </div>
        <p class="note">{"Kaikki 8 lajia on varmistettu." if all(s[1] for s in c["sessions"]) else "Ohjelma täydentyy."} Ryhmäkohtaiset ajat lähetetään ilmoittautuneille.</p>
      </div>
    </section>

{reg_section(slug, c) if slug in REG_CITIES else (cta(c["name"] + " on täynnä.", "Jonotuslistalle") if c.get("full") else cta("Talven ryhmät aukeavat pian."))}
    <p style="text-align:center;color:var(--grey);margin:-3rem 0 5rem">Myös {others}</p>
  </main>

""" + FOOTER




LIVE_STATUS_JS = """  <script>
  /* Kaupunkilistan tilanne: auki / ryhmä täynnä / jonoon. Jos haku epäonnistuu, staattinen teksti jää. */
  (function () {
    var API = '__API__', PER = 27;
    document.querySelectorAll('.city-row[data-city]').forEach(function (row) {
      var el = row.querySelector('.opens'), g = Number(row.getAttribute('data-groups')) || 1;
      if (!el || !window.fetch) return;
      fetch(API + '?action=status&city=' + row.getAttribute('data-city')).then(function (r) { return r.json(); }).then(function (s) {
        if (!s.ok) return;
        if (s.state === 'open') {
          var full = g > 1 && (g * PER - s.free) >= PER;
          el.textContent = full ? 'Ilmoittautuminen auki · 1. ryhmä täynnä' : 'Ilmoittautuminen auki';
        } else if (s.state === 'queue') {
          el.textContent = 'Ryhmät täynnä · liity jonoon';
        } else if (s.state === 'closed') {
          el.textContent = 'Ilmoittautuminen päättynyt';
        }
      }).catch(function () {});
    });
  })();
  </script>""".replace("__API__", API_URL)

# ------------------------------------------------------------------ kokemukset
KOKEMUKSET = json.loads((OUT / "kokemukset.json").read_text(encoding="utf-8"))
QUOTE_SVG = '<svg class="qmark" viewBox="0 0 32 24" aria-hidden="true"><path d="M0 24V14C0 6 4 1.5 12 0l1.6 3.4C9 4.8 7 7.5 6.8 11H12v13H0zm19 0V14c0-8 4-12.5 12-14l1.6 3.4C28 4.8 26 7.5 25.8 11H31v13H19z" fill="currentColor"/></svg>'
SEASON_LABEL = {"syksy-2026": "syksy 2026"}


def quotes(kind, season=None):
    return [q for q in KOKEMUKSET["quotes"] if q["type"] == kind and (season is None or q["season"] == season)]


def stat_items(season, items=None):
    st = KOKEMUKSET["stats"][season]["items"]
    if items is not None:
        st = [st[i] for i in items]
    return "".join(f'<div class="stat"><b>{e(x["value"])}</b><span>{e(x["label"])}</span></div>' for x in st)


def proof_strip():
    """Etusivun nauha heti heron alla: luvut, yksi sitaatti ja linkki kokemuksiin."""
    season = "syksy-2026"
    q = next(x for x in quotes("vanhempi", season) if x.get("front"))
    return f"""    <section class="proof">
      <div class="wrap">
        <div class="stats rv">{stat_items(season)}</div>
        <figure class="proof-quote rv">{QUOTE_SVG}<blockquote>{e(q["text"])}</blockquote>
          <figcaption>Vanhempi, {e(q["city"])}, {SEASON_LABEL[season]} · <a href="/kokemukset">Lue lisää kokemuksista {ARROW}</a></figcaption></figure>
        <p class="footnote">{e(KOKEMUKSET["stats"][season]["footnote"])}</p>
      </div>
    </section>
"""


def kokemukset_page():
    season = "syksy-2026"
    parents = "".join(f"""          <figure class="qcard">{QUOTE_SVG}<blockquote>{e(q["text"])}</blockquote><figcaption>Vanhempi, {e(q["city"])}, {SEASON_LABEL[q["season"]]}</figcaption></figure>
""" for q in quotes("vanhempi", season))
    kids = "".join(f'<li class="bubble">{e(q["text"])}</li>' for q in quotes("lapsi", season))
    clubs = "".join(f"""          <figure class="qcard club">
            <div class="club-head"><span class="logo-tile"><img src="img/logot/{q["logo"]}" alt="{e(q["author"])}" loading="lazy" /></span><strong>{e(q["author"])}</strong></div>
            <blockquote>{e(q["text"])}</blockquote>{f'<p class="club-note">{e(q["note"])}</p>' if q.get("note") else ''}
          </figure>
""" for q in quotes("seura", season))
    wall = "".join(f'<span class="logo-tile" title="{e(club)}"><img src="img/logot/{logo}" alt="{e(club)}" loading="lazy" /></span>'
                   for _wk, _d, _sport, club, _place, _time, logo in FALL)
    # (hinta/tila, aukeamisteksti, napin teksti) – päivitä kun tilanne muuttuu
    city_cards = {
        "espoo": ("Täynnä", "", "Ilmoittaudu jonoon"),
        "helsinki": ("79 € / kausi", "Ilmoittautuminen aukeaa myöhemmin", "Katso ohjelma"),
        "vantaa": ("Lauantaisin 30.1.–3.4. · 79 €", "", "Ilmoittaudu"),
        "tampere": ("69 € / kausi", "Ilmoittautuminen aukeaa su 15.11. klo 20", "Katso ohjelma"),
    }
    order = ["espoo", "helsinki", "vantaa", "tampere"]
    cards = "".join(f"""          <a href="/{slug}{'#ilmoittaudu' if slug in REG_CITIES else ''}" class="ccard"{f' data-city="{slug}" data-groups="{CITIES[slug].get("groups", 2)}"' if slug in REG_CITIES and slug != 'espoo' else ''}>
            <h3>{CITIES[slug]['name']}</h3><span class="ccard-meta">{e(city_cards[slug][0])}</span><span class="opens">{e(city_cards[slug][1])}</span>
            <span class="ccard-btn">{e(city_cards[slug][2])} {ARROW}</span>
          </a>
""" for slug in order)
    return head(
        "Kokemuksia | VibeXplorers – 8 lajin liikkari 4–6-vuotiaille",
        "Mitä perheet ja seurat sanoivat ensimmäisestä kaudesta Espoossa.",
        "kokemukset", "hero-porukka.jpg") + nav("") + f"""
  <header class="hero city-hero story-hero">
    <img src="img/hero-porukka.jpg" alt="Syksyn 2026 VibeXplorers-ryhmä rivissä kentällä ohjaajien edessä, lasten kasvot sumennettu" style="object-position:50% 55%" />
    <div class="wrap">
      <span class="label">Syksy 2026 · Espoo</span>
      <h1>Ensimmäinen kausi takana. <span class="o">Tältä se tuntui.</span></h1>
      <p>Syksyllä 2026 Espoossa 28 lasta kokeili kahdeksaa lajia kahdeksassa paikallisessa seurassa. Kysyimme perheiltä ja seuroilta, miten meni.</p>
    </div>
  </header>

  <main>
    <section class="sec proof big">
      <div class="wrap">
        <div class="stats rv">{stat_items(season)}</div>
        <p class="footnote">{e(KOKEMUKSET["stats"][season]["footnote"])}</p>
      </div>
    </section>

    <section class="sec light">
      <div class="wrap">
        <div class="head rv"><h2 class="statement">Vanhemmat kertovat.</h2></div>
        <div class="qgrid rv">
{parents}        </div>
      </div>
    </section>

    <section class="sec light kids">
      <div class="wrap">
        <div class="head rv"><h2 class="statement">Mitä lapselle jäi mieleen?</h2></div>
        <ul class="bubbles rv">{kids}</ul>
      </div>
    </section>

    <section class="sec">
      <div class="wrap">
        <div class="head rv"><h2 class="statement">Seurat kertovat.</h2></div>
        <div class="qgrid two rv">
{clubs}        </div>
        <p class="clubs-note rv">{e(KOKEMUKSET["clubStats"][season].get("clubsNote", ""))}</p>
        <div class="partners rv" style="margin-top:clamp(3rem,6vw,5rem)">
          <span class="label">Kiitos syksyn seuroille</span>
          <div class="partner-grid wall">{wall}</div>
        </div>
      </div>
    </section>

    <section class="sec light" id="talvi">
      <div class="wrap">
        <div class="head rv"><h2 class="statement">Talvi 2027 – <span class="o">mukaan ehtii vielä.</span></h2></div>
        <div class="ccards rv">
{cards}        </div>
      </div>
    </section>

    <section class="sec cta">
      <div class="wrap rv">
        <h2>Lapsen ei tarvitse vielä tietää, mikä on oma laji.</h2>
        <a href="/#kaupungit" class="btn">Valitse kaupunki {ARROW}</a>
      </div>
    </section>
  </main>
{LIVE_STATUS_JS.replace("'.city-row[data-city]'", "'.ccard[data-city]'")}
""" + FOOTER

def seuroille_page():
    season = "syksy-2026"
    cs = KOKEMUKSET["clubStats"][season]
    r, nh = cs["rating"], cs["newHobbies"]
    mx = max(nh["bySport"].values())
    bars = "".join(f'<li><span class="bs-name">{e(k)}</span><span class="bs-bar"><i style="width:{v / mx * 100:.0f}%"></i></span><b>{v}</b></li>'
                   for k, v in nh["bySport"].items())
    clubs = "".join(f"""          <figure class="qcard club">
            <div class="club-head"><span class="logo-tile"><img src="img/logot/{q["logo"]}" alt="{e(q["author"])}" loading="lazy" /></span><strong>{e(q["author"])}</strong></div>
            <blockquote>{e(q["text"])}</blockquote>{f'<p class="club-note">{e(q["note"])}</p>' if q.get("note") else ''}
          </figure>
""" for q in quotes("seura", season))
    wall = "".join(f'<span class="logo-tile" title="{e(club)}"><img src="img/logot/{logo}" alt="{e(club)}" loading="lazy" /></span>'
                   for _wk, _d, _sport, club, _place, _time, logo in FALL)
    return head(
        "Seuroille | VibeXplorers – 8 lajin liikkari 4–6-vuotiaille",
        "VibeXplorers tuo 4–6-vuotiaiden ryhmän seuranne kokeilukerralle. Syksyn 2026 seurojen kokemukset ja tulokset.",
        "seuroille", "kuva-trampoliini.jpg") + nav("") + f"""
  <header class="hero city-hero story-hero">
    <img src="img/kuva-trampoliini.jpg" alt="Lapsi hyppää trampoliinilla telinevoimistelukerralla, kasvot sumennettu" style="object-position:50% 50%" />
    <div class="wrap">
      <span class="label">Seuroille</span>
      <h1>Uudet kokeilijat <span class="o">suoraan teidän tiloihin.</span></h1>
      <p>Tuomme 4–6-vuotiaiden ryhmän seuranne kokeilukerralle. Te ohjaatte lajin, me hoidamme ilmoittautumiset, viestinnän ja ryhmän paikalle.</p>
    </div>
  </header>

  <main>
    <section class="sec proof big">
      <div class="wrap">
        <div class="club-stats rv">
          <div>
            <div class="stat"><b>{e(r["value"])}</b><span>{e(r["label"])}</span></div>
            <p class="footnote">{e(r["footnote"])}</p>
          </div>
          <div>
            <div class="stat"><b>{e(nh["value"])}</b><span>{e(nh["label"])}</span></div>
            <ul class="bysport">{bars}</ul>
            <p class="footnote">{e(nh["footnote"])}</p>
          </div>
        </div>
      </div>
    </section>

    <section class="sec" style="border-top:0;padding-top:clamp(1rem,3vw,2rem)">
      <div class="wrap">
        <div class="head rv"><h2 class="statement">Seurat kertovat.</h2></div>
        <div class="qgrid two rv">
{clubs}        </div>
        <p class="clubs-note rv">{e(KOKEMUKSET["clubStats"][season].get("clubsNote", ""))}</p>
        <div class="partners rv" style="margin-top:clamp(3rem,6vw,5rem)">
          <span class="label">Syksyn 2026 seurat</span>
          <div class="partner-grid wall">{wall}</div>
        </div>
      </div>
    </section>

    <section class="sec cta">
      <div class="wrap rv">
        <h2>Tuo lajisi mukaan.</h2>
        <p class="sub" style="margin:1rem auto 2rem">Ota yhteyttä: <a href="mailto:{EMAIL}" style="color:var(--white);font-weight:700">{EMAIL}</a> · <a href="tel:+358400854493" style="color:var(--white);font-weight:700">040 085 4493</a></p>
        <a href="mailto:{EMAIL}?subject=Seurayhteisty%C3%B6" class="btn">Ota yhteyttä {ARROW}</a>
      </div>
    </section>
  </main>

""" + FOOTER


def fall_page():
    """Arkistoitu syksyn 2026 kausi: staattinen, ei "seuraavaksi"-merkintöjä."""
    rows = "\n".join(
        f"""        <div class="row"><div class="wk">Viikko<b>{wk}</b></div><div><h3>{e(sport)}</h3><div class="club">{e(club)}</div></div><div class="time">{e(time)}</div><div class="place">{e(place)}</div><div class="logo-tile"><img src="img/logot/{logo}" alt="{e(club)}" loading="lazy" /></div></div>"""
        for wk, d, sport, club, place, time, logo in FALL)
    return head(
        "VibeXplorers Espoo – Syksy 2026",
        "Ensimmäinen VibeXplorers-kausi Espoossa syksyllä 2026: 8 lajia ja 8 paikallista seuraa.",
        "syksy", "kuva-judo.jpg") + nav("") + f"""
  <header class="hero city-hero fall-hero">
    <img src="img/kuva-judo.jpg" alt="" style="object-position:50% 70%" />
    <div class="wrap">
      <span class="label">Espoo · 26.8.–28.10.2026</span>
      <h1>Syksy 2026</h1>
      <div class="facts"><span>Ensimmäinen kausi</span><span>8 lajia</span><span>8 seuraa</span></div>
    </div>
  </header>

  <main>
    <section class="sec light">
      <div class="wrap">
        <div class="head rv"><h2 class="statement">Näitä kokeiltiin.</h2></div>
        <div class="program fall">
{rows}
        </div>
        <p class="note">Kiitos kaikille perheille ja seuroille ensimmäisestä kaudesta!</p>
      </div>
    </section>

    <section class="sec cta">
      <div class="wrap rv">
        <h2>Seuraavaksi talvi 2027.</h2>
        <a href="/#kaupungit" class="btn">Valitse kaupunki {ARROW}</a>
      </div>
    </section>
  </main>

""" + FOOTER


def coming_page(slug, c):
    name = c["name"]
    others = " · ".join(f'<a href="/{s}" style="color:var(--white);font-weight:700">{CITIES[s]["name"]}</a>' for s in CITIES)
    return head(
        f"VibeXplorers {name} – tulossa",
        f"VibeXplorers on tulossa {c['ill']}. 8 lajin liikkari 4–6-vuotiaille paikallisten seurojen kanssa. Liity listalle.",
        slug, c["hero"]) + nav(slug) + f"""
  <header class="hero city-hero">
    <img src="img/{c['hero']}" alt="" style="object-position:{c['pos']}" />
    <div class="wrap">
      <span class="label">Tulossa</span>
      <h1>{name}</h1>
      <div class="facts"><span>4–6-vuotiaat</span><span>8 lajia</span><span>Paikalliset seurat</span></div>
    </div>
  </header>

  <main>
    <section class="sec">
      <div class="wrap split" style="align-items:start">
        <div class="rv">
          <h2 class="statement">{name} on seuraava.</h2>
          <p class="sub">Kokoamme parhaillaan {c['gen']} ensimmäistä ohjelmaa. Liity listalle, niin kuulet ensimmäisenä, kun lajit ja ryhmät varmistuvat.</p>
          <div style="margin-top:2rem"><a href="{FORM_URL}" target="_blank" rel="noopener noreferrer" class="btn">Liity listalle {ARROW}</a></div>
        </div>
        <div class="rv">
          <span class="label">Seuroille</span>
          <h2 class="statement" style="margin-top:.8rem;font-size:clamp(1.8rem,3.6vw,2.8rem)">Tuo lajisi mukaan.</h2>
          <p class="sub">Etsimme {c['ela']} seuroja, jotka haluavat esitellä lajiaan uusille perheille.</p>
          <div style="margin-top:2rem"><a href="mailto:{EMAIL}?subject=Seurayhteisty%C3%B6%20{name}" class="btn ghost">Ota yhteyttä {ARROW}</a></div>
        </div>
      </div>
    </section>
    <p style="text-align:center;color:var(--grey);margin:0 0 5rem">Talvi 2027: {others}</p>
  </main>

""" + FOOTER


if __name__ == "__main__":
    for slug, c in COMING.items():
        (OUT / f"{slug}.html").write_text(coming_page(slug, c), encoding="utf-8")
    (OUT / "kokemukset.html").write_text(kokemukset_page(), encoding="utf-8")
    (OUT / "seuroille.html").write_text(seuroille_page(), encoding="utf-8")
    (OUT / "syksy.html").write_text(fall_page(), encoding="utf-8")  # arkistoitu kausi, ei valikossa
    (OUT / "index.html").write_text(index_page(), encoding="utf-8")
    for slug, c in CITIES.items():
        (OUT / f"{slug}.html").write_text(city_page(slug, c), encoding="utf-8")
    (OUT / "ilmo-testi.html").write_text(test_page(), encoding="utf-8")
    (OUT / "vahvista.html").write_text(confirm_page(), encoding="utf-8")
    (OUT / "host.html").write_text(host_page(), encoding="utf-8")
    print("built")
