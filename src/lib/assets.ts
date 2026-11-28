const OPTIMIZED_ASSET_MAP: Record<string, string> = {
  '/assets/img/arman-farah-venue.png': '/assets/img/arman-farah-venue.webp',
  '/assets/img/arman-farah-venue.jpg': '/assets/img/arman-farah-venue.webp',
  '/assets/img/arman-farah-welcome.jpg': '/assets/img/arman-farah-welcome.webp',
  '/assets/img/Atif-Isma-Welcome.jpg': '/assets/img/Atif-Isma-Welcome.webp',
};

/**
 * Helper to resolve asset paths with Next.js basePath support and automatic WebP upgrade
 */
export function getAssetPath(path: string): string {
  if (!path) return '';
  if (
    path.startsWith('http://') ||
    path.startsWith('https://') ||
    path.startsWith('data:')
  ) {
    return path;
  }

  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const [pathname, query] = cleanPath.split('?');
  const mappedPathname = OPTIMIZED_ASSET_MAP[pathname] || pathname;

  return query
    ? `${basePath}${mappedPathname}?${query}`
    : `${basePath}${mappedPathname}`;
}

const FONT_VAR_LOOKUP: Array<[RegExp, string]> = [
  [/['"]?Dancing Script['"]?/gi, '--font-dancing'],
  [/['"]?Cinzel['"]?/gi, '--font-cinzel'],
  [/['"]?Courier Prime['"]?/gi, '--font-courier'],
  [/['"]?Cormorant Garamond['"]?/gi, '--font-cormorant'],
  [/['"]?Playfair Display['"]?/gi, '--font-playfair'],
  [/['"]?(?:Outfit|Montserrat)['"]?/gi, '--font-outfit'],
];

/**
 * Resolves Next.js self-hosted `next/font/google` CSS variables into actual loaded @font-face
 * family names so both HTML5 <canvas> `ctx.font` and inline CSS render identical typography.
 */
export function resolveFontFamily(fontStack: string, forCanvas = false): string {
  if (!fontStack) return fontStack;

  if (!forCanvas) {
    let cssStack = fontStack;
    for (const [pattern, cssVar] of FONT_VAR_LOOKUP) {
      cssStack = cssStack.replace(pattern, (match) => `var(${cssVar}), ${match}`);
    }
    return cssStack;
  }

  if (typeof document === 'undefined') return fontStack;
  const rootStyles = getComputedStyle(document.documentElement);
  let resolved = fontStack;
  for (const [pattern, cssVar] of FONT_VAR_LOOKUP) {
    const val = rootStyles.getPropertyValue(cssVar).trim();
    if (val) {
      resolved = resolved.replace(pattern, (match) => `${val}, ${match}`);
    }
  }
  return resolved;
}

/**
 * Encodes an HTML5 Canvas to compact WebP when supported by the browser (~35% smaller than JPEG),
 * with automatic fallback to JPEG on browsers (like older Safari) that return PNG for WebP.
 */
export function encodeCanvasToOptimizedDataUrl(
  canvas: HTMLCanvasElement,
  quality = 0.82
): string {
  try {
    const webp = canvas.toDataURL('image/webp', quality);
    if (webp.startsWith('data:image/webp;base64,')) {
      return webp;
    }
  } catch {
    // Fallback to JPEG
  }
  return canvas.toDataURL('image/jpeg', quality);
}
