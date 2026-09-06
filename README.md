# Photoblog

A minimal, modern static photoblog built with **Vite + TypeScript**.  
Designed for GitHub Pages. No database. Just drop photos into a folder.

## Features

- **Masonry grid** with soft cards
- **Sidecar JSON** for optional title & description
- **EXIF extraction** (camera, lens, aperture, shutter, ISO, focal length) shown as secondary info
- **Date & time** taken displayed on every photo
- **Archive** page grouped by year → month
- Tiny runtime, fast, English UI (titles/descriptions can be any language)

## Quick start

```bash
npm install
npm run dev
```

## Adding a photo

1. Put the image file in `public/photos/`  
   Example: `public/photos/2024-sunset.jpg`

2. (Optional) Create a sidecar next to it:  
   `public/photos/2024-sunset.json`

   ```json
   {
     "title": "Golden hour over the hills",
     "description": "Taken from the ridge after a long walk."
   }
   ```

3. Rebuild / regenerate:

   ```bash
   npm run generate   # only updates photos.json
   # or
   npm run dev        # generate + start dev server
   npm run build      # generate + production build
   ```

If the sidecar is missing, the photo appears without title or description.

## Deploy to GitHub Pages

1. Push the repo to GitHub.
2. Enable **GitHub Pages** → Source: **GitHub Actions**.
3. The included workflow (`.github/workflows/deploy.yml`) builds and deploys on every push to `main`.

> The site uses relative paths (`base: './'`), so it works both as  
> `https://username.github.io/` and `https://username.github.io/repo-name/`.

## Project structure

```
public/
  photos/          ← drop your images here
  data/
    photos.json    ← auto-generated index
src/
  main.ts          ← app + routing
  style.css        ← modern minimal design
  types.ts
scripts/
  generate-photos.ts  ← EXIF + sidecar scanner
```

## Tech

- Vite 6
- TypeScript
- exifr (build-time EXIF)
- Hash-based routing (works on static hosts)
- Pure CSS masonry + dark mode via `prefers-color-scheme`
