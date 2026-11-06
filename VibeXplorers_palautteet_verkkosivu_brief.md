# VibeXplorers – palautteet verkkosivuille (brief koodaukseen)

Kolme paikkaa: etusivun palautenauha, oma Kokemuksia-sivu ja Seuroille-sivun lisäys. Kaikki tekstit ovat valmiita. Pidä sitaatit ja luvut erillisessä datatiedostossa (alla JSON), jotta seuraavan kauden palautteet voi lisätä koskematta komponentteihin.

---

## 1. Etusivun palautenauha

Sijainti: heti ilmoittautumisnapin / hero-osion alla.

**Luvut (3 saraketta):**

| Luku | Teksti |
|---|---|
| 13 / 14 | perheestä suosittelisi meitä |
| 13 | uutta harrastusta vastanneiden lasten joukosta |
| 14 / 14 | perheestä piti kautta hintansa arvoisena |

**Sitaatti:**
> "Tykkäsi kokeilla eri lajeja ja sanoi jokaisen jälkeen, että haluaa harrastaa tätä."

Lähde: Vanhempi, Espoo, syksy 2026 · **Lue lisää kokemuksista →** (linkki Kokemuksia-sivulle)

**Alaviite (pieni, harmaa):**
Palautekysely syksy 2026, vastaajia 14 / 28 perhettä. Harrastukset aloitettu tai alkamassa ensi vuonna.

---

## 2. Kokemuksia-sivu

Sivun title: `Kokemuksia | VibeXplorers – 8 lajin liikkari 4–6-vuotiaille`
Meta description: `Mitä perheet ja seurat sanoivat ensimmäisestä kaudesta Espoossa.`

### 2.1 Hero
- Yläotsikko: SYKSY 2026 · ESPOO
- Otsikko: **Ensimmäinen kausi takana. Tältä se tuntui.**
- Leipäteksti: Syksyllä 2026 Espoossa 28 lasta kokeili kahdeksaa lajia kahdeksassa paikallisessa seurassa. Kysyimme perheiltä ja seuroilta, miten meni.
- Kuva: syksyn ryhmäkuva sumennetuista kuvista (ei lähikuvia kasvoista).

### 2.2 Luvut
Samat kolme lukua ja alaviite kuin etusivulla.

### 2.3 Vanhemmat kertovat (4 korttia)
Kaikki nimettöminä: "Vanhempi, Espoo, syksy 2026".
1. "Tykkäsi kokeilla eri lajeja ja sanoi jokaisen jälkeen, että haluaa harrastaa tätä."
2. "Oli tosi kiva aikuisena päästä näkemään eri seurojen toimintaa, tämä on niin hyvä konsepti!"
3. "Ihanaa, kun ei itse tarvinnut selvitellä mitään, vaan näki kaikki osoitteetkin valmiina linkkinä ja yhdessä viestissä."
4. "Helposti tällaiset lähtee keskittymään esim. pallopeleihin, mutta tässä tuli monipuolisesti lajeja kokeiltua."

### 2.4 Mitä lapselle jäi mieleen (puhekuplat, kevyt osio)
- "Telinevoimistelun tramppa, tanssiopettaja, tarrat ja Olli :D"
- "Yleisurheilun täysi ratakierros oli huippua!"
- "Onnistumiset"

### 2.5 Seurat kertovat (nimellä + logo)
- **Espoon Telinetaiturit:** "Ihan mahtavaa, että tavoitettiin uusia kokeilijoita ja potentiaalisia jäseniä ilman omaa markkinointia ja suoraan paikanpäälle tuotuina!"
- **Espoon Tanssiopisto:** "Kokeilu antoi vanhemmille tietoisuutta Espoon Tanssiopistosta."

### 2.6 Kiitos syksyn seuroille (logoseinä)
Espoon Pesis · Leppävaaran Sisu · Espoon Telinetaiturit · Espoon Tennisseura · Espoon Urheilijat · Espoo Basket Team · Espoon Tanssiopisto · Esport Oilers

### 2.7 CTA: Talvi 2027
- Otsikko: **Talvi 2027 – mukaan ehtii vielä**
- Kaupunkikortit, jokaisessa nappi ilmoittautumiseen:
  - Espoo – Täynnä · *Ilmoittaudu jonoon*
  - Helsinki – 79 € · *Ilmoittaudu*
  - Vantaa – Lauantaisin 30.1.–3.4. · 79 € · *Ilmoittaudu*
  - Tampere – 69 € · *Ilmoittautuminen aukeaa su 8.11. klo 20*
- Loppulause: *Lapsen ei tarvitse vielä tietää, mikä on oma laji.*

Huom: kaupunkien tilat vanhenevat nopeasti, joten tee korteista helposti päivitettävät (data-tiedosto).

---

## 3. Seuroille-sivun lisäys

- Luku: **5 / 5** – seurojen arvio yhteistyöstä
  Alaviite: Seurakysely syksy 2026, 2 seuraa vastasi.
- Luku: **13** uutta harrastusta syksyn ryhmästä
  Jakauma: telinevoimistelu 4, yleisurheilu 3, judo 2, koripallo 2, salibandy 1, tanssi 1
  Alaviite: Perhekysely syksy 2026, vastaajia 14 / 28. Aloitettu tai alkamassa ensi vuonna.
- Seurojen sitaatit (sama kuin 2.5).

---

## 4. Data (esim. `data/feedback.json`)

```json
{
  "season": "Syksy 2026",
  "city": "Espoo",
  "footnote": "Palautekysely syksy 2026, vastaajia 14 / 28 perhettä. Harrastukset aloitettu tai alkamassa ensi vuonna.",
  "stats": [
    { "value": "13 / 14", "label": "perheestä suosittelisi meitä" },
    { "value": "13", "label": "uutta harrastusta vastanneiden lasten joukosta" },
    { "value": "14 / 14", "label": "perheestä piti kautta hintansa arvoisena" }
  ],
  "quotes": [
    { "type": "parent", "featured": true, "text": "Tykkäsi kokeilla eri lajeja ja sanoi jokaisen jälkeen, että haluaa harrastaa tätä.", "source": "Vanhempi, Espoo, syksy 2026" },
    { "type": "parent", "text": "Oli tosi kiva aikuisena päästä näkemään eri seurojen toimintaa, tämä on niin hyvä konsepti!", "source": "Vanhempi, Espoo, syksy 2026" },
    { "type": "parent", "text": "Ihanaa, kun ei itse tarvinnut selvitellä mitään, vaan näki kaikki osoitteetkin valmiina linkkinä ja yhdessä viestissä.", "source": "Vanhempi, Espoo, syksy 2026" },
    { "type": "parent", "text": "Helposti tällaiset lähtee keskittymään esim. pallopeleihin, mutta tässä tuli monipuolisesti lajeja kokeiltua.", "source": "Vanhempi, Espoo, syksy 2026" },
    { "type": "kid", "text": "Telinevoimistelun tramppa, tanssiopettaja, tarrat ja Olli :D" },
    { "type": "kid", "text": "Yleisurheilun täysi ratakierros oli huippua!" },
    { "type": "kid", "text": "Onnistumiset" },
    { "type": "club", "text": "Ihan mahtavaa, että tavoitettiin uusia kokeilijoita ja potentiaalisia jäseniä ilman omaa markkinointia ja suoraan paikanpäälle tuotuina!", "source": "Espoon Telinetaiturit", "logo": "telinetaiturit" },
    { "type": "club", "text": "Kokeilu antoi vanhemmille tietoisuutta Espoon Tanssiopistosta.", "source": "Espoon Tanssiopisto", "logo": "tanssiopisto" }
  ],
  "clubs": [
    "Espoon Pesis", "Leppävaaran Sisu", "Espoon Telinetaiturit", "Espoon Tennisseura",
    "Espoon Urheilijat", "Espoo Basket Team", "Espoon Tanssiopisto", "Esport Oilers"
  ],
  "clubStats": {
    "rating": { "value": "5 / 5", "label": "seurojen arvio yhteistyöstä", "footnote": "Seurakysely syksy 2026, 2 seuraa vastasi." },
    "newHobbies": { "total": 13, "bySport": { "Telinevoimistelu": 4, "Yleisurheilu": 3, "Judo": 2, "Koripallo": 2, "Salibandy": 1, "Tanssi": 1 } }
  }
}
```

---

## 5. Ilme ja säännöt

- Fontti Montserrat. Tumma pohja #111111, kortit #1C1C1C, korostukset Vibe Orange #FF6A3D, toissijainen teksti #B2B7C2, valkoinen #FFFFFF. Sama tyyli kuin Espoon mainoskuvassa.
- Isot luvut oranssilla ja paksulla (800), selitteet harmaalla. Sitaatit valkoisella ja oranssi lainausmerkki.
- Mobiilissa luvut allekkain, sitaattikortit vieritettävänä rivinä tai allekkain.
- Perheiden sitaatit aina nimettöminä. Seurat ovat antaneet luvan nimellä.
- Kriittisiä palautteita ei julkaista (ryhmäkoko, vaihtuvat viikonpäivät jne.).
- Kuvat vain sumennetuista kuvista, ei lähikuvia kasvoista. Kaikille kuville alt-tekstit.
- Vältä "löydä oma lajisi" -muotoiluja.
