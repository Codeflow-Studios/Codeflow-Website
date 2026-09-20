# Skumic Run v2

## 1. Wat is veranderd

De bestaande Canvas 2D-game is uitgebreid binnen de bestaande Codeflow-site (React/Vinext). De rode/oranje microsite, Barlow-typografie, supplied tracks, skateboard-deck en beide personages zijn behouden; de vier levelachtergronden zijn vernieuwd en op het speelveld gekalibreerd. Er zijn geen dependencies toegevoegd.

- De speler is circa 30% groter; op lage schermen begrenst de schermhoogte de grootte.
- De weg heeft een perspectivische materiaallaag met voegen, scheuren en kleine reflecties. Deze details bewegen naar de speler, versnellen en groeien richting de voorgrond, terwijl de achtergrond en baan uitgelijnd blijven.
- Vier nieuwe levelachtergronden hebben elk een gekalibreerd verdwijnpunt. De spelcamera rekent dat punt door dezelfde uitsnede als de afbeelding, zodat weg, props en obstakels op desktop en mobiel uit één horizon komen.
- Drie afzonderlijke wegvlakken, twee taps toelopende voegen en korte bewegende wegmarkeringen maken links, midden en rechts direct leesbaar. Pickups en obstakels hebben een grotere, diepte-afhankelijke weergave zodat ze ook verderop leesbaar blijven.
- Losse zijobjecten zijn verwijderd; de vaste omgeving komt volledig uit de gekalibreerde levelachtergrond.
- Skateboards en limited decks hebben een lime markering, schaduw en subtiele beatpuls. Gevaren behouden hun rood/oranje silhouet en krijgen een waarschuwingsteken.
- Snellere lane-wissels, een sprong van 560 ms en een inputbuffer van 120 ms voor de landing. Een korte landingreactie, stof en spelertrail geven feedback.
- Een transparante countdown van drie beats; score, muziek en speeltijd beginnen daarna. De eerste run toont drie seconden een passende toetsenbord- of touchuitleg.
- Compacte HUD met score, beatreeks, totale multiplier, levens, tijd en opbouw naar de drop.
- Ravy Mode heeft een resterende-tijdbalk, dubbele score, onkwetsbaarheid, obstakel-smashes en beperkt licht/particles. De oorspronkelijke dropvensters van 5–5,5 seconden blijven behouden.
- Start activeert theatermodus; Escape pauzeert en verlaat die modus. Browser-fullscreen wordt niet afgedwongen.
- Retry gebruikt het geladen muziekfragment en slaat de countdown over. Een volgend level krijgt wel een countdown.
- Touch: links/rechts vegen om te wisselen, tikken om te springen; ook losse knoppen van minimaal 44 px. Portret en landscape hebben een aangepaste HUD.
- Highscores en ranks blijven per level lokaal bewaard. Mute en de afgeronde tutorial worden ook onthouden.

De spelwereld heeft een kleine, vloeiende camera-follow. De beweging volgt echte loopafstand, lane-wissels, springen en landen; de verre achtergrond beweegt slechts 16% mee voor rustige diepte. De HUD blijft volledig stil. Er is geen schermschudden of zoom en de maximale verplaatsing blijft enkele pixels. Reduced motion zet camera- en grondbeweging volledig uit.

## 2. Bestanden

| Bestand | Verantwoordelijkheid |
| --- | --- |
| `public/skumic-game/engine.js` | Levelconfiguratie, beweging, beatbeoordeling, combo, drops, score en botsingen |
| `public/skumic-game/audio.js` | AudioContext-klok, fragmentcache, laden en audio-lifecycle |
| `public/skumic-game/game.js` | Input, Canvas-weergave, countdown, HUD, tutorial, theater, pauze en retry |
| `public/skumic-game/index.html` | Toegankelijke HUD, countdown, tutorial en resultaatscherm |
| `public/skumic-game/v2.css` | Gerichte stijl- en responsive-aanpassingen bovenop de bestaande stylesheet |
| `tests/skumic-v2-engine.test.mjs` | Deterministische timing-, botsing-, spawning- en audiotests |
| `tests/skumic-v2-browser.mjs` | Chrome-acceptatietests, screenshots en framemetingen |

De route `app/skumic/page.tsx`, bestaande assets en overige websitepagina's zijn niet aangepast. Checkpoint vóór deze iteratie: `checkpoint/skumic-pre-v2-20260920`, commit `8c2bee4`.

## 3. Nieuwe gameplay-systemen

### Ritme en score

Input gebruikt de AudioContext-klok en het tijdstip van de inputgebeurtenis, onafhankelijk van de volgende animatieframe.

- PERFECT: maximaal 80 ms voor/na een beat; 100 basispunten.
- GOOD: maximaal 150 ms voor/na een beat; 60 basispunten.
- NORMAL: geen beatbonus; de reeks neemt met twee af.
- Een beat kan slechts eenmaal worden beloond. Na vier beats zonder geldige hit neemt de reeks geleidelijk af.
- De multiplier groeit per vier combohits tot ×4. Ravy Mode verdubbelt die, tot maximaal ×8.
- Een gebufferde sprong behoudt het oorspronkelijke inputtijdstip voor de beoordeling.

### Levels uit configuratie

`LEVELS` bepaalt ook de keuzeknoppen. Per level staan daar onder andere:

```js
{
  id, number, title, artist, available,
  src, sourceStart, duration,
  bpm, audioOffset, beatTimes,
  boostWindows, dropTimes, sections, buildUpSeconds,
  timing: { perfect, good, comboGraceBeats, decayBeats },
  movement: { jumpDuration, jumpBuffer, laneResponse },
  background, horizon, roadStyle, colors,
  speed, density, gullAfter, doubleAfter, mission, ranks
}
```

`audioOffset`, eventuele `beatTimes` en `boostWindows` zijn tijden binnen het speelbare fragment. `sourceStart` wijst naar de start in de oorspronkelijke opname. `dropTimes` en `sections` worden uit `boostWindows` afgeleid; pas de vensters aan als bron voor nieuwe drops. Zonder `beatTimes` gebruikt beoordeling een BPM-raster. Met een expliciete beatmap gebruikt beoordeling de opgegeven beatmomenten; de visuele beatmeter blijft op BPM gebaseerd.

De bestaande spawnpatronen blijven gedeeld: nieuwe dichtheid/snelheid kan via configuratie, een volledig nieuw obstakeltype vereist nog code en artwork. Niet-beschikbare levelknoppen zijn uitgeschakeld en tonen LOCKED.

## 4. Gevonden en opgeloste problemen

- Audio-selectie kon tijdens asynchroon laden door elkaar lopen. Aanvragen zijn nu gekoppeld aan het gekozen fragment; een oude aanvraag kan geen nieuwe selectie overnemen.
- De cache bewaart maximaal twee gedecodeerde fragmenten van 45 seconden in plaats van volledige nummers. Audio-bronnen en effectnodes worden opgeruimd.
- Grote tijdsprongen na een verborgen tab, onderbroken audio of een lange browserhapering worden opgevangen met pauze. Hervatten gaat verder vanaf de spelpositie.
- Beweging, botsingen, landing en dropovergangen gebruiken kleine tijdstappen. Input wordt niet pas op het tijdstip van de volgende frame beoordeeld.
- Botsingen gebruiken de spelerpositie op het moment dat het object de speler passeert; een korte beschermingsperiode voorkomt meerdere verloren levens bij één botsingsgroep.
- Eerdere CSS kon de nieuwe intro volledig verbergen. De countdown heeft nu een expliciete, transparante zichtbare staat.
- Op mobiel overlapten voeten, beatbalk en Ravy-informatie. De onderkant van het speelveld en de HUD zijn per schermindeling afgestemd.
- Een transform op de mobiele beatbalk maakte die balk onbedoeld het anker van de vaste Ravy-timer. Centreren zonder transform houdt de timer nu onder de bovenste HUD; een aparte viewportcheck bewaakt dit in elk schermformaat.
- Touchbediening bleef niet altijd zichtbaar na rotatie of een wisseling van primair invoerapparaat. De layout houdt nu rekening met de touchmogelijkheden van het toestel.
- HUD-feedback voor levensverlies en drops wordt meteen bijgewerkt. Belangrijke feedback wordt niet direct door een kleine pickupmelding overschreven.

## 5. Validatie en grenzen

Uitvoeren:

```text
pnpm build
pnpm start
node --test tests/skumic-v2-engine.test.mjs
node tests/skumic-v2-browser.mjs
pnpm exec eslint public/skumic-game/game.js public/skumic-game/engine.js public/skumic-game/audio.js tests/skumic-v2-engine.test.mjs tests/skumic-v2-browser.mjs
```

De browsercheck gebruikt bestaande Playwright-tooling buiten de projectdependencies. Andere omgevingen kunnen `PLAYWRIGHT_MODULE_PATH`, `CHROME_PATH`, `SKUMIC_QA_URL` en `SKUMIC_QA_OUTPUT` opgeven.

Testdekking:

Resultaat op 20 september 2026: **12/12 enginetests en 60/60 browserchecks geslaagd**, build en gerichte lintcontrole geslaagd, geen nieuwe console- of runtimefouten. In de vier gemeten schermformaten bleef de gemiddelde frame-interval ongeveer 16,67 ms (p95 16,8 ms; geen frames boven 34 ms in de 120-frame steekproeven). Dat is vergelijkbaar met de meting vóór de wijzigingen in dezelfde omgeving; het is geen prestatiegarantie voor alle telefoons.

- Engine: 12 tests, inclusief 30/60/120 Hz en onregelmatige frames, timinggrenzen, sprongbuffer, combodecay, veilige spawnrijen en audio-races.
- Chrome: 1920×1080, 1024×768, 390×844 en 844×390; selectie, countdown, toetsenbord/touch, pauze/mute, PERFECT/GOOD, botsing/levens, drop/Ravy, game over/retry, refresh, opslag en rotatie.
- Alle vier de echte MP3-bestanden worden gedecodeerd en afgespeeld; beide personages worden geselecteerd.
- Een volledige run van 45 seconden test het natuurlijke einde van de audio en het resultaatscherm. Een geforceerd beschadigd audiobestand test de stille fallback en herstel via de geluidknop.
- AudioContext-onderbreking en reduced motion worden apart getest. Verborgen-tabgedrag wordt in headless Chrome via het visibility-event gesimuleerd.
- Screenshots, framecijfers en browserresultaten staan lokaal in `outputs/skumic-v2/` en zijn niet onderdeel van de productiebuild.

Nog niet volledig gevalideerd of uitgebreid:

- De bestaande BPM/offsets en dropvensters zijn behouden schattingen. PERFECT/GOOD werkt tegen die configuratie; handmatige muzikale kalibratie en gemeten beatmaps blijven nodig voor precieze aansluiting op elke opname.
- Browsertests gebruiken echte Chrome met mobiele emulatie. Fysieke iPhone/Android-apparaten, Safari en Bluetooth-latentie zijn nog niet geverifieerd. Er is geen persoonlijke audio-latentiekalibratie.
- MP3's worden nog volledig gedownload en tijdelijk gedecodeerd voordat het fragment wordt uitgesneden. Voor trage mobiele verbindingen is het vooraf exporteren van de vier speelbare fragmenten de volgende optimalisatie.
- Coyote time is niet toegevoegd: er zijn geen platformranden. De buffer vlak vóór de landing behandelt de relevante vroege input.
- Grote camerabewegingen en extra drukke omgevingslagen zijn bewust niet toegevoegd. De kleine camera-follow moet op fysieke telefoons nog subjectief worden beoordeeld op comfort.
- Scores zijn lokaal; er is geen servervalidatie of bescherming voor een competitief online leaderboard.

## 6. Volgende fase

Eerst: tracks muzikaal kalibreren, latency testen op fysieke telefoons en korte audiobestanden exporteren. Daarna de moeilijkheid, scorebalans en leesbaarheid met echte spelers afstellen.

**FASE 2 — apart vervolgwerk:**

- Online leaderboard met servervalidatie.
- Gebruikersnamen.
- Live-event leaderboard.
- QR-code mode voor optredens.
- Daily challenge.
- Extra levels/tracks.
- Achievements.
- Social/share scorecard.

Deze onderdelen zijn niet stilzwijgend toegevoegd aan v2; de bestaande tekstuele score-deelfunctie blijft beschikbaar.
