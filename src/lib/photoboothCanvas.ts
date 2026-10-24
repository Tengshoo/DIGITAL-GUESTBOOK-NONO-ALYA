import { PHOTOBOOTH_STRIP_THEMES, PhotoboothStripTheme, StripSlot } from '@/components/Photobooth/stripThemes';
import { PHOTO_FILTERS, PhotoFilter } from '@/components/PhotoFilterSelector';
import { EVENT_CONFIG } from '@/config/eventConfig';

export interface EventInfo {
  welcomeTitle: string;
  miniTitle?: string;
  date: string;
  venue: string;
  hashtag: string;
}

/**
 * Helper to load an image from URL or dataURL into an HTMLImageElement
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

/**
 * Draws rounded rectangle path on canvas
 */
function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  if (!radius || radius <= 0) {
    ctx.beginPath();
    ctx.rect(x, y, width, height);
    ctx.closePath();
    return;
  }
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Generates a full high-resolution photobooth strip canvas matching the authentic template layouts
 */
export async function generatePhotoboothStripCanvas(
  photos: string[],
  themeId: PhotoboothStripTheme['id'],
  filterId: PhotoFilter['id'] = 'original',
  eventInfo: EventInfo = {
    welcomeTitle: EVENT_CONFIG.title,
    miniTitle: EVENT_CONFIG.eventType.ms,
    date: EVENT_CONFIG.date.en,
    venue: EVENT_CONFIG.venue,
    hashtag: EVENT_CONFIG.hashtag,
  }
): Promise<string> {
  // Ensure custom web fonts are loaded prior to canvas text rendering
  if (typeof document !== 'undefined' && document.fonts) {
    try {
      await document.fonts.ready;
    } catch {
      // Continue if font ready fails
    }
  }

  const theme =
    PHOTOBOOTH_STRIP_THEMES.find((t) => t.id === themeId) || PHOTOBOOTH_STRIP_THEMES[0];
  const filter = PHOTO_FILTERS.find((f) => f.id === filterId);

  const canvas = document.createElement('canvas');
  canvas.width = theme.width;
  canvas.height = theme.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2D context');

  // 1. Draw base solid background
  ctx.fillStyle = theme.bgColor || '#FFFFFF';
  ctx.fillRect(0, 0, theme.width, theme.height);

  // 2. Draw template artwork background image
  try {
    const bgImage = await loadImage(theme.backgroundUrl);
    ctx.drawImage(bgImage, 0, 0, theme.width, theme.height);
  } catch (err) {
    console.warn('Failed to load photobooth background image:', theme.backgroundUrl, err);
  }

  // 3. Draw Photo Slots with aspect-fill and exact angle/coordinates
  for (let i = 0; i < theme.slots.length; i++) {
    const slot = theme.slots[i];
    const photoSrc = photos[i];
    if (!photoSrc) continue;

    try {
      const img = await loadImage(photoSrc);

      const cx = slot.x + slot.width / 2;
      const cy = slot.y + slot.height / 2;

      ctx.save();
      ctx.translate(cx, cy);

      if (slot.rotation) {
        ctx.rotate((slot.rotation * Math.PI) / 180);
      }

      // Clip to slot dimensions (centered around origin)
      const halfW = slot.width / 2;
      const halfH = slot.height / 2;

      roundedRect(ctx, -halfW, -halfH, slot.width, slot.height, slot.borderRadius || 0);
      ctx.clip();

      // Apply photo filter if present
      if (filter && filter.cssFilter && filter.cssFilter !== 'none') {
        ctx.filter = filter.cssFilter;
      }

      // Aspect Fill (Cover) Crop Calculation
      const imgRatio = img.width / img.height;
      const slotRatio = slot.width / slot.height;
      let sx = 0;
      let sy = 0;
      let sw = img.width;
      let sh = img.height;

      if (imgRatio > slotRatio) {
        sw = img.height * slotRatio;
        sx = (img.width - sw) / 2;
      } else {
        sh = img.width / slotRatio;
        sy = (img.height - sh) / 2;
      }

      ctx.drawImage(img, sx, sy, sw, sh, -halfW, -halfH, slot.width, slot.height);

      ctx.restore();
    } catch (err) {
      console.warn(`Failed to render photo in slot ${i + 1}:`, err);
    }
  }

  // 4. Draw Stickers (e.g. Yellow Gingham Bow)
  if (theme.stickers && theme.stickers.length > 0) {
    for (const sticker of theme.stickers) {
      try {
        const stickerImg = await loadImage(sticker.url);
        const cx = sticker.x + sticker.width / 2;
        const cy = sticker.y + sticker.height / 2;

        ctx.save();
        ctx.translate(cx, cy);
        if (sticker.rotation) {
          ctx.rotate((sticker.rotation * Math.PI) / 180);
        }

        // Slight natural drop shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
        ctx.shadowBlur = 15;
        ctx.shadowOffsetX = 3;
        ctx.shadowOffsetY = 6;

        ctx.drawImage(
          stickerImg,
          -sticker.width / 2,
          -sticker.height / 2,
          sticker.width,
          sticker.height
        );
        ctx.restore();
      } catch (err) {
        console.warn('Failed to draw sticker:', sticker.url, err);
      }
    }
  }

  // 5. Draw Typography and Text Blocks
  if (theme.textBlocks && theme.textBlocks.length > 0) {
    for (const tb of theme.textBlocks) {
      let content = tb.text || '';
      if (tb.binding === 'event.name') {
        content = eventInfo.welcomeTitle;
      } else if (tb.binding === 'event.date') {
        content = eventInfo.date;
      } else if (tb.binding === 'event.venue') {
        content = eventInfo.venue;
      } else if (tb.binding === 'event.hashtag') {
        content = eventInfo.hashtag;
      }

      if (tb.uppercase) {
        content = content.toUpperCase();
      }

      const cx = tb.x + tb.width / 2;
      const cy = tb.y + tb.height / 2;

      ctx.save();
      ctx.translate(cx, cy);

      if (tb.rotation) {
        ctx.rotate((tb.rotation * Math.PI) / 180);
      }

      ctx.font = `${tb.fontWeight} ${tb.fontSize}px ${tb.fontFamily}`;
      ctx.fillStyle = tb.color;
      ctx.textAlign = tb.align;
      ctx.textBaseline = 'middle';

      const drawX =
        tb.align === 'center'
          ? 0
          : tb.align === 'right'
          ? tb.width / 2
          : -tb.width / 2;

      ctx.fillText(content, drawX, 0);
      ctx.restore();
    }
  }

  return canvas.toDataURL('image/jpeg', 0.94);
}

/**
 * Converts a base64 Data URL to a Blob
 */
export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return await res.blob();
}

/**
 * Triggers a direct download or native share sheet of the photobooth strip to the user's device.
 * Fully compatible with iOS Safari, Android Chrome, and Desktop browsers.
 */
export async function downloadStripImage(
  dataUrl: string,
  filename: string = 'photobooth_strip.jpg'
): Promise<{ success: boolean; method: 'share' | 'download' | 'fallback'; blobUrl?: string }> {
  try {
    const blob = await dataUrlToBlob(dataUrl);
    const blobUrl = URL.createObjectURL(blob);

    // 1. Try Native Web Share API (Best experience on iOS Safari and Android devices)
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        const file = new File([blob], filename, { type: 'image/jpeg' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: filename,
            text: 'Atif & Isma Photobooth Strip ♡',
          });
          return { success: true, method: 'share', blobUrl };
        }
      } catch (shareErr) {
        // User aborted the share dialog; treat as completed
        if (shareErr instanceof Error && shareErr.name === 'AbortError') {
          return { success: true, method: 'share', blobUrl };
        }
        console.warn('Native Web Share failed, attempting direct download:', shareErr);
      }
    }

    // 2. Standard Anchor download (Desktop and Android Chrome)
    const isIOS =
      typeof navigator !== 'undefined' &&
      (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

    if (!isIOS) {
      const link = document.createElement('a');
      link.download = filename;
      link.href = blobUrl;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        if (document.body.contains(link)) {
          document.body.removeChild(link);
        }
      }, 1000);
      return { success: true, method: 'download', blobUrl };
    }

    // 3. iOS Safari Fallback: Return blobUrl for the preview modal so user can long-press to save
    return { success: true, method: 'fallback', blobUrl };
  } catch (err) {
    console.error('Failed to initiate strip download:', err);
    return { success: false, method: 'fallback' };
  }
}
