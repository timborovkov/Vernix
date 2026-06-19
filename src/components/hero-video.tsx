"use client";

import { useRef, useState } from "react";
import { Play } from "lucide-react";

export function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  function handlePlay() {
    const video = videoRef.current;
    if (!video) return;

    setIsStarting(true);
    const resetPlaybackState = () => {
      setIsStarting(false);
      setIsPlaying(false);
    };

    try {
      const playRequest = video.play();
      void playRequest.catch(resetPlaybackState);
    } catch {
      resetPlaybackState();
    }
  }

  return (
    <div className="relative mx-auto max-w-5xl overflow-hidden rounded-2xl border border-white/10 shadow-2xl">
      <video
        ref={videoRef}
        src="/demo/demo-v1.mp4"
        className="w-full"
        poster="/demo/demo-v1-poster.jpg"
        preload="none"
        controls={isPlaying}
        playsInline
        onEnded={() => {
          setIsStarting(false);
          setIsPlaying(false);
        }}
        onPause={() => {
          setIsStarting(false);
          setIsPlaying(false);
        }}
        onPlay={() => {
          setIsStarting(false);
          setIsPlaying(true);
        }}
      />
      {!isPlaying && (
        <button
          onClick={handlePlay}
          disabled={isStarting}
          className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/30 transition-colors hover:bg-black/20"
          aria-label="Play demo video"
          aria-busy={isStarting}
        >
          <div className="bg-accent flex h-16 w-16 items-center justify-center rounded-full shadow-lg">
            <Play className="h-7 w-7 fill-white text-white" />
          </div>
        </button>
      )}
    </div>
  );
}
