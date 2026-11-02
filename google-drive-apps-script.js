/**
 * =========================================================================
 * ATIF & ISMA DIGITAL GUESTBOOK - GOOGLE DRIVE UPLOAD SCRIPT
 * =========================================================================
 * 
 * Instructions to set up in 2 minutes:
 * 
 * 1. Open Google Drive (drive.google.com) and CREATE A FOLDER (e.g. "Atif & Isma Guestbook Photos").
 * 2. Open the folder and COPY THE FOLDER ID from the URL in your browser:
 *    Example URL: https://drive.google.com/drive/folders/1a2b3c4d5e6f7g8h9i0j
 *    Your Folder ID is the part after "/folders/": "1a2b3c4d5e6f7g8h9i0j"
 * 3. Go to https://script.google.com and click "New Project".
 * 4. Replace everything in the editor with this entire code.
 * 5. Paste your FOLDER_ID below on line 31.
 * 6. (Optional) If you also want a Google Sheet log, paste a SPREADSHEET_ID on line 34.
 * 7. Click "Deploy" (top right) -> "New deployment".
 * 8. Click the gear icon next to "Select type" -> choose "Web app".
 * 9. Set:
 *    - Description: "Digital Guestbook Photo Receiver"
 *    - Execute as: "Me (your email)"
 *    - Who has access: "Anyone" (VERY IMPORTANT: must be Anyone so guests can upload without logging in)
 * 10. Click "Deploy", authorize permissions when prompted.
 * 11. Copy the "Web app URL" (starts with https://script.google.com/macros/s/.../exec).
 * 12. Add this URL into your website's eventConfig.ts (or environment variables) as:
 *     NEXT_PUBLIC_GOOGLE_SCRIPT_URL=https://script.google.com/macros/s/.../exec
 *     NEXT_PUBLIC_GOOGLE_DRIVE_FOLDER_URL=https://drive.google.com/drive/folders/YOUR_FOLDER_ID
 * =========================================================================
 */

// >>> PASTE YOUR GOOGLE DRIVE FOLDER ID HERE <<<
var FOLDER_ID = "YOUR_GOOGLE_DRIVE_FOLDER_ID";

// >>> (OPTIONAL) PASTE GOOGLE SPREADSHEET ID HERE FOR AUTOMATIC WISHES SPREADSHEET <<<
var SPREADSHEET_ID = ""; // Leave blank if you only want the Drive folder

// Maximum allowed Base64 payload length (~3.5MB image)
var MAX_BASE64_LENGTH = 5000000;

/**
 * Prevent spreadsheet formula injection by prefixing leading formula characters with a single quote
 */
function sanitizeForSheet(value) {
  var str = String(value || "").trim();
  if (/^[=+\-@\t\r]/.test(str)) {
    return "'" + str;
  }
  return str;
}

/**
 * Verify decoded byte array starts with valid JPEG, PNG, or WebP magic bytes
 */
function detectImageMimeType(bytes) {
  if (!bytes || bytes.length < 12) return null;

  var b0 = bytes[0] & 0xff;
  var b1 = bytes[1] & 0xff;
  var b2 = bytes[2] & 0xff;
  var b3 = bytes[3] & 0xff;

  // JPEG: FF D8 FF
  if (b0 === 0xff && b1 === 0xd8 && b2 === 0xff) {
    return "image/jpeg";
  }

  // PNG: 89 50 4E 47
  if (b0 === 0x89 && b1 === 0x50 && b2 === 0x4e && b3 === 0x47) {
    return "image/png";
  }

  // WebP: "RIFF" .... "WEBP"
  var b8 = bytes[8] & 0xff;
  var b9 = bytes[9] & 0xff;
  var b10 = bytes[10] & 0xff;
  var b11 = bytes[11] & 0xff;
  if (
    b0 === 0x52 && b1 === 0x49 && b2 === 0x46 && b3 === 0x46 &&
    b8 === 0x57 && b9 === 0x45 && b10 === 0x42 && b11 === 0x50
  ) {
    return "image/webp";
  }

  return null;
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return responseJSON({ status: "error", message: "No data received" });
    }

    if (e.postData.contents.length > MAX_BASE64_LENGTH + 50000) {
      return responseJSON({ status: "error", message: "Payload too large" });
    }

    var data = JSON.parse(e.postData.contents);
    var base64Image = String(data.image || "");
    var guestName = String(data.guestName || "Guest").trim().slice(0, 100) || "Guest";
    var message = String(data.message || "").trim().slice(0, 2000);

    var safeFilenameBase = String(
      data.filename ||
      ("Guestbook_" + guestName.replace(/[^a-zA-Z0-9]/g, "_") + "_" + Utilities.formatDate(new Date(), "GMT+8", "yyyyMMdd_HHmmss") + ".jpg")
    )
      .replace(/[^a-zA-Z0-9_\-.]/g, "_")
      .slice(0, 120);

    if (!/\.(jpe?g|png|webp)$/i.test(safeFilenameBase)) {
      safeFilenameBase += ".jpg";
    }

    if (!base64Image) {
      return responseJSON({ status: "error", message: "No image provided" });
    }

    if (base64Image.length > MAX_BASE64_LENGTH) {
      return responseJSON({ status: "error", message: "Image exceeds maximum allowed size" });
    }

    // 1. Get the target Google Drive Folder
    var folder = DriveApp.getFolderById(FOLDER_ID);
    if (!folder) {
      return responseJSON({ status: "error", message: "Folder not found" });
    }

    // 2. Decode and validate the Base64 image
    var cleanBase64 = base64Image.replace(/^data:image\/(jpeg|jpg|png|webp);base64,/i, "");
    var decoded = Utilities.base64Decode(cleanBase64);
    var detectedMime = detectImageMimeType(decoded);
    if (!detectedMime) {
      return responseJSON({ status: "error", message: "Invalid image format" });
    }

    var blob = Utilities.newBlob(decoded, detectedMime, safeFilenameBase);

    // 3. Create the file in the Google Drive folder (inherits folder permissions)
    var file = folder.createFile(blob);
    file.setDescription("Uploaded by " + guestName + " | Wish: " + message);
    var fileUrl = file.getUrl();

    // 4. (Optional) Log into Google Sheets if SPREADSHEET_ID is configured
    if (SPREADSHEET_ID && SPREADSHEET_ID.trim().length > 0) {
      var lock = LockService.getScriptLock();
      try {
        // Wait up to 15 seconds for concurrent guest uploads to queue safely
        lock.waitLock(15000);
        var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
        var sheet = ss.getActiveSheet();
        if (sheet.getLastRow() === 0) {
          // Initialize headers
          sheet.appendRow(["Timestamp", "Guest Name", "Wishes / Message", "Photo Link"]);
          sheet.getRange(1, 1, 1, 4).setFontWeight("bold").setBackground("#F3F0E6");
        }
        var formattedDate = Utilities.formatDate(new Date(), "GMT+8", "dd/MM/yyyy HH:mm:ss");
        sheet.appendRow([
          formattedDate,
          sanitizeForSheet(guestName),
          sanitizeForSheet(message),
          fileUrl
        ]);
      } catch (sheetErr) {
        Logger.log("Sheet log error: " + sheetErr);
      } finally {
        try { lock.releaseLock(); } catch (e) {}
      }
    }

    return responseJSON({
      status: "success",
      fileUrl: fileUrl,
      fileId: file.getId(),
      filename: safeFilenameBase
    });

  } catch (err) {
    Logger.log("Upload error: " + err);
    return responseJSON({
      status: "error",
      message: "Failed to process upload"
    });
  }
}

function doGet(e) {
  return ContentService.createTextOutput("Digital Guestbook Google Drive Photo Upload Endpoint is Active!").setMimeType(ContentService.MimeType.TEXT);
}

function responseJSON(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
