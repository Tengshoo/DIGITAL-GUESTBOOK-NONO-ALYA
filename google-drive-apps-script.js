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
 * 5. Paste your FOLDER_ID below on line 20.
 * 6. (Optional) If you also want a Google Sheet log, paste a SPREADSHEET_ID on line 24.
 * 7. Click "Deploy" (top right) -> "New deployment".
 * 8. Click the gear icon next to "Select type" -> choose "Web app".
 * 9. Set:
 *    - Description: "Digital Guestbook Photo Receiver"
 *    - Execute as: "Me (your email)"
 *    - Who has access: "Anyone" (VERY IMPORTANT: must be Anyone so guests can upload without logging in)
 * 10. Click "Deploy", authorize permissions when prompted.
 * 11. Copy the "Web app URL" (starts with https://script.google.com/macros/s/.../exec).
 * 12. Add this URL into your website's environment variables as:
 *     NEXT_PUBLIC_GOOGLE_SCRIPT_URL=https://script.google.com/macros/s/.../exec
 *     NEXT_PUBLIC_GOOGLE_DRIVE_FOLDER_URL=https://drive.google.com/drive/folders/YOUR_FOLDER_ID
 * =========================================================================
 */

// >>> PASTE YOUR GOOGLE DRIVE FOLDER ID HERE <<<
var FOLDER_ID = "YOUR_GOOGLE_DRIVE_FOLDER_ID";

// >>> (OPTIONAL) PASTE GOOGLE SPREADSHEET ID HERE FOR AUTOMATIC WISHES SPREADSHEET <<<
var SPREADSHEET_ID = ""; // Leave blank if you only want the Drive folder

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return responseJSON({ status: "error", message: "No data received" });
    }

    var data = JSON.parse(e.postData.contents);
    var base64Image = data.image;
    var guestName = data.guestName || "Guest";
    var message = data.message || "";
    var timestamp = data.timestamp || new Date().toISOString();
    var filename = data.filename || ("AtifIsma_" + guestName.replace(/[^a-zA-Z0-9]/g, "_") + "_" + Utilities.formatDate(new Date(), "GMT+8", "yyyyMMdd_HHmmss") + ".jpg");

    if (!base64Image) {
      return responseJSON({ status: "error", message: "No image provided" });
    }

    // 1. Get the target Google Drive Folder
    var folder = DriveApp.getFolderById(FOLDER_ID);
    if (!folder) {
      return responseJSON({ status: "error", message: "Folder not found" });
    }

    // 2. Decode the Base64 image
    var cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, "");
    var decoded = Utilities.base64Decode(cleanBase64);
    var blob = Utilities.newBlob(decoded, "image/jpeg", filename);

    // 3. Create the file in the Google Drive folder
    var file = folder.createFile(blob);
    file.setDescription("Uploaded by " + guestName + " | Wish: " + message);

    // Make the file viewable via link
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    var fileUrl = file.getUrl();

    // 4. (Optional) Log into Google Sheets if SPREADSHEET_ID is configured
    if (SPREADSHEET_ID && SPREADSHEET_ID.trim().length > 0) {
      try {
        var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
        var sheet = ss.getActiveSheet();
        if (sheet.getLastRow() === 0) {
          // Initialize headers
          sheet.appendRow(["Timestamp", "Guest Name", "Wishes / Message", "Photo Link"]);
          sheet.getRange(1, 1, 1, 4).setFontWeight("bold").setBackground("#F3F0E6");
        }
        var formattedDate = Utilities.formatDate(new Date(), "GMT+8", "dd/MM/yyyy HH:mm:ss");
        sheet.appendRow([formattedDate, guestName, message, fileUrl]);
      } catch (sheetErr) {
        Logger.log("Sheet log error: " + sheetErr);
      }
    }

    return responseJSON({
      status: "success",
      fileUrl: fileUrl,
      fileId: file.getId(),
      filename: filename
    });

  } catch (err) {
    Logger.log("Upload error: " + err);
    return responseJSON({
      status: "error",
      message: err.toString()
    });
  }
}

function doGet(e) {
  return ContentService.createTextOutput("Atif & Isma Google Drive Photo Upload Endpoint is Active!").setMimeType(ContentService.MimeType.TEXT);
}

function responseJSON(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
