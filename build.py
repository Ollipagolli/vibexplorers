#!/usr/bin/env python3
"""VibeXplorers Talvi 2027 – sivugeneraattori (v4, minimal).
Päivitä CITIES ja aja:  python3 build.py"""
import html, pathlib

OUT = pathlib.Path(__file__).parent
FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLSe_YJ9dkoUE5K3sF5b0w_JwyZYUpLwiZAT1DXrKAmhbZa-1VA/viewform?usp=publish-editor"
EMAIL = "vibexhq@gmail.com"
PRICE = "69 €"

# Seuran nimi -> logo (img/logot/). Lisää uusia seuroja tähän.
LOGOS = {
    "Espoon Jäätaiturit": "esjt.png",
    "Espoon Urheilijat": "esu.png",
    "GrIFK Handboll": "grifk.png",
    "Olarin Voimistelijat": "ovo.png",
    "Espoon Palloseura": "eps.png",
    "Espoon Tennisseura": "ets.png",
    "Sirkus- ja teatterikoulu Esko": "esko.png",
    # Vantaa
    "Vantaan Voimisteluseura": "vvs.png",
    "Atlas Handball": "atlas.png",
    "Ylä-Tikkurilan Kipinä": "ytk.png",
    # Tampere
    "TATS": "tats.png",
    "Tampereen Pyrintö": "pyrinto.png",
    "Tampereen Hiihtoseura": "tahs.png",
}


def logo_tile(club):
    f = LOGOS.get(club)
    return f'<div class="logo-tile"><img src="img/logot/{f}" alt="{e(club)}" loading="lazy" /></div>' if f else '<div></div>'

# ---- SYKSY 2026 (käynnissä oleva ryhmä) ----
# Kun syksyn ryhmä päättyy, vaihda FALL_ACTIVE = False -> linkit katoavat etusivulta ja valikosta.
FALL_ACTIVE = True
# (viikko, ISO-päivä, laji, seura, paikka, ajankohta, logo)
FALL = [
    (35, "2026-08-26", "Pesäpallo", "Espoon Pesis", "Saunalahden koulun kenttä", "Ke 26.8. klo 17.00–18.00", "pesis.png"),
    (36, "2026-09-02", "Yleisurheilu", "Leppävaaran Sisu", "Leppävaaran urheilupuisto", "Ke 2.9. klo 17.30–18.30", "lesi.png"),
    (37, "2026-09-12", "Telinevoimistelu", "Espoon Telinetaiturit", "Kameleonten-halli, Monikonkatu 8", "La 12.9. klo 14.00–15.00", "telinetaiturit.png"),
    (38, "2026-09-19", "Tennis", "Espoon Tennisseura", "Laaksolahden Tenniskeskus", "La 19.9. klo 9.30–10.30", "ets.png"),
    (39, "2026-09-26", "Judo", "Espoon Urheilijat", "Ruukintie 3", "La 26.9. klo 10.00–11.00", "eu-judo.png"),
    (40, "2026-10-03", "Koripallo", "Espoo Basket Team", "Espoonlahden koulu", "La 3.10. klo 10.00–11.00", "ebt.png"),
    (43, "2026-10-24", "Tanssi", "Espoon Tanssiopisto", "Piispanportti 12 B", "La 24.10. klo 15.00–15.50", "tanssiopisto.png"),
    (44, "2026-10-28", "Salibandy", "Esport Oilers", "Esport Arena, kenttä 6", "Ke 28.10. klo 17.30–18.30", "oilers.png"),
]

# (viikko, laji, seura, paikka, ajankohta) – laji=None => julkistetaan pian
CITIES = {
    "espoo": {
        "name": "Espoo", "hero": "kuva-judo.jpg", "pos": "50% 70%",
        "weeks": "3–11", "dates": "18.1.–21.3.", "break": 8,
        "sessions": [
            (3, "Luistelu", "Espoon Jäätaiturit", None, "Su 24.1. klo 12.30–13.15"),
            (4, "Paini", "Espoon Urheilijat", None, "Su 31.1. klo 14–16"),
            (5, "Käsipallo", "GrIFK Handboll", None, "Ke 3.2."),
            (6, None, None, None, None),
            (7, "Voimistelu", "Olarin Voimistelijat", None, "Ke 17.2."),
            (9, "Jalkapallo", "Espoon Palloseura", None, None),
            (10, "Sulkapallo", "Espoon Tennisseura", None, "La 13.3. klo 8–10"),
            (11, "Sirkus", "Sirkus- ja teatterikoulu Esko", None, None),
        ],
    },
    "vantaa": {
        "name": "Vantaa", "hero": "kuva-stadion.jpg", "pos": "50% 60%",
        "weeks": "4–11", "dates": "25.1.–21.3.", "break": None,
        "sessions": [
            (4, "Voimistelu", "Vantaan Voimisteluseura", "Vetokuja 1 B, Vantaa", "La 30.1. klo 10–11"),
            (5, "Käsipallo", "Atlas Handball", "Kivimäen koulu", "La 6.2. klo 10–11"),
            (6, None, None, None, None),
            (7, None, None, None, None),
            (8, None, None, None, None),
            (9, "Paini", "Ylä-Tikkurilan Kipinä", "Tikkurilan urheilutalo", "La 6.3. klo 12"),
            (10, None, None, None, None),
            (11, None, None, None, None),
        ],
    },
    "tampere": {
        "name": "Tampere", "hero": "kuva-tennis.jpg", "pos": "50% 62%",
        "weeks": "4–12", "dates": "25.1.–28.3.", "break": 9,
        "sessions": [
            (4, "Tennis", "TATS", "Tampereen tenniskeskus", None),
            (5, "Yleisurheilu", "Tampereen Pyrintö", None, "Ke 3.2. klo 17"),
            (6, "Padel", "TATS", "Tampereen tenniskeskus", None),
            (7, "Yleisurheilu", "Tampereen Pyrintö", None, "Ke 17.2."),
            (8, None, None, None, None),
            (10, "Hiihto", "Tampereen Hiihtoseura", "Kaupin hiihtoladut", "La 13.3. klo 10–12"),
            (11, None, None, None, None),
            (12, None, None, None, None),
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
  <meta property="og:image" content="https://vibexplorers.com/share-image.jpg" />
  <meta property="og:url" content="https://vibexplorers.com/{path}" />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="summary_large_image" />
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
  <link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png">
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <link rel="manifest" href="/site.webmanifest">
  <link rel="preload" as="image" href="img/{preload}">
  <link rel="stylesheet" href="style.css" />
</head>
<body>
"""


def nav(active):
    def li(slug, label):
        cur = ' aria-current="page"' if slug == active else ""
        return f'<li><a href="{slug}.html"{cur}>{label}</a></li>'
    return f"""  <nav class="nav" aria-label="Päävalikko">
    <div class="wrap">
      <a href="index.html" class="logo"><img src="logo.png" alt="" width="32" height="32" /><span>VibeXplorers</span></a>
      <ul>
        {li("syksy", "Syksy<span class=\"yr\"> 2026</span>") if FALL_ACTIVE else ""}{li("espoo", "Espoo")}{li("vantaa", "Vantaa")}{li("tampere", "Tampere")}
        <li><a href="{FORM_URL}" class="cta" target="_blank" rel="noopener noreferrer">Liity listalle</a></li>
      </ul>
    </div>
  </nav>
"""


def cta(title):
    return f"""    <section class="sec cta">
      <div class="wrap rv">
        <h2>{title}</h2>
        <a href="{FORM_URL}" target="_blank" rel="noopener noreferrer" class="btn">Liity listalle {ARROW}</a>
        <div class="contact">
          <img src="olli.jpg" alt="" width="56" height="56" />
          <div style="text-align:left"><strong>Olli Syrjälä</strong><a href="mailto:{EMAIL}">{EMAIL}</a></div>
        </div>
      </div>
    </section>
"""


FOOTER = f"""  <footer>
    <div class="wrap">
      <span>&copy; 2026 VibeXplorers Oy · 3628620-7</span>
      <nav aria-label="Alatunniste">
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


FALL_NOTICE = f'<a href="syksy.html" class="notice"><span class="dot"></span>Syksyn ryhmä on käynnissä – katso aikataulu {ARROW}</a>\n      '


def fig(name, cls=""):
    c = f' class="{cls}"' if cls else ""
    return f'<figure{c}><img src="img/{name}" alt="" loading="lazy" /></figure>'


def city_logos(c):
    seen = []
    for s in c["sessions"]:
        if s[2] in LOGOS and s[2] not in seen:
            seen.append(s[2])
    if not seen:
        return ""
    return '<div class="mini-logos">' + "".join(f'<span title="{e(n)}"><img src="img/logot/{LOGOS[n]}" alt="{e(n)}" loading="lazy" /></span>' for n in seen) + '</div>'


# ------------------------------------------------------------------ index
def index_page():
    rows = "\n".join(
        f"""        <a href="{s}.html" class="city-row rv">
          <div><h3>{c['name']}</h3>{city_logos(c)}</div>
          <span class="when">{c['dates']}2027</span>
          <span class="arrow">{ARROW}</span>
        </a>""" for s, c in CITIES.items())
    return head(
        "VibeXplorers – 8 lajin liikkari 4–6-vuotiaille",
        "Kokeile eri lajeja. Löydä oma juttu. 8 lajin liikkari 4–6-vuotiaille – talvi 2027 Espoossa, Vantaalla ja Tampereella.",
        "", "hero-porukka.jpg") + nav("home") + f"""
  <header class="hero">
    <img src="img/hero-porukka.jpg" alt="Iso porukka lapsia rivissä kentällä ohjaajien edessä" width="1600" height="1200" />
    <div class="wrap">
      {FALL_NOTICE if FALL_ACTIVE else ""}<span class="label">Talvi 2027 · Espoo · Vantaa · Tampere</span>
      <h1>Kokeile eri lajeja.<br><span class="o">Löydä oma juttu.</span></h1>
      <p>8 lajin liikkari 4–6-vuotiaille.</p>
      <div class="actions">
        <a href="#kaupungit" class="btn">Valitse kaupunki {ARROW}</a>
      </div>
    </div>
  </header>

  <main>
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

    <section class="sec" style="padding-top:0">
      <div class="wrap split">
        <div class="rv">
          <span class="label">Lajipassi</span>
          <h2 class="statement" style="margin-top:.8rem">Tarra jokaisesta kokeilusta.</h2>
          <p class="sub">Ei siksi, että olisi paras. Vaan siksi, että uskalsi kokeilla.</p>
        </div>
        <div class="passi-img rv"><img src="img/lajipassi-kansi.jpg" alt="VibeXplorers Lajipassi" width="638" height="900" loading="lazy" /></div>
      </div>
    </section>

{cta("Talven ryhmät aukeavat pian.")}  </main>

""" + FOOTER


# ------------------------------------------------------------------ city
def row(s):
    wk, sport, club, place, time = s
    if not sport:
        return f"""        <div class="row tba"><div class="wk">Viikko<b>{wk}</b></div><div><h3>Julkistetaan pian</h3></div><div class="time"></div><div class="place"></div><div></div></div>"""
    return f"""        <div class="row"><div class="wk">Viikko<b>{wk}</b></div><div><h3>{e(sport)}</h3><div class="club">{e(club)}</div></div><div class="time">{e(time) if time else "Aika tarkentuu"}</div><div class="place">{e(place) if place else "Paikka tarkentuu"}</div>{logo_tile(club)}</div>"""


def city_page(slug, c):
    items = list(c["sessions"])
    rows = []
    for s in sorted(items + ([(c["break"], "__break")] if c["break"] else []), key=lambda x: x[0]):
        if len(s) == 2:
            rows.append(f'        <div class="row off"><div class="wk">Viikko<b>{s[0]}</b></div><div><h3>Hiihtoloma</h3></div><div></div><div></div><div></div></div>')
        else:
            rows.append(row(s))
    others = " · ".join(f'<a href="{s}.html" style="color:var(--white);font-weight:700">{CITIES[s]["name"]}</a>' for s in CITIES if s != slug)
    return head(
        f"VibeXplorers {c['name']} – Talvi 2027",
        f"8 lajin liikkari 4–6-vuotiaille, {c['name']}, talvi 2027.",
        slug, c["hero"]) + nav(slug) + f"""
  <header class="hero city-hero">
    <img src="img/{c['hero']}" alt="" style="object-position:{c['pos']}" />
    <div class="wrap">
      <span class="label">Talvi 2027 · {c['dates']}2027</span>
      <h1>{c['name']}</h1>
      <div class="facts"><span>4–6-vuotiaat</span><span>Viikot {c['weeks']}</span><span>2 ryhmää</span><span><b>{PRICE}</b> / kausi</span></div>
    </div>
  </header>

  <main>
    <section class="sec">
      <div class="wrap">
        <div class="head rv"><h2 class="statement">Talven lajit.</h2></div>
        <div class="program rv">
{chr(10).join(rows)}
        </div>
        <p class="note">Ohjelma täydentyy. Ryhmäkohtaiset ajat lähetetään ilmoittautuneille.</p>
      </div>
    </section>

{cta("Talven ryhmät aukeavat pian.")}
    <p style="text-align:center;color:var(--grey);margin:-3rem 0 5rem">Myös {others}</p>
  </main>

""" + FOOTER


def fall_page():
    rows = "\n".join(
        f"""        <div class="row" data-date="{d}"><div class="wk">Viikko<b>{wk}</b></div><div><h3>{e(sport)}</h3><div class="club">{e(club)}</div></div><div class="time">{e(time)}<span class="done">Pidetty</span><span class="next">Seuraavaksi</span></div><div class="place">{e(place)}</div><div class="logo-tile"><img src="img/logot/{logo}" alt="{e(club)}" loading="lazy" /></div></div>"""
        for wk, d, sport, club, place, time, logo in FALL)
    return head(
        "VibeXplorers Espoo – Syksy 2026 aikataulu",
        "Syksyn 2026 VibeXplorers-ryhmän aikataulu Espoossa: lajit, ajat ja paikat.",
        "syksy", "kuva-piiri.jpg") + nav("syksy") + f"""
  <header class="hero city-hero fall-hero">
    <img src="img/kuva-piiri.jpg" alt="" style="object-position:50% 45%" />
    <div class="wrap">
      <span class="label">Espoo · 26.8.–28.10.2026</span>
      <h1>Syksy 2026</h1>
      <div class="facts"><span>Syksyn ryhmän aikataulu</span></div>
    </div>
  </header>

  <main>
    <section class="sec">
      <div class="wrap">
        <div class="program fall">
{rows}
        </div>
        <p class="note">Muutoksista ilmoitetaan ryhmän WhatsAppissa. Kysyttävää? <a href="mailto:{EMAIL}" style="color:var(--orange)">{EMAIL}</a></p>
      </div>
    </section>

    <section class="sec cta" style="padding-top:0">
      <div class="wrap rv">
        <h2>Jatketaanko talvella?</h2>
        <a href="index.html#kaupungit" class="btn">Talvi 2027 {ARROW}</a>
      </div>
    </section>
  </main>
  <script>
    (function () {{
      var t = new Date(); t.setHours(0,0,0,0); var nextSet = false;
      document.querySelectorAll('.fall .row[data-date]').forEach(function (r) {{
        var d = new Date(r.getAttribute('data-date') + 'T00:00:00');
        if (d < t) r.classList.add('past');
        else if (!nextSet) {{ r.classList.add('is-next'); nextSet = true; }}
      }});
    }})();
  </script>

""" + FOOTER


if __name__ == "__main__":
    if FALL_ACTIVE:
        (OUT / "syksy.html").write_text(fall_page(), encoding="utf-8")
    (OUT / "index.html").write_text(index_page(), encoding="utf-8")
    for slug, c in CITIES.items():
        (OUT / f"{slug}.html").write_text(city_page(slug, c), encoding="utf-8")
    print("built")
