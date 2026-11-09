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
  title: 'Fikri & Alya',

  // 2. Event Type / Subtitle (Displayed above the main couple name)
  eventType: {
    en: 'Wedding Celebration', // e.g. 'Wedding Celebration', 'Reception Ceremony'
    ms: 'Majlis Perkahwinan',      // e.g. 'Majlis Perkahwinan', 'Majlis Kesyukuran'
  },

  // 3. Event Date
  date: {
    en: '19 December 2026',
    ms: '19 Disember 2026',
    numeric: '19.12.2026',        // Used in photobooth strip taglines & stamps
  },

  // 4. Event Venue / Location
  venue: 'Sentosa Villa Resort',

  // 5. Social Media Hashtag
  hashtag: '#FikriAlya',

  // 5b. Cover Welcome Quote (Displayed on the main landing page)
  welcomeMessage: {
    en: 'We’re so thrilled to celebrate with you! Snap your favorite moments, strike a pose, and leave your sweetest wishes to make today’s memories last forever!',
    ms: 'Kami amat teruja meraikan hari bahagia ini bersama anda! Rakam momen terindah, bergaya di photobooth, dan titipkan ucapan paling manis buat kenangan abadi kami!',
  },

  // 6. Photobooth Studio Strip Customization
  photobooth: {
    // Couple names printed on the photobooth strips (e.g. 'Fikri & Alya')
    // If left blank or omitted, it automatically uses EVENT_CONFIG.title
    coupleNames: 'Fikri & Alya',

    // Date printed on photobooth strips (e.g. '19.12.2026')
    // If left blank or omitted, it automatically uses EVENT_CONFIG.date.numeric
    date: '19.12.2026',

    // Tagline / Subtitle printed on photobooth strips
    tagline: 'romantic memories',
  },

  // 7. Cover Photos (Save new photos in /public/assets/img/ folder)
  images: {
    // Couple portrait avatar (circular photo on front page cover)
    avatar: '/assets/img/arman-farah-welcome.jpg',
    // Background venue image (full-bleed cinematic cover photo)
    background: '/assets/img/arman-farah-venue.png?v=2',
  },

  // 8. Supabase Cloud Database (For Live Wall & Online Guestbook)
  supabase: {
    // TIP: You can use ONE single Supabase project across ALL your customers!
    // Simply change the eventId below for each new customer.
    url:
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      'https://msrdrslqdgqvbdpvfvgi.supabase.co',
    anonKey:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zcmRyc2xxZGdxdmJkcHZmdmdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI0MTI0NzgsImV4cCI6MjEwNzk4ODQ3OH0.sJvuIyvNUzNjYOASNKFAsnVAB-BbheLXGduGc0GA4qg',
    // Unique ID for this customer so wishes never mix with other events
    eventId: 'fikri-alya', // e.g. 'aiman-dahlia', 'sarah-daniel'
  },

  // 9. Google Drive Photo Storage
  googleDrive: {
    // Deployed Web App URL from script.google.com
    scriptUrl:
      process.env.NEXT_PUBLIC_GOOGLE_SCRIPT_URL ||
      'https://script.google.com/macros/s/AKfycbzZ9b0vTB3bzSRoTjRj6Ak1LSdKJz5JLAYg2PHEsZGUcdGQ-wIC9CYEwiJwav5lOwJC/exec',
    // Direct link to the customer's Google Drive folder (leave empty if not needed)
    folderUrl: 
      process.env.NEXT_PUBLIC_GOOGLE_DRIVE_FOLDER_URL ||
      '',
  },

  // 10. Host Admin PIN (Default PIN for /admin moderation page)
  adminPin: '1234',

  // 11. Photo Upload Limit (Total allowed across Gallery, Selfie & Photobooth)
  // Set to 500 or any custom number. Change anytime!
  photoUploadLimit: 5000,
};
