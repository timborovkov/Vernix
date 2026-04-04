"use client";

import { useRef, useState } from "react";
import { Play } from "lucide-react";

export function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  function handlePlay() {
    const video = videoRef.current;
    if (!video) return;
    video.play();
    setIsPlaying(true);
  }

  return (
    <div className="relative mx-auto max-w-4xl overflow-hidden rounded-2xl border border-white/10 shadow-2xl">
      <video
        ref={videoRef}
        src="/demo/demo-v1.mp4"
        className="w-full"
        poster="/demo/demo-v1-poster.jpg"
        preload="none"
        controls={isPlaying}
        playsInline
        onEnded={() => setIsPlaying(false)}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
      />
      {!isPlaying && (
        <button
          onClick={handlePlay}
          className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/30 transition-colors hover:bg-black/20"
          aria-label="Play demo video"
        >
          <div className="bg-accent flex h-16 w-16 items-center justify-center rounded-full shadow-lg">
            <Play className="h-7 w-7 fill-white text-white" />
          </div>
        </button>
      )}
    </div>
  );
}
