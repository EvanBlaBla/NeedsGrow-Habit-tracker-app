# NeedsGrow — bouwstap 1/2

Dit is pure webcode (`www/`-inhoud voor een Capacitor-project). Geen Capacitor-
scaffolding, `package.json` of Android-project — dat regel je zelf lokaal
(`npm install @capacitor/core @capacitor/android`, `npx cap init`, `npx cap add android`,
en dan deze map als `webDir` instellen).

## Wat er nu klaar is
- Volledige projectstructuur: losse HTML/CSS/JS-bestanden, geen inline styles/scripts.
- Kleurenpalet exact overgenomen uit het palet-document (`css/variables.css`), incl. dark mode.
- Thema-systeem: dark mode (volgt systeeminstelling, overrule-baar) + uitbreidbaar
  kleurenthema (standaard/random) — zie `js/theme.js`.
- i18n-skelet (NL/EN, NL = fallback/systeemtaal) — zie `js/i18n.js`.
- Topbar + zwevende navbar (§2).
- Tab **Habits** volledig: Vandaag-, 3 dagen- en Weekweergave (§4.1–4.3), sub-
  habits/challenge-habits met eigen kleur (§4.4), toevoeg-/bewerk-overlay (§5,
  geld & stappenplannen verwijderd), fullscreen detail-/statistiekenoverlay met
  maandkalender, percentage, totalen en streak (§4.5).
- Datamodel (`js/state.js`) slaat afvinkjes op **per kalenderdatum**, niet meer
  per weekdag met wekelijkse reset — nodig voor de kalender/streaks/totalen.

## Wat nog volgt (bouwstap 2)
- Tab **Challenges** (Full/Compact-weergave, tijdlijn, checkpoint, groen/rood-logica).
- **Instellingenscherm** (profiel, datum & tijd, taal, uiterlijk-lijst) —
  dark-mode/thema-logica bestaat al in `js/theme.js`/`js/i18n.js`, alleen de UI
  ervoor ontbreekt nog. Voor nu staan er 2 tijdelijke testknoppen op het
  Profiel-tabblad.
- Slide-from-right-transitie voor instellingen-subpagina's (CSS-klasse
  `.slide-right` staat al klaar in `css/overlays.css`).

## Assets die je zelf moet aanvullen
Ik heb geen toegang tot de echte logo-/icoonbestanden uit `/icons/` — kopieer
zelf de volgende bestanden naar `assets/icons/grow/` in dit project:
- `grow-logo-black.png`, `grow-logo-white.png` (topbar-logo, wisselt met dark mode)
- `needs-icon-simple.png` (Needs-icoon in het midden van de navbar)

En voor de fonts (spec vraagt om lokaal bundelen i.p.v. CDN) — download zelf
en plaats in `assets/fonts/`:
- Concert One (Regular) → `ConcertOne-Regular.woff2`
- Encode Sans Semi Expanded (Regular/Medium/SemiBold/Bold) → zie de
  bestandsnamen bovenaan `css/variables.css`

Zolang deze bestanden ontbreken valt de app terug op system-fonts en toont de
topbar een gebroken afbeelding-icoon — functioneel werkt de rest gewoon.

## Databeslissing
Per je antwoord: het meeste is vers gebouwd (nieuwe datastructuur zonder geld/
stappenplannen, checks per datum i.p.v. per week). Wat ongewijzigd bleef t.o.v.
de oude kasboek-app: de opzet van sub-habits (ouder/kind via `parentId`/
`subIds`), de dagenkiezer-UX, en het opslag-abstractielaagje
(`window.storage` met `localStorage`-fallback) zodat fase 2 dit simpel kan
vervangen door een echte backend-call.
