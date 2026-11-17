# Dreamz Planners — content model (`site-content.json`, schemaVersion 1)

`content/site-content.json` holds the complete default content of the homepage. Everything visible on the site comes from it.

## How the site loads content

1. `js/data.js → getContent()` fetches `content/site-content.json` (the defaults).
2. It then reads Supabase `site_content` where `id = 'published'` (3 s timeout). If that row's `data` is a non-empty object, it is **deep-merged over the defaults**:
   - objects merge key by key, so the Studio can save only the keys it changed;
   - **arrays replace the default array as a whole** (save the full list when editing a list);
   - `null` / missing keys keep the default.
3. Preview modes (for the Studio):
   - `index.html?preview=draft` reads the `draft` row (works when the owner is signed in on the same origin; falls back to `published`).
   - `index.html?preview=local` merges `localStorage['dp:preview-content']` over the defaults (offline / local mode).
   - Live preview in an iframe: `iframe.contentWindow.postMessage({ type: 'dp:preview', content }, location.origin)` re-renders the page immediately with `content` merged over the loaded content (same origin only). Debounce to ~300 ms.
   - `?motion=reduce` forces the calm static layout (no pins, no smooth scroll, posters instead of autoplay).
   - `?theme=<preset-id>` forces a theme preset for testing (not remembered).
4. Media ids are resolved by `DP.media.resolve(id)` (manifest entries may carry `focus`, a CSS object-position such as `"50% 40%"`): first `assets/media/manifest.json` (`loops[]`, `stills[]`), then folder conventions (`still-*`/`tile-*` → `assets/media/stills/<id>.webp`; anything else → `assets/media/loops/<id>.mp4` + `posters/<id>.webp`). A media field may also hold a full URL (e.g. a Supabase Storage `site-media` public URL) or a site-relative path.

## Mini-markup in text fields

Fields marked **rich** accept `*word*`, which renders as the gold italic accent (`<em>`). No other HTML is allowed (everything is escaped).

## Top-level keys

| Key | Type | Notes |
|---|---|---|
| `schemaVersion` | number | Always `1` for this shape. Bump if the shape changes. |
| `meta.updated`, `meta.note` | string | Informational. |
| `brand` | object | See below. |
| `theme` | object | Colours, fonts, effect switches. |
| `seo` | object | Title, description, site URL, OG image. |
| `contact` | object | Phones, WhatsApp, Instagram, email, address. |
| `promo` | object | Top marquee bar. |
| `announcement` | object | Scheduled popup card. |
| `sections` | array | Order + visibility of chapters. |
| `nav` | array | Header / footer / mobile menu links. |
| `mediaCredits` | object | Optional override: `{ "<mediaId>": "credit text" }`. Empty → credit from the media manifest. |
| `mediaFocus` | object | Optional focal points: `{ "<mediaId or URL>": "50% 30%" }` (CSS `object-position`, x then y). Wins over the manifest `focus`. Applied everywhere the media is cover-cropped (hero, behind-the-curtain card and full bleed, reel cards, decks, founders photo, service previews, image trail, begin background). Studio: click the thumbnail in any media field. |
| `features` | string[] | Content features this saved content knows about (see below). |
| `hero`, `promise`, `behind`, `celebrations`, `weddings`, `services`, `estimator`, `printing`, `process`, `vendors`, `founders`, `reviews`, `faq`, `begin` | object | One per chapter (below). |
| `dateCheck` | object | Labels for the date-check widget. |
| `availability` | array | Local fallback dates (Supabase `availability` table wins). |
| `wizard` | object | Inquiry wizard options + copy. |
| `footer` | object | Footer note, copyright, links. |
| `labels` | object | Small UI strings. |

### `brand`
| Key | Type | Notes |
|---|---|---|
| `name` | string | "Dreamz Planners" — used in logo alt text, JSON-LD, footer. |
| `shortName` | string | Giant footer word ("Dreamz"). |
| `tagline` | string | Footer tagline, JSON-LD slogan, hero fallback headline. |
| `logo.horizontal` | path/URL | Header logo, light/gold version — used on dark themes and over the hero film in every theme. Falls back to a text wordmark if it fails to load. |
| `logo.horizontalDark` | path/URL | Header logo, dark version — used on light themes once the header leaves the hero. |
| `logo.horizontalCompact`, `logo.horizontalCompactDark` | path/URL | Compact lockup (dome + jharokha) for logo slots under 40 px tall. The header shows the full lockup at 72 px (desktop), 56 px (condensed on scroll) and 48 px (phones). |
| `logo.crest3d` | path/URL | Photoreal gold crest (1200 × 1033 WebP) — 404 page; the preloader animates its layers from `assets/brand/loader/` (`layers.json`). |
| `logo.stacked`, `logo.stackedDark` | path/URL | Footer logo (light/gold and dark versions). Dark falls back to `horizontalDark`, then `stacked`. |
| `logo.mark`, `logo.markDark`, `logo.mark3d` | path/URL | Monogram (light/dark) and the 3D render. The preloader draws `assets/brand/logo-mark.svg` or `logo-mark-dark.svg` by mode. |
| `favicon` | path/URL | Optional favicon override. |

### `theme`
Themes are complete designed looks defined in `js/themes.js` (shared by the site, `404.html`, `privacy.html` and the Studio). Each preset sets the page tokens **and** a separate "media" palette used for everything laid over photos/video (hero, reel cards, the behind-the-curtain quote, captions, the header while it floats over the hero, the film player). Media stays cinematic (dark shade + light text) in every theme, so text over video is always legible.

| Key | Type | Notes |
|---|---|---|
| `preset` | string | `midnight-gold` (default, dark), `emerald-night` (dark), `satin-ivory` (light), `rose-champagne` (light). Unknown/missing → `midnight-gold`. Test any preset with `index.html?theme=<id>`. |
| `colors` | object | **Optional per-token overrides** on top of the preset (fine-tuning). Keys: `ink` (page background), `ivory` (main text), `plum` (cards/surfaces), `aubergine` (soft tint), `gold`, `goldDeep`, `champagne` (secondary accent text), `rani` (pink accent), plus for light themes `mediaInk` (shade over photos/video), `mediaText`, `mediaGold`. Empty `{}` = pure preset. The Studio clears this when another preset is picked. Old content that has the 8 classic colours and no `preset` renders exactly as before (Midnight Gold + those colours). Overrides apply only to the main preset, not to the visitor-toggle alternative. |
| `visitorToggle` | `false` \| `true` \| `"auto"` | Light/dark button in the header. `true`: starts on `preset`; `"auto"`: starts from the visitor's `prefers-color-scheme`. The visitor's choice is remembered in `localStorage['dp:visitor-mode']`. |
| `lightPreset`, `darkPreset` | preset id | The pair the toggle flips between. If `preset` is light it is the light side (and `darkPreset` the dark side), and vice versa. Defaults `satin-ivory` / `midnight-gold`. |
| `fonts.display` `label` `body` `script` | Google Font family name | Defaults: Cormorant Garamond / Marcellus / Manrope / Pinyon Script. Any other Google Font family name is loaded automatically. |
| `effects.grain` `vignette` `particles` `smoothScroll` | boolean | Film grain, vignette, gold-dust canvas, Lenis smooth scroll (each adapts to light themes). |
| `effects.customCursor` | boolean | Decorative gold ring that follows the mouse on desktop (default `true`). The native cursor is never hidden; the ring hides itself over form fields, selects and inside dialogs/lightbox. Old key `effects.cursor: false` also switches it off. |
| `effects.mediaCredits` | boolean | Photographer credit labels (© @handle) in the corner of photos/videos, lightbox and film bar (default `true`). `false` hides them site-wide (credits listed in each wedding story's text stay). |
| `intro` | object | **Intro film overlay** (`js/intro.js`), shown after the preloader. `mode`: `"first-visit"` (default — once per browser session, `sessionStorage['dp:intro-seen']`) \| `"every-load"` \| `"off"`. `src16x9`, `src9x16` (films with sound; 9:16 is used on portrait screens under 768 px), `silent16x9`, `silent9x16` (optional silent cuts, played muted when the visitor has not tapped; empty = the sound version muted), `posters` `{ "16x9", "9x16", "16x9Last", "9x16Last" }` (first/last frames), `cue` (`"film"` = the sound mixed into the film, default; or the `id` of an entry in `cues[]` `{id,label,src (m4a),srcOgg}`, which is then played over the silent cut), `enterLabel` ("Tap to enter", a ✦ is appended), `skipLabel`, `playLabel` (reduced-motion play button), `soundLabel` (switch to sound while it plays muted). Behaviour: poster + Enter; tap → film with sound (falls back to the silent cut muted if sound is refused); no tap for 6 s → silent cut muted (with "Sound on"); reduced motion → no auto-play; Skip always visible, Esc skips; the end crossfades into the hero. Nothing downloads until the overlay shows. Not shown in the Studio preview frame, on `?preview=` URLs or on `#chapter` deep links; `?intro=play` forces it. Files: `assets/film/`. |
| `music` | object | **Page background music** (`js/music.js`). `enabled`, `track` (id in `tracks[]`), `tracks[]` `{id, label, src (m4a/mp3), srcOgg (Opus, preferred where supported)}` — built-ins `loop-a` (shehnai), `loop-b` (bansuri, default), `loop-c` (classical), files in `assets/audio/` with the loop crossfade baked in; `volume` 0–1 (default `0.25`), `autoplayAfterIntro` (default `true` — starts with a fade-in after the intro only if the visitor tapped Enter), `showToggle` (floating equaliser button bottom-left, `aria-pressed`), `label` (its accessible name / tooltip). Never starts without a gesture; the visitor's choice is stored in `localStorage['dp:music']` (`on`/`off`; `on` resumes on their first tap on a later visit). Fades in/out, pauses while the tab is hidden and while the film player or intro plays. Music licence: Pixabay Content License (see `film/music/CHOICES.md`). |

**Readability guarantees (js/themes.js):** every preset exposes `--accent` (the fill of selected / checked / pressed states: wizard chips, estimator toggles, the chosen date, filter chips, open accordion icons, lit process steps) and `--on-accent` (= `--on-gold`), the text colour picked per theme for the best contrast against every stop of that fill (≥ 4.5:1 for the presets). Selected-state rules use these tokens and outrank the light-theme base fills (which are wrapped in `:where()`), so a selected option can never lose its text. On light themes the gold is also deepened automatically (towards `goldDeep`) until it reads at ≥ 4.6:1 on the card/tint surfaces, and light buttons use a gradient that never gets lighter than the gold. The Studio's readability check lists these pairs.

The last applied theme is cached in `localStorage['dp:theme-cache']` and painted from `<head>` on the next visit (no dark flash on light themes). CSS: tokens live on `:root`; `html[data-mode=light|dark]` and `data-theme=<id>` are set on `<html>`; `.on-media` re-scopes tokens for content over photos/video.

### `seo`
| Key | Type | Notes |
|---|---|---|
| `title`, `description` | string | Document title + meta / OG / Twitter. |
| `siteUrl` | URL | Live base URL ending in `/` (e.g. `https://user.github.io/dreamz-planners/`). Empty → the current location is used at runtime. Static tags in `index.html`, `sitemap.xml`, `robots.txt` use the placeholder `https://ayazkshaikh-maker.github.io/dreamz-planners/`. |
| `ogImage` | path/URL | Default `assets/brand/og-image.jpg` (1200×630). |
| `keywords` | string[] | Informational. |

### `contact`
| Key | Type | Notes |
|---|---|---|
| `phones[]` | `{label, number, tel}` | `number` is displayed ("404-488-7643"), `tel` is E.164 ("+14044887643"). First phone is used by the dock "Call" button. |
| `whatsapp.number` | digits | Country code + number, no "+" ("14044887643"). |
| `whatsapp.defaultMessage` | string | Prefilled text for generic WhatsApp links. |
| `instagram.handle`, `instagram.url` | string | |
| `email`, `address` | string | **Leave empty unless the owners provide them.** Hidden when empty. |
| `city`, `region`, `country`, `areaServed` | string | Footer + JSON-LD. |

### `promo` (top marquee bar)
`enabled` boolean · `text` string[] (each item scrolls, separated by ✦) · `speed` number 8–200 (higher = faster) · `colors.bg` / `colors.fg` / `colors.accent` hex · `link` href (default `#begin`).

### `announcement` (popup card, bottom-left)
`enabled` boolean · `id` string (change it to show a new announcement to people who dismissed the old one; dismissal is remembered in `localStorage['dp:ann:<id>']`) · `title` rich · `body` rich · `cta.label`, `cta.href` · `start`, `end` ISO date/time strings (empty = no limit) · `delaySeconds` number.

### `sections[]`
`{ id, label, visible }`. Order of this array = order on the page. `id` must be one of: `hero`, `promise`, `behind`, `celebrations`, `weddings`, `services`, `estimator`, `printing`, `process`, `vendors`, `founders`, `reviews`, `faq`, `begin` (`preloader` is listed for completeness; it always runs). `label` is only for the Studio UI. `visible: false` removes the chapter. The `reviews` chapter additionally stays hidden while there are no published reviews.

### `nav[]`
`{ label, href }` — `href` is usually `#<section id>`.

### `hero` — chapter 1 "The Dream"
`eyebrow` · `headline` rich (split letter by letter) · `sub` rich · `video` media id (any loop or an uploaded MP4/WebM URL) · `poster` optional image id/URL shown while the video loads (use it for uploaded videos, which have no poster) · `ctaPrimary {label, action}` / `ctaSecondary {label, action}` — `action` is `"wizard"` (opens the inquiry wizard) or `"film"` (opens the film player) · `film` media id[] (clips played back-to-back by "Watch the film") · `filmCaption` · `scrollCue`.

### `promise` — chapter 2
`eyebrow` · `text` rich (fills in word by word) · `aside` (small caps line under it).

### `behind` — chapter 3 "Behind the curtain"
`eyebrow` · `title` rich · `quote` · `body` rich · `video` media id (grows from card to full screen; its focal point decides what the small card shows) · `videoLabel` optional accessible description · `side` media id[] (two floating stills).

### `celebrations` — chapter 4 (horizontal reel)
`eyebrow` · `title` rich · `intro` rich · `items[]` `{ id, name (rich), subtitle, description (rich), video (media id), image (media id, used if no video), credit (optional override) }` · `endTitle` rich · `endBody` rich (closing card of the reel).

### `weddings` — chapter 5 "Real weddings"
`eyebrow` · `title` rich · `intro` rich · `trailWord` (big script word in the image-trail strip) · `trailHint` · `stories[]`:

| Key | Type | Notes |
|---|---|---|
| `id` | slug | Used for the anchor `#story-<id>`. |
| `couple` | string | "Faraz & Mahnoor" — the `&` is styled automatically. |
| `event` | string | "Wedding", "Walima"… |
| `summary` | rich | |
| `cover` | media id | Top card of the deck. |
| `video` | media id | Optional (reserved). |
| `gallery` | media id[] | Lightbox order. 1 image → compact layout. |
| `credits[]` | `{role, handle}` | Instagram handle without "@". First credit is shown on the deck + lightbox. |
| `layout` | `"deck"` \| `"compact"` | |
| `instagram` | URL | Optional link to the full post (reserved). |

### `services` — chapter 6
`eyebrow` · `title` rich · `intro` rich · `showPrices` boolean (default `false`; prices are only shown when true **and** an item has a `price`) · `items[]` `{ id, name (rich), summary (rich), includes string[], media (media id for the hover preview), price string }`. Keep the ids `full`, `partial`, `day-of` — the estimator links to them.

### `estimator` — chapter 6b "Celebration builder"
| Key | Type | Notes |
|---|---|---|
| `eyebrow`, `title` (rich), `intro` (rich), `cta`, `disclaimer` | string | |
| `events[]` | `{id, label}` | Toggle chips. |
| `guests` | `{min, max, step, default}` | Slider. |
| `levels[]` | `{id, service, name, maxEvents, maxGuests, leadMonths, note}` | Checked in order; the first level where `events ≤ maxEvents` **and** `guests ≤ maxGuests` wins (last level is the catch-all). `service` = a `services.items[].id`. `leadMonths` drives the timeline. |
| `milestones[]` | `{at, label, body}` | `at` = fraction of `leadMonths` before the day (1 = start, 0 = the day). |
| `copy` | object | UI strings: `eventsLabel`, `guestsLabel`, `emptyEyebrow`, `emptyTitle` (rich), `emptyBody`, `resultEyebrow`, `timelineLabel` (`{months}` placeholder), `dayLabel`, `weeksBefore` / `monthsBefore` (`{n}` placeholder). |

No dollar figures are shown unless `services.showPrices` is true and the matching service has a `price`.

### `printing` — chapter 6c "Printing & stationery"
Rendered by `js/printing.js` (anchor `#printing`, nav link "Printing"). Desktop: the **stationery wall** — pieces hang from gold threads on up to three rails (back rail smaller, rails drift in parallax), sway with scroll velocity, lift forward on hover/focus with a foil sheen and a spec tag; click opens the detail view (`#pdetail`): the card turns over to its specs, photo thumbnails, finishes to pick, price, "Add to quote" and "Request a printing quote". Phones (< 768 px): a swipeable fanned deck with previous/next buttons. Reduced motion (`?motion=reduce` or the OS setting): a tidy grid. Category chips filter the wall.

| Key | Type | Notes |
|---|---|---|
| `eyebrow`, `title` (rich), `intro` (rich) | string | Chapter head. |
| `wallHint`, `mobileHint` | string | Small caps hint under the wall (desktop / phones). |
| `filterAll` | string | Label of the "All" filter chip. Other chips are made from the items' `category` values (in order of first use). |
| `sampleNote` | string | Shown under the wall while any item has `sample: true`. |
| `items[]` | object | The pieces on the wall (order = order on the wall). See below. |
| `optionsTitle` (rich), `optionsIntro` (rich) | string | Head of the paper / finishes block. |
| `options` | object | `papers`, `finishes`, `methods`, `addons` — each `{ label, items: string[] }`. Extra keys with the same shape are shown too. Empty lists are hidden. |
| `packagesTitle` (rich), `packagesIntro` (rich) | string | Head of the packages block. |
| `packages[]` | object | `{ name (rich), includes: string[], price, note, highlight: boolean }`. `price` is shown exactly as typed; **empty → `copy.priceOnRequest`**. `highlight` adds the gold frame + `copy.highlight` flag. Its button opens the wizard with the package named in the message. |
| `copy` | object | UI strings: `priceOnRequest`, `paperLabel`, `finishesLabel`, `unitLabel`, `minQtyLabel`, `leadTimeLabel`, `addToQuote`, `inQuote`, `removeFromQuote`, `quoteTitle`, `quoteEmpty`, `requestQuote`, `flipFront`, `flipBack`, `choosePackage`, `featured`, `sample`, `close`, `prev`, `next`, `highlight`, `wizardService` (the wizard service chip to pre-select, must match an entry of `wizard.services`; default "Printing & stationery"), `wizardNote` (prefix of the wizard message, "Printing quote"). |

`items[]`:

| Key | Type | Notes |
|---|---|---|
| `id` | slug | Unique; used by the quote list. |
| `name` | rich | |
| `category` | string | Filter chip. Keep to a handful (defaults: Invitations, Ceremony & events, Reception, Signage, Favours & packaging, Finishing touches). |
| `description` | rich | Detail view. |
| `images[]` | `{ src, focus, zoom, alt }` or media id string | First image hangs on the wall; all show as thumbnails in the detail view. `src` = media id (e.g. `print-suite-plum-a`) or URL. `focus` = CSS object-position for this placement (falls back to `mediaFocus` / manifest). `zoom` ≥ 1 crops into the photo around `focus` (e.g. `1.8` shows just the wax seal). `alt` overrides the manifest alt text. |
| `finishes` | string[] | Shown on the spec tag (first two) and as selectable chips in the detail view; chosen finishes travel with the quote. |
| `paper` | string | Paper / material. |
| `price` | string | **Default empty.** Shown exactly as typed (`unit` appended as " / unit"); empty shows `copy.priceOnRequest`. Never fill in invented prices. |
| `unit`, `minQty`, `leadTime` | string | Optional; each row is only shown when filled. Defaults are empty. |
| `featured` | boolean | Gold "Featured" ribbon on the wall. |
| `sample` | boolean | Marks a sample design (adds "Sample design" in the detail view and the `sampleNote`). The default items use generated sample photos (manifest tag `printing`, alt text starts "Sample design —"); untick when the photo shows real printed work. |

**Quote list:** "Add to quote" stores `[{ id, finishes[] }]` in `localStorage['dp:print-quote']` (this device only) and shows a tray under the wall. "Request a printing quote" opens the inquiry wizard with `copy.wizardService` pre-selected (added to any services already chosen) and the message prefilled `Printing quote: Name (finish, finish); …`. The lead payload gets `payload.printing = { items: [{id, finishes}], package }`.

**Images:** `assets/media/printing/<id>.webp` (≤ 300 KB, 896×1200) + `assets/media/printing/thumbs/<id>.webp` (600 px wide), listed in `assets/media/manifest.json → stills[]` with tags `printing`, `sample`.

### `features`
`string[]` — content features this saved content already knows about (default `["printing", "intro-music"]`; `intro-music` adds `theme.intro` / `theme.music` and any built-in music track or intro cue missing from a saved list). Because saved arrays replace the defaults as a whole, `js/upgrade.js` (`DP.upgradeContent`, used by the site and the Studio) adds a newly introduced chapter to `sections`, its `nav` link and its wizard option **once** for saved content whose `features` lack it; after the next save the list is stored and owner removals are respected.

### `process` — chapter 7
`eyebrow` · `title` rich · `steps[]` `{ id, title (rich), body (rich) }` (designed for 5).

### `vendors` — chapter 8
`eyebrow` · `title` rich · `intro` rich · `items[]` `{ category, handles string[] }` (Instagram handles without "@"; split into two marquee rows).

### `founders` — chapter 9
`eyebrow` · `title` rich · `intro` rich · `photo` media id · `photoCaption` · `people[]` `{ name, role, instagram (handle), phone (display number, optional), photo (media id/URL, optional — replaces the initials) }`. When no person has a phone, both studio lines from `contact.phones` are shown under the cards.

### `reviews` — chapter 10 "Kind words"
`eyebrow` · `title` rich · `items[]` `{ author, event, body, rating 1–5, published boolean }` — **local fallback only**. Live reviews come from the Supabase `reviews` table (`published = true`, ordered by `sort`). The section is hidden when there are none. Never add invented reviews.

### `faq` — chapter 11
`eyebrow` · `title` rich · `items[]` `{ q, a (rich) }`.

### `begin` — chapter 12
`eyebrow` · `title` rich · `body` rich · `dateCheckTitle` · `dateCheckIntro` · `directTitle`. The inline wizard, date check and direct-contact buttons are generated.

### `dateCheck`
`labels.open` `limited` `booked` `unknown` `past` (status messages) · `copy.prompt`, `copy.ask`, `copy.legendOpen`, `copy.legendLimited`, `copy.legendBooked`.

### `availability[]`
`{ day: "YYYY-MM-DD", status: "open"|"limited"|"booked", note }` — offline fallback. The Supabase `availability` table is the source of truth; dates not listed show the `unknown` label.

### `wizard`
| Key | Type | Notes |
|---|---|---|
| `title` | string | Modal title. |
| `steps` | string[6] | Step names, in order: event, date & guests, services, budget, contact, review. |
| `eventTypes`, `services`, `budgets`, `contactMethods` | string[] | Chip options. Budgets are the visitor's own range, not our prices. `services` includes "Printing & stationery" (pre-selected by the printing chapter's quote buttons). |
| `guests` | `{min, max, default}` | |
| `successTitle` (rich), `successBody` (rich) | string | Success screen. |
| `whatsappIntro` | string | First line of the prefilled WhatsApp summary (`https://wa.me/<contact.whatsapp.number>?text=…`). |
| `consent` | string | Note on the review step (links to privacy.html). |
| `copy` | object | Every question, label and error message of the wizard (`eventQ`, `eventHint`, `dateQ`, `dateLabel`, `guestsLabel`, `flexibleLabel`, `servicesQ`, `servicesHint`, `budgetQ`, `budgetHint`, `contactQ`, `nameLabel`, `phoneLabel`, `emailLabel`, `methodLabel`, `messageLabel`, `reviewQ`, `sending`, `sendWhatsapp`, `restart`, `errEvent`, `errDate`, `errGuests`, `errName`, `errContact`, `errPhone`, `errEmail`, `errSubmit`, `localNote`). |

Lead row written to Supabase `leads` (insert only, no select): `name, phone, email, event_type (events joined by ", "), event_date (YYYY-MM-DD or null), guests, services[], budget, message, source ('website-inline' | 'website-modal'), payload { events[], flexible, contactMethod, page, estimator, printing, ua }`. If the insert fails the row is queued in `localStorage['dp:leadQueue']` and retried on the next visit.

### `footer`
`note` · `copyright` (year is appended automatically) · `links[]` `{label, href}`.

### `labels`
`planCta`, `call`, `whatsapp`, `instagram`, `plan`, `close`, `next`, `back`, `submit`, `skip`, `viewGallery`, `credit`, `callUs`, `news`, `photos`, `nextClip`, `contactOptions`, `backToTop` (footer button + floating button that appears after scrolling far), `lightTheme` / `darkTheme` (visitor toggle labels).
