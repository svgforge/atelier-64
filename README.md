# Atelier 64

Eine Icon-Foundry: **128 prozedural erzeugte 64×64-SVG-Icons**, jeweils mit
einer klassischen Farbharmonie-Palette eingefärbt und als `<symbol>` in **ein
einziges SVG-Sprite** gepackt. Die Web-App macht daraus eine durchsuchbare
Galerie mit Detailansicht, Farb-Codes und Copy-&-Download-Helfern.

Das Sprite entsteht **im Browser** — erzeugt vom mitgelieferten Paket
`@svgforge/generative-icons`. Kein Server, kein Python, kein Build-Schritt
dazwischen.

---

## Was die App macht

- **Galerie** aller 128 Icons als Raster (4 Spalten mobil bis 10 Spalten auf
  großen Schirmen).
- **Suche** über Icon-ID, Style, Harmonie, Plate und laufende Nummer.
- **Filter** nach den 8 Farbharmonien.
- **Regler-Zeile**: Anzahl der Icons, Größe des Koordinatenraums und Seed, dazu
  ein Würfel-Button. Jede Änderung baut das Sprite sofort im Browser neu — die
  Dauer wird angezeigt.
- **Harmonien als Auswahl**: Die acht Farbharmonien sind ein
  **Allow-List-Regler** für den Generator, kein nachträglicher Filter. Ein Set
  aus zwei Harmonien entsteht also aus zwei Harmonien, statt aus 128 gefilterten
  Icons. Die letzte Harmonie lässt sich nicht abwählen — der Generator braucht
  mindestens eine.
- **Alle Einstellungen in der URL**
  (`?seed=183472&count=40&size=128&harmonies=analogous,triadic`): ein Set ist
  teilbar, bookmarkbar und übersteht ein Neuladen. Der Server rendert dieselben
  Werte, die der Browser danach hydratisiert — kein Flackern, kein Mismatch. Beim
  Ändern schreibt die App nur, was vom Standard abweicht; eine von Hand
  eingetippte URL wird nicht umgeschrieben.
- **Live-Snippet** im Kopf: Die `viewBox` darin ist die Größe, mit der das Sprite
  tatsächlich gebaut wurde, und die Anzeigegröße ist frei einstellbar — keine
  fest verdrahtete Zahl mehr. Mit Copy-Button.
- **Detail-Dialog** beim Klick auf ein Icon:
  - Skalenvorschau in 64, 32 und 16 px (prüft die Lesbarkeit kleiner Größen),
  - die komplette Farbpalette als klickbare Hex-Swatches,
  - Fragment-Referenz (`#icon-001`) zum Kopieren,
  - Usage-Snippet **und** das eigenständige SVG des Icons, beide in der aktuellen
    Größe, zum Kopieren.
- **Download**: das komplette Sprite als Datei.
- **Rein statisch**: kein Login, keine Datenbank, kein Server-State. Alle
  Icon-Metadaten kommen aus dem Manifest, das der Generator mitliefert.

---

## Wer erzeugt das Sprite?

Aus dem Paket **`@svgforge/generative-icons`** (`packages/generative-icons/`),
und zwar im Browser. Die App rendert das Sprite beim Server-Render einmal vor —
damit ist die Seite sofort vollständig — und baut es danach im Browser neu,
sobald du den Seed änderst.

```js
import { generateSprite, mountSprite } from "@svgforge/generative-icons";

const { sprite, manifest, icons } = generateSprite({ seed: 64, count: 128 });
mountSprite(sprite); // ab jetzt funktioniert <use href="#icon-001">
```

128 Icons kosten rund 15 ms und ~175 KB Markup. Weil der Generator rein und
deterministisch ist, liefern Server und Browser für denselben Seed exakt
dasselbe Ergebnis — deshalb gibt es keinen Hydration-Mismatch.

Der Alias `@svgforge/generative-icons` steht in `tsconfig.json` und zeigt auf
`packages/generative-icons/src/index`; Vite löst ihn über die tsconfig-Pfade
auf, TypeScript nimmt die Typen aus dem danebenliegenden `index.d.ts`.
Installiert werden muss dafür nichts.

### Der Python-Generator ist nur noch Referenz

`scripts/generate_icon_sprite.py` funktioniert weiterhin und schreibt nach
`public/icons.svg` + `public/icons.json`, wird von der App aber **nicht mehr
benutzt**. Ebenso sind `public/generate_icon_sprite.py` und
`src/data/icons.json` Altbestand. Diese Dateien kannst du löschen, sobald du sie
nicht mehr als Vergleich brauchst — die App läuft ohne sie.

---

## Voraussetzungen

| Zweck                      | Benötigt                                                          |
| -------------------------- | ----------------------------------------------------------------- |
| App installieren / starten | Node.js **20.19+** oder **22.12+** (Vite 8); getestet mit Node 24 |
| Paketmanager               | **pnpm** (empfohlen) oder npm                                     |
| Sprite erzeugen            | nichts — passiert im Browser                                      |

---

## Installation

```sh
pnpm install
```

Das legt `node_modules/` an und schreibt `pnpm-lock.yaml`. Alternativ mit npm:
`npm install`.

> **Falls `pnpm install` scheinbar nichts tut:** pnpm sucht aufwärts nach einer
> `pnpm-workspace.yaml`. Liegt in einem **Elternverzeichnis** eine solche Datei,
> hält pnpm dieses für den Workspace-Root und installiert still gar nichts
> (Exit-Code 0, `node_modules` bleibt leer). Abhilfe: im Projektordner eine
> eigene, minimale `pnpm-workspace.yaml` anlegen — die gibt es hier bereits:
>
> ```yaml
> packages: []
> ```
>
> Danach funktioniert `pnpm i` wie gewohnt. Einmalig geht auch
> `pnpm install --ignore-workspace`.

---

## Entwicklung

```sh
npm run dev        # Dev-Server auf 0.0.0.0:8080 (HMR)
npm run build      # Produktions-Build nach .vercel/output
                   # (führt zusätzlich db:migrate aus; ohne DATABASE_URL wird das übersprungen)
npm run preview:restart   # gebauten Stand auf 127.0.0.1:8081 ausliefern
npm run typecheck  # tsc --noEmit
npm run lint       # ESLint
npm test           # Node-Testrunner (Skripte + src/lib-Tests)
```

Wichtige Hinweise:

- Port **8080** ist fest im `vite.config.ts` verdrahtet — bitte nicht ändern,
  die Live-Vorschau und der Autostart erwarten genau diesen Port.
- Nach Änderungen an `vite.config.ts` oder an Dependencies den Dev-Server einmal
  neu starten (HMR genügt dann nicht mehr).
- Der Dev-Server läuft im Hintergrund weiter; er muss während der Arbeit nicht
  gestoppt werden.

---

## Ein neues Icon-Sprite erzeugen

Der Normalfall braucht kein Kommando: **Seed im Kopf der App ändern**, und das
Sprite wird sofort im Browser neu gebaut. Der Würfel-Button daneben wählt einen
zufälligen Seed.

Programmatisch geht dasselbe — dieselbe Funktion, im Browser wie in Node:

```js
import { generateSprite, randomSeed } from "@svgforge/generative-icons";

// deterministisch
const { sprite, manifest, icons } = generateSprite({
  count: 128, // Anzahl der Icons (icon-001 … icon-NNN)
  seed: 64, // gleicher Seed ⇒ gleiches Sprite
  size: 64, // Kachel- und viewBox-Größe in px
});

// frisch gewürfelt — der Seed kommt ins Manifest zurück
const rolled = generateSprite({ seed: "random" });
rolled.manifest.seed; // 1834729 → damit bleibt das Set reproduzierbar

// eingegrenzter Raum: nur zwei Motive, nur zwei Harmonien
generateSprite({
  seed: "random",
  count: 60,
  styles: ["orbits", "rings"],
  harmonies: ["analogous", "monochromatic"],
  plates: ["circle", "none"],
});
```

Die Allow-Lists `styles`, `harmonies` und `plates` grenzen den **Raum** ein, aus
dem gewürfelt wird — nicht den Zufall darin. Ein eingegrenztes Set nutzt weiter
alles, was es bekommt, statt sich auf ein Motiv zu häufen. Unbekannte oder leere
Listen werfen einen Fehler, statt still etwas Unerwartetes zu bauen.

`size` beschreibt den **Koordinatenraum**, in dem die Motive gezeichnet werden —
nicht „Auflösung". SVG ist auflösungsunabhängig, das Bild bleibt also gleich; was
sich ändert, ist die `viewBox` und die Zahlenschreibweise darin. Die Motive sind
auf einen 64×64-Raum ausgelegt und werden in jede andere Größe skaliert. Bei
`size: 64` ist der Faktor 1 und das erzeugte Markup unverändert.

`generatedAt` im Manifest ist standardmäßig der aktuelle Zeitpunkt. Übergib einen
festen ISO-String, wenn du vollständig reproduzierbare Ausgaben brauchst (Tests,
SSR).

**Wie ein Icon entsteht** (rein prozedural, kein Machine Learning, keine
externen Assets): pro Icon wird deterministisch eine Kombination gewählt aus

- **1 von 29 Styles** — z. B. `mandala`, `crystal`, `starburst`, `orbits`,
  `crest`, `glyph`, `lattice`, `bloom`, `rings`, `shards`, `ripple`,
  `constellation`, `honeycomb`, `spiral`, `panes`, `compass`, `mosaic`,
  `vortex`, `sigil`, `bubbles`, `chevrons`, `weave`, `frame`, `seeds`,
  `eclipse`, `kite`, `asterisk`, `labyrinth`, `sun`
- **1 von 8 Farbharmonien** — `complementary`, `analogous`, `triadic`,
  `split-complementary`, `tetradic`, `square`, `monochromatic`, `compound`
- **1 von 8 Plates** — `roundrect`, `circle`, `squircle`, `hex`, `diamond`,
  `octagon`, `soft-square`, `none`
- einem Basisfarbton (Hue), der nach dem goldenen Winkel über die Serie verteilt
  wird, damit benachbarte Icons bunt statt eintönig wirken

Style, Harmonie und Plate werden **nach Position** aus dem Index gewählt und sind
daher über Seeds hinweg stabil; nur die Geometrie innerhalb des Motivs kommt aus
dem Zufallsgenerator. Gleicher Seed + gleiche `count` ergeben deshalb exakt
dasselbe Sprite.

---

## Ein Icon im eigenen Projekt verwenden

Am einfachsten nimmst du im Detail-Dialog **„Copy standalone SVG"** — ein
vollständiges, in sich geschlossenes SVG für genau dieses Icon, ohne Abhängigkeit
zum Sprite:

```html
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <!-- Inhalt des Icons -->
</svg>
```

Wenn du das ganze Sprite mitnehmen willst: über **Download sprite** holen, neben
das HTML legen und per Fragment referenzieren:

```html
<svg width="64" height="64" viewBox="0 0 64 64" aria-label="icon-001">
  <use href="icons.svg#icon-001"></use>
</svg>
```

Kennst du die Maße des Icons nicht (oder skalierst du per CSS), setze einfach
`width`/`height` ohne `viewBox` und lass den Browser skalieren:

```html
<svg width="32" height="32" class="my-icon">
  <use href="icons.svg#icon-042"></use>
</svg>
```

Das Sprite selbst ist `aria-hidden`, die Icons sind also rein visuell — ein
`aria-label` am umgebenden `<svg>` oder ein Text daneben übernimmt die
Bedeutung.

---

## Projektstruktur

```
public/
  favicon.svg, og.jpg        # Branding
  icons.svg, icons.json      # Altbestand: vom Python-Generator, ungenutzt
  generate_icon_sprite.py    # Altbestand: Python-Generator, ungenutzt
scripts/
  generate_icon_sprite.py    # Altbestand: Python-Generator, ungenutzt
  browser-smoke.mjs          # Browser-Render-Check
  preview.mjs                # gebautes Ergebnis auf :8081 ausliefern
  with-app-env.mjs           # startet Vite mit den App-Env-Variablen
packages/
  generative-icons/         # npm-Paket: der Generator (ESM, ohne Deps)
    icon.svg                 # Brand-Mark (muss im files-Feld stehen)
    src/rng.js               # geseedeter PRNG
    src/color.js             # Harmonien + Paletten
    src/svg.js               # Primitives, Zahlenformat, Ctx
    src/plates.js            # die 8 Plattenformen
    src/motifs.js            # die 29 Motive
    src/index.js             # generateSprite(), renderIcon(), buildSprite()
    src/browser.js           # mountSprite(), spriteBlobUrl()
    src/index.d.ts           # Typen
    test/generate.test.js    # Paket-Tests
src/
  lib/sprite.ts              # Brücke zur App: Memoisierung, Sprite-Download
  lib/icons.ts               # Typen, Harmony-Labels, Snippet-Helfer
  components/
    gallery.tsx              # Raster, Suche, Regler, Harmonie-Picker, Snippet
    icon-detail.tsx          # Dialog: Skalenvorschau, Farben, Copy
    icon-mark.tsx            # eine Icon-Instanz per <use href="…#id">
  routes/                    # TanStack-Start-Routen (index.tsx = Startseite)
migrations/                  # keine eigenen Migrationen
  auth/0001_auth.sql         # mitgeliefertes Auth-Schema, hier ungenutzt
startup.sh                   # Autostart für die Sandbox-Umgebung
```

---

## Technik-Stack

- **TanStack Start / Router** (SSR, dateibasiertes Routing)
- **React 19** + **TypeScript**
- **Vite 8** mit `@vitejs/plugin-react`, **Nitro** für den Produktions-Build
- **Tailwind CSS v4** (`@tailwindcss/vite`)
- **Radix UI**-Primitives + kleine eigene UI-Bausteine, `sonner` für Toasts
- Icon-Erzeugung: **eigenes npm-Paket** `@svgforge/generative-icons`
  (ESM, ohne Abhängigkeiten, läuft im Browser wie in Node)

---

## Tests und Checks

```sh
npm test           # Node-Testrunner
npm run typecheck  # TypeScript
npm run lint       # ESLint
node --test packages/generative-icons/test/   # Tests des Generator-Pakets
```

> Bekannte Altlasten, unabhängig von der Icon-Erzeugung:
> `scripts/grok-pwa-plugin.test.mjs` erwartet noch den Demo-Namen „Wild Race"
> (8 Fehler), und `npm run lint` meldet einen leeren Block in
> `src/lib/app-data/client.server.ts`.

Nach einem Build:

```sh
npm run preview:restart   # gebauten Stand auf 127.0.0.1:8081
node scripts/browser-smoke.mjs
```

`browser-smoke.mjs` prüft im echten Chromium, dass die Seite sichtbaren Inhalt
rendert und die Browser-Konsole fehlerfrei bleibt — auf Desktop und Mobil.

---

## Lizenz & Herkunft des Codes

Dieser Code ist **mit Grok (xAI) erzeugt** und anschließend von Hand
überarbeitet. Was das für die Lizenz bedeutet:

- Laut den [xAI Consumer Terms](https://x.ai/legal/terms-of-service) und der
  zugehörigen FAQ gilt: „You own the Inputs and Outputs" — xAI beansprucht
  **kein Eigentum** an den Ausgaben, kommerzielle Nutzung ist ausdrücklich
  erlaubt. Das gilt „to the extent permitted by applicable law", also nur
  soweit das anwendbare Recht das zulässt.
- Genau darin liegt die Unsicherheit: Reine Maschinenausgaben sind in vielen
  Rechtsordnungen (US Copyright Office, EU) **nicht urheberrechtsfähig**, weil
  die nötige menschliche Schöpfungshöhe fehlt. Ein belastbarer
  Urheberrechtsanspruch auf den generierten Code allein ist deshalb nicht
  garantiert.
- Praktisch heißt das: Die MIT-Lizenz in
  `packages/generative-icons/LICENSE` vergibt Rechte an allem, woran überhaupt
  Rechte bestehen können — also an den menschlichen Anteilen: Entwurf,
  Motiv-Katalog, Portierung, Integration. Sie schadet nicht und ist für ein
  npm-Paket die übliche, sichere Wahl.
- **Marken:** xAI verlangt Zustimmung für die Verwendung von Name, Logo oder
  Markenzeichen von xAI/Grok. Paketname und Code enthalten deshalb bewusst
  keine Grok-/xAI-Marken. Eine Attributionsbitte existiert, aber keine
  Pflicht, sie im Paket mitzuführen. Zu beachten ist außerdem, dass xAI für
  Ausgaben einen KI-Hinweis anbringen darf bzw. verlangen kann, wenn du sie
  veröffentlichst.

Als Rechteinhaber steht in der LICENSE derzeit **`svgforge`**. Soll dort ein
anderer Name (bürgerlicher Name oder Firma) stehen, ist das eine Zeile
Änderung.

> Das ist eine Zusammenfassung der öffentlich einsehbaren Bedingungen und
> **keine Rechtsberatung**. Für eine kommerzielle Veröffentlichung mit echten
> Haftungsfragen sollte das jemand bewerten, der das rechtlich darf.
