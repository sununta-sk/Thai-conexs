import { useEffect, useRef, useState } from 'react';
import { optimizeImage } from '../lib/imageUtils';

// How long a transform request may stay unloaded, once the image is on
// screen, before we give up and load the original instead.
const TRANSFORM_TIMEOUT_MS = 10000;

// <img> that requests a Supabase-resized thumbnail and falls back to the
// original URL if that request errors (404/403/feature off) or hangs.
// Non-Supabase sources (bundled assets, data: URIs) pass through unchanged.
export default function ThumbImg({ src, width, height, resize, quality, onError, onLoad, ...imgProps }) {
  const thumb = optimizeImage(src, { width, height, resize, quality });
  const canFallback = thumb !== src;
  const [failedSrc, setFailedSrc] = useState(null);
  const useOriginal = failedSrc === src;
  const loadedSrcRef = useRef(null);
  const imgRef = useRef(null);

  useEffect(() => {
    if (!canFallback || useOriginal) return;
    const el = imgRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    let timer;
    // Timer starts only once the image is on screen, so lazy-loaded
    // off-screen images (request not started yet) aren't timed out early.
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        if (!timer && loadedSrcRef.current !== src) {
          timer = setTimeout(() => { if (loadedSrcRef.current !== src) setFailedSrc(src); }, TRANSFORM_TIMEOUT_MS);
        }
      } else if (timer) {
        clearTimeout(timer);
        timer = undefined;
      }
    });
    io.observe(el);
    return () => { io.disconnect(); clearTimeout(timer); };
  }, [canFallback, useOriginal, src]);

  return (
    <img
      {...imgProps}
      ref={imgRef}
      src={useOriginal ? src : thumb}
      onLoad={(e) => { loadedSrcRef.current = src; if (onLoad) onLoad(e); }}
      onError={(e) => {
        if (canFallback && !useOriginal) { setFailedSrc(src); return; }
        if (onError) onError(e);
      }}
    />
  );
}
