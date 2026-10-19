const YOUTUBE_ID = /^[A-Za-z0-9_-]{6,20}$/;

/** Standard YouTube HQ thumbnail for a video id, or undefined for an invalid id. */
export function youtubeHqThumbnail(youtubeId?: string | null): string | undefined {
  const id = (youtubeId || '').trim();
  return YOUTUBE_ID.test(id) ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : undefined;
}

/** Stored thumbnail when present, otherwise the YouTube HQ default. */
export function resolveVideoThumbnail(video: {
  thumbnail_url?: string | null;
  youtube_id?: string | null;
}): string | undefined {
  const stored = (video.thumbnail_url || '').trim();
  return stored || youtubeHqThumbnail(video.youtube_id);
}
