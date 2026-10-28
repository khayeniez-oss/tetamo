"use client";

import { useEffect, useRef, useState } from "react";

export type BackgroundMusicChoice = {
  track: "none" | "calm" | "uplifting" | "upload";
  volume: number;
  file: File | null;
  rightsConfirmed: boolean;
};
export const EMPTY_MUSIC: BackgroundMusicChoice = {
  track: "none", volume: 25, file: null, rightsConfirmed: false,
};

export default function BackgroundMusic({ lang, value, onChange, disabled }: {
  lang: string;
  value: BackgroundMusicChoice;
  onChange: (value: BackgroundMusicChoice) => void;
  disabled: boolean;
}) {
  const id = lang === "id";
  const [error, setError] = useState("");
  const audio = useRef<HTMLAudioElement>(null);
  const musicInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (value.track !== "upload" || !value.file || !audio.current) return;
    const url = URL.createObjectURL(value.file);
    audio.current.src = url;
    audio.current.load();
    return () => URL.revokeObjectURL(url);
  }, [value.file, value.track]);
  useEffect(() => {
    if (audio.current) audio.current.volume = value.volume / 100;
  }, [value.volume, value.track, value.file]);
  const hasAudio = value.track !== "none" && (value.track !== "upload" || !!value.file);
  const src = value.track === "calm" || value.track === "uplifting" ? `/audio/ai-video/${value.track}.wav` : undefined;
  return (
    <fieldset disabled={disabled} className="rounded-2xl border border-gray-200 bg-[#FAF9F6] p-4 sm:p-5 disabled:opacity-60">
      <legend className="px-2 text-base font-bold text-[#1C1C1E]">{id ? "2. Pilih musik — opsional" : "2. Choose music — optional"}</legend>
      <div role="radiogroup" aria-label={id ? "Pilih musik" : "Choose music"} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {([['none', id ? 'Tanpa musik' : 'No music'], ['calm', 'Calm'], ['uplifting', 'Uplifting'], ['upload', id ? 'Musik saya' : 'My music']] as const).map(([track, label]) => (
          <button key={track} type="button" role="radio" aria-checked={value.track === track}
            className={`rounded-xl border px-3 py-3 text-sm font-semibold transition ${value.track === track ? 'border-[#B58A2A] bg-[#F5E8C7] text-[#33270E]' : 'border-gray-200 bg-white text-gray-700 hover:border-[#C9A24D]'}`}
            onClick={() => { setError(""); onChange({ ...value, track }); if (track === "upload") musicInput.current?.click(); }}>
            {track === 'none' ? '♪ ' : track === 'upload' ? '＋ ' : '♫ '}{label}
          </button>
        ))}
      </div>
          <input ref={musicInput} type="file" accept=".mp3,.wav,.m4a,audio/mpeg,audio/wav,audio/mp4" className="hidden" onChange={e => {
            const file = e.target.files?.[0] || null;
            setError("");
            if (file && (!/\.(mp3|wav|m4a)$/i.test(file.name) || file.size > 20 * 1024 * 1024 || file.size === 0)) {
              setError(id ? "Gunakan MP3, WAV, atau M4A berukuran maksimal 20 MB." : "Use an MP3, WAV or M4A file up to 20 MB.");
              e.target.value = "";
              onChange({ ...value, file: null, rightsConfirmed: false }); return;
            }
            onChange({ ...value, file, rightsConfirmed: false });
          }} />
      {value.track === "upload" && <div className="mt-4 space-y-3">
        <label className="block text-xs text-gray-600">{id ? "File musik (MP3, WAV, M4A)" : "Music file (MP3, WAV, M4A)"}
          <button type="button" className="mt-2 block rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-[#1C1C1E]" onClick={() => musicInput.current?.click()}>{value.file ? (id ? "Ganti file musik" : "Change music file") : (id ? "Pilih file musik" : "Choose music file")}</button>
        </label>
        {value.file && <p className="break-all text-xs text-gray-600">{value.file.name}</p>}
        <label className="flex items-start gap-2 text-xs leading-5 text-gray-600">
          <input type="checkbox" className="mt-1" checked={value.rightsConfirmed} onChange={e => onChange({ ...value, rightsConfirmed: e.target.checked })} />
          {id ? "Saya memiliki izin untuk menggunakan musik ini dalam video properti dan membagikannya di media sosial." : "I have permission to use this music in property videos and share it on social media."}
        </label>
      </div>}
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
      {hasAudio && <div className="mt-4 space-y-3">
        <p className="text-xs font-medium text-gray-600">{id ? "Dengarkan musik pilihan Anda" : "Listen to your chosen music"}</p>
        <audio ref={audio} key={value.track} src={src} controls preload="metadata" onVolumeChange={e => {
          const volume = Math.round(e.currentTarget.volume * 100);
          if (volume !== value.volume) onChange({ ...value, volume });
        }} className="w-full" onError={() => setError(id ? "Musik tidak dapat diputar. Pilih file atau musik lain." : "This music cannot be played. Choose another file or track.")} />
        <label className="block text-xs font-medium text-gray-600">{id ? "Volume musik" : "Music volume"}: {value.volume}%
          <input aria-label={id ? "Volume musik" : "Music volume"} className="mt-2 block w-full accent-[#C9A24D]" type="range" min="0" max="100" step="5" value={value.volume} onChange={e => onChange({ ...value, volume: Number(e.target.value) })} />
        </label>
        <p className="text-xs leading-5 text-gray-500">{id ? "Musik diulang sesuai durasi video, lalu memudar di akhir. Buat ulang video setelah mengubah musik." : "Music loops to fit your video and fades out at the end. Generate again after changing music."}</p>
      </div>}
      {(value.track === "calm" || value.track === "uplifting") && <p className="mt-3 text-xs text-gray-500">{id ? "Instrumental orisinal Tetamo, tersedia untuk video properti Anda." : "Original Tetamo instrumental, included for your property videos."}</p>}
    </fieldset>
  );
}
