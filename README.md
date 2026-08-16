# Roja Radio — 90s Telugu Nostalgia

Next.js App Router single-page nostalgia music site.

## Run

```bash
npm install
npm run dev
```

Open `http://localhost:4000`.

## Add music

Edit `app/tracks.ts`. Each licensed/rightsholder-owned embeddable YouTube upload is one line:

```ts
"Roja Radio": [
  { id: "roja-01", title: "Your licensed track", artist: "Artist", film: "Film", year: 1995, duration: 274, videoId: "YOUR_VIDEO_ID" },
],
```

Do not add copyrighted tracks unless you have permission to use/embed them. The player uses the visible YouTube IFrame Player API rather than downloading or re-hosting thumbnails/audio.

## Assets

- `public/bg/scene-wide.png` — landscape background
- `public/bg/scene-tall.png` — portrait background
