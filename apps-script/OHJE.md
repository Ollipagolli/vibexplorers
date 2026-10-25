# Ilmoittautumisen taustapalvelu – käyttöönotto

Tämä tehdään kerran testitaulukolle (noin 15 min). Tuotantotaulukko tehdään myöhemmin kopioimalla testitaulukko.

## 1. Taulukko ja koodi

1. Kirjaudu tilille **vibexhq@gmail.com**. Tarkista, että kaksivaiheinen tunnistautuminen on päällä (Google-tili → Tietoturva).
2. Luo uusi Google Sheets -taulukko nimellä **VibeXplorers ilmoittautumiset – TESTI**.
3. Valitse taulukossa **Laajennukset → Apps Script**.
4. Poista editorista valmis `function myFunction() {}` ja liitä tilalle koko `Code.gs`-tiedoston sisältö. Tallenna (Ctrl+S). Nimeä projekti esimerkiksi "VibeXplorers ilmoittautuminen".

## 2. Asennus

1. Valitse editorin yläreunan funktiovalikosta **setup** ja paina **Suorita**.
2. Google kysyy oikeuksia. Valitse vibexhq-tili → **Lisäasetukset** → **Siirry: VibeXplorers ilmoittautuminen (vaarallinen)** → **Salli**. Varoitus näkyy, koska skriptiä ei ole tarkistanut Google. Oikeudet koskevat vain tätä tiliä.
3. Palaa taulukkoon ja päivitä sivu. Taulukossa on nyt välilehdet Asetukset, vantaa, espoo, tampere, helsinki, testi, Sähköpostijono ja Loki sekä oma **VibeXplorers**-valikko.

## 3. Tarkista Asetukset-välilehti

| Sarake | Mitä tarkistaa |
|---|---|
| Avautuu | Muoto `2026-10-27 20:00` (Suomen aikaa). Tyhjä = ei vielä aukeamassa |
| Tila | `Auto` = aukeaa ajan mukaan, `Kiinni` = suljettu, `Auki` = auki heti |
| Ensimmäinen kerta | **Täytä Vantaan ja Tampereen oikeat päivät.** Nyt niissä on arvaus 2027-01-30. Eräpäivä ja peruutusraja lasketaan tästä |
| Ryhmiä, Paikkoja, Yläraja | Vantaa 1 × 27 (28), muut 2 × 27 (28) |
| Varattu, Tarjottu, Jonossa | Skripti päivittää nämä. Älä muokkaa käsin |

Testi-rivi on testejä varten: 3 paikkaa, yläraja 4, auki heti.

## 4. Julkaisu verkkosovelluksena

1. Valitse Apps Scriptissa **Ota käyttöön → Uusi käyttöönotto**.
2. Valitse tyypiksi (ratas) **Verkkosovellus**.
3. Kuvaus: `v1`. Suorita käyttäjänä: **Minä (vibexhq@gmail.com)**. Käyttöoikeus: **Kuka tahansa**.
4. Paina **Ota käyttöön** ja kopioi **Verkkosovelluksen URL** (päättyy `/exec`). Lähetä se minulle, niin kytken lomakkeen siihen.
5. Testaa selaimessa: liitä osoitteen perään `?action=status&city=testi`. Vastauksena pitäisi tulla tekstiä, jossa on `"state":"open"` ja `"free":3`.

**Tärkeää myöhemmin:** kun koodi päivittyy, valitse **Ota käyttöön → Hallinnoi käyttöönottoja → kynä → Versio: Uusi versio**. Älä tee uutta käyttöönottoa, koska silloin osoite vaihtuu ja lomake lakkaa toimimasta.

## 5. Arjen käyttö

- **Peruutus:** vaihda rivin Tila arvoon `Peruttu`. Laskurit päivittyvät automaattisesti.
- **Paikka jonosta:** avaa kaupungin välilehti → **VibeXplorers → Tarjoa vapautunut paikka**. Jonon ensimmäinen perhe saa sähköpostin ja 48 tuntia aikaa vahvistaa. Jos aika umpeutuu, paikka tarjotaan automaattisesti seuraavalle.
- **Laskutus:** suodata Tila = Varattu ja Laskutettu tyhjä. Eräpäivä on valmiina omassa sarakkeessaan. Merkitse Laskutettu- ja Maksettu-sarakkeisiin "x".
- **Ryhmäjako:** kirjoita Ryhmä-sarakkeeseen A tai B.
- **Ongelmat:** Loki-välilehti näyttää tapahtumat. Jos virheitä tulee useita tunnissa, vibexhq saa hälytysviestin.
- **Sähköpostit:** Sähköpostijono-välilehti näyttää jokaisen lähteneen viestin. Jos päiväkiintiö (100) täyttyy, viestit odottavat ja lähtevät seuraavana päivänä automaattisesti.

## Ajastimet (setup luo nämä)

| Ajastin | Väli | Tehtävä |
|---|---|---|
| expireOffers | tunti | Vanhentuneet tarjoukset pois ja paikka seuraavalle |
| processMailQueue | 15 min | Odottavat sähköpostit |
| dailyBackup | yöllä klo 3 | Kopio Driven kansioon "VibeXplorers varmuuskopiot", yli 30 pv vanhat poistetaan |
| onSheetEdit | muokkaus | Laskurit päivittyvät, kun Tila muuttuu |

## Ennakkoilmoittautuminen

Ennakkokoodilla ilmoittautuminen aukeaa valitulle porukalle ennen yleistä avautumista.

1. Lisää Asetukset-välilehdelle otsikot **Q1 = Ennakkokoodi** ja **R1 = Ennakko alkaa** (jos niitä ei vielä ole).
2. Kirjoita kaupungin riville koodi (esim. `SYKSY26`) ja alkuaika (esim. `2026-10-25 18:00`). Tyhjä alkuaika = heti.
3. Jaa linkki: `https://vibexplorers.com/espoo?ennakko=SYKSY26#ilmoittaudu`
4. Ennakkona tulleissa riveissä lukee Huom.-sarakkeessa "Ennakko". Paikat ovat samat kuin yleisessä ilmoittautumisessa.
5. Kun yleinen ilmoittautuminen aukeaa, koodia ei enää tarvita. Ennakon voi lopettaa tyhjentämällä koodin.
