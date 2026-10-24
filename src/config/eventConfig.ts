/**
 * =========================================================================
 * 👰🤵 CUSTOMER EVENT CONFIGURATION (PANDUAN KONFIGURASI PELANGGAN)
 * =========================================================================
 * 
 * Edit this ONE file for every customer/event!
 * All pages (Cover, Guestbook, Photobooth Studio, Live Wall, and Admin Dashboard)
 * will automatically update with these details.
 * 
 * =========================================================================
 */

export const EVENT_CONFIG = {
  // 1. Couple or Event Main Names (e.g. 'Atif & Isma', 'Aiman & Dahlia')
  title: 'Atif & Isma',

  // 2. Event Type / Subtitle (Displayed above the main couple name)
  eventType: {
    en: 'Engagement Celebration', // e.g. 'Wedding Celebration', 'Reception Ceremony'
    ms: 'Majlis Pertunangan',      // e.g. 'Majlis Perkahwinan', 'Majlis Kesyukuran'
  },

  // 3. Event Date
  date: {
    en: '26 December 2026',
    ms: '26 Disember 2026',
    numeric: '26.12.2026',        // Used in photobooth strip taglines & stamps
  },

  // 4. Event Venue / Location
  venue: 'OneTwoKL',

  // 5. Social Media Hashtag
  hashtag: '#AtifFoundIsma',

  // 6. Cover Photos (Save new photos in /public/assets/img/ folder)
  images: {
    // Couple portrait avatar (circular photo on front page cover)
    avatar: '/assets/img/arman-farah-welcome.jpg',
    // Background venue image (full-bleed cinematic cover photo)
    background: '/assets/img/arman-farah-venue.png?v=2',
  },

  // 7. Supabase Cloud Database (For Live Wall & Online Guestbook)
  supabase: {
    // TIP: You can use ONE single Supabase project across ALL your customers!
    // Simply change the eventId below for each new customer.
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    // Unique ID for this customer so wishes never mix with other events
    eventId: 'atif-isma', // e.g. 'aiman-dahlia', 'sarah-daniel'
  },

  // 8. Google Drive Photo Storage
  googleDrive: {
    // Deployed Web App URL from script.google.com
    scriptUrl:
      process.env.NEXT_PUBLIC_GOOGLE_SCRIPT_URL ||
      'https://script.google.com/macros/s/AKfycbxmqBSEM_3emvagMiClkb9yN1VNalC7joWLkYymvi8fk14xq1SexXeeIs2JS88zX27-/exec',
    // Direct link to the customer's Google Drive folder (leave empty if not needed)
    folderUrl:
      process.env.NEXT_PUBLIC_GOOGLE_DRIVE_FOLDER_URL ||
      '',
  },

  // 9. Host Admin PIN (Default PIN for /admin moderation page)
  adminPin: '1234',

  // 10. Photo Upload Limit (Total allowed across Gallery, Selfie & Photobooth)
  // Set to 500 or any custom number. Change anytime!
  photoUploadLimit: 5000,
};
