/**
 * Media helpers for Board Notices (Images, Videos, Links)
 */

export const sanitizeUrl = (rawUrl: string): string => {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }
  return `https://${trimmed}`;
};

export const getYouTubeEmbedUrl = (url: string): string | null => {
  if (!url) return null;
  const clean = sanitizeUrl(url);

  // youtu.be/<id>
  const shortMatch = clean.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/i);
  if (shortMatch && shortMatch[1]) {
    return `https://www.youtube-nocookie.com/embed/${shortMatch[1]}`;
  }

  // youtube.com/watch?v=<id>
  const watchMatch = clean.match(/[?&]v=([a-zA-Z0-9_-]{11})/i);
  if (watchMatch && watchMatch[1]) {
    return `https://www.youtube-nocookie.com/embed/${watchMatch[1]}`;
  }

  // youtube.com/shorts/<id>
  const shortsMatch = clean.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/i);
  if (shortsMatch && shortsMatch[1]) {
    return `https://www.youtube-nocookie.com/embed/${shortsMatch[1]}`;
  }

  // youtube.com/embed/<id>
  const embedMatch = clean.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/i);
  if (embedMatch && embedMatch[1]) {
    return `https://www.youtube-nocookie.com/embed/${embedMatch[1]}`;
  }

  return null;
};

export const getGoogleDriveVideoEmbed = (url: string): string | null => {
  if (!url) return null;
  const clean = sanitizeUrl(url);
  // drive.google.com/file/d/<id>/view...
  const match = clean.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i);
  if (match && match[1]) {
    return `https://drive.google.com/file/d/${match[1]}/preview`;
  }
  return null;
};

export const isDirectVideoFile = (url: string): boolean => {
  if (!url) return false;
  const lower = url.toLowerCase().split('?')[0];
  return (
    lower.endsWith('.mp4') ||
    lower.endsWith('.webm') ||
    lower.endsWith('.ogg') ||
    lower.endsWith('.mov') ||
    url.startsWith('data:video/') ||
    url.startsWith('blob:')
  );
};

export const extractDomain = (url: string): string => {
  try {
    const parsed = new URL(sanitizeUrl(url));
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};
