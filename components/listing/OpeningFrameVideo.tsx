"use client";

import { useRef } from "react";

/** Show the actual opening title frame, never an unrelated listing photograph. */
export default function OpeningFrameVideo({ src, className, label }: { src: string; className?: string; label?: string }) {
  const started = useRef(false);
  const videoSrc = `${src.split("#")[0]}#t=0.1`;
  function showOpening(video: HTMLVideoElement) {
    if (!Number.isFinite(video.duration) || video.duration <= 0) return;
    video.currentTime = Math.min(0.1, video.duration / 2);
  }
  return <video key={src} src={videoSrc} controls playsInline preload="metadata" aria-label={label} className={className}
    onLoadedMetadata={event => { if (!started.current) showOpening(event.currentTarget); }}
    onPlay={() => { started.current = true; }}
    onEnded={event => { started.current = false; showOpening(event.currentTarget); }}
  />;
}
