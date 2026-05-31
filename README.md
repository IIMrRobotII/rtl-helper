# RTL Helper

A Manifest V3 Chrome extension for fixing right-to-left text on websites you
choose.

RTL Mode detects Hebrew, Arabic, and other right-to-left text on an enabled site
and sets the reading direction on the matching block. English words, numbers,
URLs, and filenames stay readable. The setting is saved per site.

Force RTL Layout is separate. It sets the page root to `dir="rtl"` when you want
the whole layout mirrored. It is off by default, saved per site, and reversible.

The extension does not translate text. RTL Mode does not mirror layout. Force RTL
Layout does.

## What it does

- Saves the master switch and per-site settings in `chrome.storage.local`.
- Runs on pages at `document_idle` and applies changes only when the current
  origin is enabled.
- Reapplies settings after reloads and after page content changes.
- Handles normal DOM updates, open shadow roots, and frames.
- Restores previous `dir` values and inline alignment when RTL Mode or Force RTL
  Layout is turned off.
- Has a popup settings view (gear icon) with the theme, a Manage sites page that
  lists every enabled site (filter and remove any), and a reset that clears all saved data.
- Toggles RTL Mode for the current site with a keyboard shortcut: `Alt+R`
  (`MacCtrl+Shift+R` on macOS). Remap it at `chrome://extensions/shortcuts`.
- Uses no analytics, accounts, cookies, external APIs, or network requests.

## Development

Requirements:

- [Bun](https://bun.sh) 1.3 or newer
- Desktop Chrome

Install dependencies:

```sh
bun install
```

Run WXT in development mode:

```sh
bun run dev
```

Build the extension:

```sh
bun run build
```

Load `.output/chrome-mv3` from `chrome://extensions` with Developer mode
enabled.

Useful checks:

```sh
bun run compile
bun run test:run
bun run zip
```

## Permissions

- `storage` saves the master switch, per-site RTL Mode state, per-site Force RTL
  Layout state, and popup theme.
- `<all_urls>` lets the content script reapply saved settings on any site the
  user enables.

The content script does nothing unless the current origin is enabled and the
master switch is on. Chrome blocks extensions on `chrome://`, the Chrome Web
Store, and other restricted pages.

## Privacy

The extension stores preferences locally and does not save page text. Page text
is read in memory only to detect right-to-left characters.

See the [Privacy Policy](https://iimrrobotii.github.io/RTL-Helper/privacy/).
