# Sticker Bridge

A responsive prototype for organizing sticker copies and guiding a handoff between Instagram and WhatsApp. It keeps a recent-stickers shelf locally in the browser and handles the file preparation without asking users to choose a format.

## Put it on GitHub Pages (free hosting)

1. Create a free account at [github.com](https://github.com) if you don't have one, then click **New repository**. Name it anything (for example `sticker-bridge`), keep it Public, and do **not** add a README (this folder already has one).
2. Upload the files: on the new repo page click **uploading an existing file**, then drag in `index.html`, `app.js`, `styles.css`, `sw.js`, `manifest.webmanifest`, `README.md`, `.nojekyll`, and the `assets` folder. Click **Commit changes**.
3. Turn on Pages: **Settings → Pages** → under *Build and deployment* set Source to **Deploy from a branch**, Branch **main** / **/(root)** → **Save**.
4. Wait a minute or two, then open `https://<your-username>.github.io/sticker-bridge/`.

## Install it on your phone

- **Android (Chrome):** open the Pages link → tap the **⋯** menu → **Add to Home screen** / **Install app**.
- **iPhone (Safari):** open the Pages link → tap the **Share** button → **Add to Home Screen**.

It opens full-screen like an app and works offline; your Recents are stored on that device.

## Updating later

After editing files, commit and push (or re-upload) them, and bump `CACHE_NAME` in `sw.js` (for example `sticker-bridge-shell-v2`) so phones pick up the new version.

## Run it locally

Open `index.html` in a modern browser. If your browser restricts IndexedDB on `file://` pages, serve this folder with any static web server and open its local address.

## Current scope

- Choose which app a sticker starts in; the destination is selected automatically.
- Import an image by browsing or drag-and-drop and prepare a copy for the other app.
- Keep copies in Recents using IndexedDB on this device.
- Search and filter recent stickers, or remove individual entries.
- No upload or account connection is required.

## Platform boundary

This browser prototype cannot read the private sticker trays inside either app or insert stickers into them. It prepares a local image copy and leaves the final add/share step to the user. Instagram Cutouts are saved for reuse inside Instagram; WhatsApp's official third-party sticker path is a native app-provided pack that the user explicitly adds. A real bridge needs native mobile app work and user-mediated import from each source. See the official [Instagram Cutouts announcement](https://about.fb.com/news/2024/05/new-stickers-in-instagram-stories/) and [WhatsApp sticker integration sample](https://github.com/WhatsApp/stickers).

Animated stickers and automatic two-way tray sync are not included.
