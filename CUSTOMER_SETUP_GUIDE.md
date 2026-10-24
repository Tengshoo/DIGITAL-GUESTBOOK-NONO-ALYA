# 📋 Working Instructions: Customer Onboarding & Setup Guide
### Digital Guestbook & Live Wall System

This document is your complete Standard Operating Procedure (SOP) to quickly customize and deploy this digital guestbook application for each new customer (weddings, engagements, corporate events, etc.).

---

## ⚡ Quick 3-Step Summary

For each new customer, you only need to:
1. **Edit ONE File**: [`src/config/eventConfig.ts`](file:///src/config/eventConfig.ts) with the customer's event details.
2. **Replace 2 Images**: In [`public/assets/img/`](file:///public/assets/img/) (Couple Avatar & Venue Background).
3. **Create Google Drive Folder**: Get the Folder ID & paste it into Google Apps Script.

---

## 🛠️ Step 1: Edit Event Information (`src/config/eventConfig.ts`)

Open [`src/config/eventConfig.ts`](file:///src/config/eventConfig.ts). All event data across the entire website (Cover, Guestbook, Photobooth Studio, Live Wall, and Admin) updates automatically from this single configuration:

```typescript
export const EVENT_CONFIG = {
  // 1. Couple or Event Main Names
  title: 'Atif & Isma', // Change to e.g. 'Aiman & Dahlia' or 'Sarah & Daniel'

  // 2. Event Type / Subtitle (Shown above the main names)
  eventType: {
    en: 'Engagement Celebration', // e.g. 'Wedding Celebration', 'Reception Banquet'
    ms: 'Majlis Pertunangan',      // e.g. 'Majlis Perkahwinan', 'Majlis Kesyukuran'
  },

  // 3. Event Date
  date: {
    en: '26 December 2026',        // English format (e.g. '12 September 2026')
    ms: '26 Disember 2026',        // Malay format (e.g. '12 September 2026')
    numeric: '26.12.2026',         // Used on photobooth strip stamps & badges
  },

  // 4. Venue & Location
  venue: 'OneTwoKL',               // Change to e.g. 'Dewan Seri Melati, Putrajaya'

  // 5. Social Media Hashtag
  hashtag: '#AtifFoundIsma',       // e.g. '#AimanDahlia', '#ForeverSarah'

  // 6. Cover Images (Place image files in /public/assets/img/)
  images: {
    // Couple portrait avatar (circular image on cover)
    avatar: '/assets/img/customer-avatar.jpg',
    // Background venue image (full-bleed cinematic photo for Home & Live Wall)
    background: '/assets/img/customer-venue.jpg',
  },

  // 7. Supabase Database (Wishes & Live Wall)
  supabase: {
    // 💡 REUSE TIP: Keep the same url & anonKey for all your clients!
    url: 'https://xyzcompany.supabase.co',
    anonKey: 'eyJh...',
    // Change this unique ID for each customer (e.g. 'aiman-dahlia'):
    eventId: 'atif-isma',
  },

  // 8. Google Drive Photo Storage
  googleDrive: {
    scriptUrl: 'https://script.google.com/macros/s/.../exec',
    folderUrl: 'https://drive.google.com/drive/folders/YOUR_FOLDER_ID',
  },

  // 9. Host Admin PIN (For /admin moderation dashboard)
  adminPin: '1234',                // Give this PIN to the couple/emcee

  // 10. Photo Upload Limit (Total allowed across Gallery, Selfie & Photobooth)
  photoUploadLimit: 500,           // Change to any number (e.g. 100, 300, 500, 1000)
};
```

---

## 🖼️ Step 2: Customer Photos & Backgrounds

Save the customer's two cover images inside the [`public/assets/img/`](file:///public/assets/img/) folder:

| Image Asset | Recommended Specs | Purpose |
| :--- | :--- | :--- |
| **Avatar Photo** (`avatar`) | `800 x 800 px` (1:1 Square/Circle), JPG or PNG | Circular portrait of the couple on the front cover. |
| **Backdrop Image** (`background`) | `1920 x 1080 px` (16:9 Landscape) or `1080 x 1920 px` (Portrait), JPG | Full-bleed cinematic venue background photo applied to **both Home Cover (`/`) and Live Wall (`/wall`)** with automatic contrast vignette. |

> **Pro Tip**: Use compressed JPG or WebP images under **1MB** each to ensure instantaneous loading on mobile data at the wedding venue.

---

## 📁 Step 3: Google Drive Folder Setup (Per Customer)

Each customer should have their own private Google Drive folder where all their guest photos and photobooth strips will stream in real time.

### Instructions:
1. Open [Google Drive](https://drive.google.com) and create a folder (e.g. *"Aiman & Dahlia Guestbook Photos"*).
2. Open the folder and copy the **Folder ID** from the URL bar:
   `https://drive.google.com/drive/folders/`**`1a2b3c4d5e6f7g8h9i0j...`**
3. Open [Google Apps Script](https://script.google.com):
   - You can reuse the existing project or create a new project.
   - Paste the code from [`google-drive-apps-script.js`](file:///google-drive-apps-script.js).
   - Paste the customer's `FOLDER_ID` on **Line 31**:
     ```javascript
     var FOLDER_ID = "YOUR_NEW_CUSTOMER_FOLDER_ID";
     ```
   - (Optional) If the customer also wants a live spreadsheet log of all wishes, create a Google Sheet and paste its `SPREADSHEET_ID` on **Line 34**.
4. Click **Deploy** ➔ **Manage deployments** ➔ Edit (Pencil icon) ➔ Set version to **New version** ➔ Click **Deploy**.
5. Copy the Web App URL and update `scriptUrl` and `folderUrl` in [`src/config/eventConfig.ts`](file:///src/config/eventConfig.ts).

---

## 📸 Step 4: Photo Upload Limit Configuration

By default, each event has a **500 photo upload limit** to protect your storage and keep the live wall running fast. This limit encompasses:
* **Gallery Uploads** (guest uploads from mobile camera roll)
* **Live Camera Selfies** (guest snaps with smartphone camera)
* **Photobooth Strips** (strips created & submitted in Photobooth Studio)

### How to adjust the limit:
In [`src/config/eventConfig.ts`](file:///src/config/eventConfig.ts), change line 70:
```typescript
photoUploadLimit: 500, // Change anytime (e.g. 200, 300, 500, 1000)
```

### What happens when the limit is reached?
* **Polite Notification**: Guests see a respectful banner: *"Photo upload limit of 500 has been reached. You are still warmly invited to send text wishes and voice notes!"*
* **Wishes Never Blocked**: Guests can **always** continue submitting warm wishes and voice messages even after the photo limit is reached!
* **Photobooth Keeps Working**: In Photobooth Studio, guests can still take fun pictures and download their strip to their phone!
* **Admin Visibility**: The Host Admin dashboard ([`/admin`](file:///admin)) displays the live photo counter: e.g. **`Photo Uploads: 142 / 500`**.

---

## 🗄️ Step 5: Supabase Database (Do You Need a New Project? NO!)

**Question**: *Do you need to create a brand new Supabase project for every customer repository?*
**Answer**: **NO! You can use ONE single Supabase project across ALL your customer repositories.**

Supabase free tier limits accounts to 2 active projects. To avoid paying or hitting limits, this project features **built-in multi-tenant event isolation**:

### How it works:
1. Keep the exact same `url` and `anonKey` from your main Supabase project in every customer's repo.
2. In `src/config/eventConfig.ts`, simply give each customer a unique `eventId` (e.g. `'atif-isma'`, `'aiman-dahlia'`, `'sarah-daniel'`).
3. The guestbook automatically stores and filters wishes by that `eventId`.
4. Guests attending *Aiman & Dahlia's* wedding will **never** see wishes from *Atif & Isma's* wedding!

```typescript
supabase: {
  url: 'https://your-main-project.supabase.co', // Same for all clients
  anonKey: 'eyJhbGciOi...',                    // Same for all clients
  eventId: 'aiman-dahlia',                     // ✨ ONLY change this per customer!
}
```

> **Note**: If a VIP or corporate client ever requires their own dedicated Supabase database project for data compliance, you can simply paste their new project's `url` and `anonKey` into `eventConfig.ts`.

### ⚙️ One-Time Supabase Setup (Only needed once on your main project)
In your Supabase project's **SQL Editor**, run [`supabase_schema.sql`](file:///supabase_schema.sql) (or run this quick command to ensure error-free moderation):
```sql
-- Ensure event_id exists and disable RLS so /admin can approve/hide without restriction
alter table public.entries add column if not exists event_id text default 'default';
alter table public.entries disable row level security;
```

---

## 🧪 Step 6: Test & Verify Locally

In your terminal, test the customer's website before building:

```bash
# 1. Start local dev server
npm run dev
```

Visit the following pages in your browser:
* **Home Page**: `http://localhost:3000/` ➔ Verify names, date, venue, hashtag, and couple photo.
* **Photobooth Studio**: `http://localhost:3000/photobooth` ➔ Snap test photos and verify strip rendering & downloads.
* **Live Wall**: `http://localhost:3000/wall` ➔ Check the projector view, verify the venue background photo, and test the 2xN mobile grid toggle.
* **Admin Dashboard**: `http://localhost:3000/admin` ➔ Enter PIN (default `1234`), check the Photo Uploads counter (`X / 500`), test hiding/approving entries, delete test wishes, and click the **Google Drive** folder shortcut button.

---

## 🚀 Step 7: Build & Deploy to Production (GitHub Pages)

### 1. Build & Push Code:
```bash
# 1. Build the optimized static bundle
npm run build

# 2. Commit and push to GitHub
git add .
git commit -m "chore: setup event for [Customer Name]"
git push origin main
```

### 2. Configure GitHub Pages (In your GitHub Repository):
1. Go to your repository on GitHub.
2. Click **Settings** ➔ **Pages** (in the left sidebar).
3. Under **Build and deployment > Source**, select: **GitHub Actions**.
4. (Optional) If using a custom subdomain (e.g. `clientname.memoira.art`), enter it under **Custom domain** and save.
5. GitHub Actions will build and deploy the website automatically within 60 seconds!

---

## 📌 Checklist for Every Customer

- [ ] Updated Couple Names in `src/config/eventConfig.ts`
- [ ] Updated Event Type (Wedding / Engagement / Reception)
- [ ] Updated Event Date (English, Malay, Numeric)
- [ ] Updated Venue Location & Hashtag
- [ ] Added Couple Avatar & Venue Backdrop into `public/assets/img/` (Applies to both Home & Live Wall)
- [ ] Set Photo Upload Limit in `src/config/eventConfig.ts` (Default: `500`)
- [ ] Set Unique Supabase `eventId` (e.g. `'aiman-dahlia'`) in `src/config/eventConfig.ts`
- [ ] Configured Customer Google Drive Folder ID & Script URL in Apps Script & `eventConfig.ts`
- [ ] Set Host Admin PIN (Shared with the client/emcee)
- [ ] Verified Live Wall (`/wall`) displays venue background & QR code
- [ ] Tested Admin (`/admin`) photo counter, hide/delete moderation and CSV export
- [ ] Ran `npm run build` with 0 errors
- [ ] Pushed to GitHub & verified live deployment on GitHub Pages
