# Talan Gray Portfolio (Vite + Vanilla JS)

Cinematic, mobile-friendly portfolio site scaffold for a voice actor, built to match the provided PRD using free-tier tooling.

## Stack

- Vite (free, lightweight)
- Vanilla HTML/CSS/JS
- Formspree (free tier) for secure contact submissions (no backend required)

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Configure Formspree endpoint:

```bash
copy .env.example .env
```

Set `VITE_FORMSPREE_ENDPOINT` in `.env` to your Formspree endpoint URL (example: `https://formspree.io/f/abcde123`).

3. Start dev server:

```bash
npm run dev
```

4. Build for production:

```bash
npm run build
```

## Formspree Notes

- The site uses a client-side POST to Formspree with `Accept: application/json`.
- No API keys are committed.
- For CI/CD, inject `VITE_FORMSPREE_ENDPOINT` as a GitHub Actions secret at build time.

## Replace Before Launch

- `booking@talangrayvoice.com` (placeholder contact email)
- Social URLs (`instagram.com/talangrayvoice`, `youtube.com/@talangrayvoice`) if different
- About copy and exact studio gear brands/models
- Placeholder audio reels in `public/audio/`

## Audio Optimization Guidance

The included audio files are placeholder WAVs for local testing of the custom player controls.

Before launch, replace them with compressed files (MP3 or AAC) and target:

- `<= 2 MB` short demos when possible
- `44.1kHz` or `48kHz`
- `preload="metadata"` kept as-is (already configured)
