# EverAfter — Event & Wedding Digital Guestbook

A modern, full-stack Event & Wedding Digital Guestbook application built with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, and **SQLite (`better-sqlite3`)**.

Designed with celebration aesthetics (champagne gold, warm neutrals, soft blush rose, and subtle shadows), fully mobile-responsive, and optimized for live projection on large displays.

---

## ✨ Features

### 1. 📱 Memoira-Style Celebration Front Page (`/`)
- **Cinematic Event Cover**: Full-bleed wedding venue backdrop (`/assets/img/demo-background-venue.jpg`) with dark ambient vignette, circular couple avatar portrait (`/assets/img/demo-welcome.png`) with champagne gold ring, event mini title (*"Majlis Perkahwinan"*), couple headline (*"Aiman & Dahlia"*), event metadata (Date & Venue), and welcoming message.
- **Guest Name Entry & Direct Actions**:
  - Name input box with smooth glassmorphism container.
  - Primary CTA: **"Kongsikan Momen"** (Share Moments / Open Camera & Wishes Sheet).
  - Secondary CTA: **"Buka Galeri & Live Wall"** (Direct link to `/wall`).
  - Quick action shortcuts: 📸 Ambil Gambar, 💌 Tulis Ucapan, 🎙️ Mesej Suara.
- **Interactive Submission Modal / Drawer**:
  - Guest Name & Well Wishes.
  - **Photo & Selfie Capture with 4 Filter Sets & Optional Cute Frames**: Direct smartphone camera capture or gallery upload with client-side image compression, 4 real-time filter styles, and aesthetic optional frames:
    - **4 Filter Sets**: Original (Natural & True), Champagne Warm (Golden celebration glow), Classic Noir (Timeless monochrome B&W), and Blush Romance (Soft romantic rose tint).
    - **Aesthetic & Cute Frames (Optional)**:
      1. **No Frame** (Natural, borderless photo — default optional)
      2. **Classic Polaroid** (Iconic vintage film border with handwritten *"forever & always ♡"*)
      3. **Golden Elegance** (Champagne gold foil double hairline & corner sparkles `✦`)
      4. **Cute Hearts** (Doodled pastel hearts, dashed borders & *"✨ so much love ✨"*)
      5. **Blush Ribbon** (Soft rose wedding border with delicate stars & *"with love & joy ♡"*)
  - **Voice Note Recorder**: Browser `MediaRecorder` API with live duration timer, waveform animation, and playback preview (exports base64 audio).
- **Celebration Confetti**: Dynamic multi-stage confetti burst on submission (`canvas-confetti`) with a warm "Thank You!" view and an option to sign another note.

### 2. 📺 Live Projector & Wall Mode (`/wall`)
- **Cinematic Event Display**: Designed for a venue TV, projector, or LED event wall.
- **Real-Time Polling**: Automatically polls `/api/entries` every 5 seconds for newly approved toasts.
- **7-Second Auto-Cycle**: Smooth fade transitions with visual progress countdown.
- **Polaroid Styling**: Displays photos with paper drop-shadows, calligraphy quotes, signatures, and inline voice note audio players.
- **Wall Controls**:
  - Fullscreen toggle (`F11` or on-screen button).
  - Pause / Play / Next / Prev slideshow controls.
  - Gallery Grid toggle (switch between Spotlight Slideshow and Grid Collage).
  - On-screen **Guest QR Code Modal** so attendees can scan and sign right from the big screen!

### 3. 🛡️ Host Moderation Dashboard (`/admin`)
- **PIN Protected**: Default PIN is `1234` (configurable via `ADMIN_PIN` environment variable).
- **Live Metrics**: Total Notes, Live on Screen, Hidden/Flagged, Notes with Photos, Voice Wishes.
- **Fast Moderation**: Quick one-click "Approve / Hide" toggle to instantly control what appears on the projector wall.
- **Search & Filter**: Search by guest name or message keywords; filter by All, Approved, or Hidden.
- **Entry Deletion**: Safe deletion with confirmation prompt.
- **Data Export**: One-click **CSV Export** and **JSON Backup** for the couple to keep forever.

### 4. 🗄️ Backend API & SQLite Database
- Database initialized in `src/lib/db.ts` with SQLite WAL mode (`better-sqlite3`).
- Automatic table creation for `entries` (`id`, `name`, `message`, `photo_url`, `signature_svg`, `audio_url`, `is_approved`, `created_at`).
- Seed sample celebration entries on first launch.
- Endpoints:
  - `GET /api/entries` — Returns approved entries ordered by `created_at DESC`.
  - `POST /api/entries` — Validates and inserts a new guest submission.
  - `GET /api/admin/entries` — Returns all entries (PIN protected).
  - `PATCH /api/admin/entries` — Updates entry approval status (PIN protected).
  - `DELETE /api/admin/entries` — Deletes entry (PIN protected).

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Production Build & Run
```bash
npm run build
npm run start
```

---

## 🔑 Host Admin PIN

- Default PIN: `1234`
- To customize, set the environment variable in `.env.local`:
  ```env
  ADMIN_PIN=5678
  ```

---

## 📂 Project Structure

```
├── data/
│   └── guestbook.db              # SQLite database (auto-created)
├── src/
│   ├── app/
│   │   ├── admin/page.tsx        # Host moderation dashboard
│   │   ├── api/
│   │   │   ├── admin/entries/    # Admin GET, PATCH, DELETE endpoints
│   │   │   └── entries/          # Public GET, POST endpoints
│   │   ├── wall/page.tsx         # Live projector wall & slideshow
│   │   ├── globals.css           # Custom typography, fonts & luxury styles
│   │   ├── layout.tsx            # Celebration layout & header navigation
│   │   └── page.tsx              # Guest submission form
│   ├── components/
│   │   ├── AudioPlayer.tsx          # Reusable voice note audio player
│   │   ├── PhotoFilterSelector.tsx  # 4-set photo filter picker with canvas export
│   │   ├── PhotoFrameSelector.tsx   # Aesthetic & cute frames with canvas export
│   │   └── VoiceRecorder.tsx        # Voice recording with live preview
│   └── lib/
│       └── db.ts                 # better-sqlite3 database connection & queries
├── next.config.mjs               # Next.js configuration (better-sqlite3 externals)
├── tailwind.config.js            # Custom champagne, rose, and warm palettes
└── tsconfig.json                 # TypeScript configuration
```
