"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  Clock3,
  Lock,
  Mic,
  PlayCircle,
  Presentation,
  ShieldCheck,
  Tv,
  Video,
} from "lucide-react";
import { useLanguage } from "@/app/context/LanguageContext";
import { supabase } from "@/lib/supabase";

type EducationAccessType = "public" | "paid_agent";
type EducationContentType = "tutorial" | "training" | "podcast" | "webinar";

type EducationVideo = {
  id: string;
  title: string | null;
  title_id: string | null;
  slug: string;
  description: string | null;
  description_id: string | null;
  content_type: EducationContentType;
  speaker_name: string | null;
  thumbnail_url: string | null;
  video_provider: "supabase" | "external";
  video_url: string | null;
  video_storage_path: string | null;
  duration_seconds: number;
  access_type: EducationAccessType;
  published_at: string | null;
  is_featured: boolean | null;
  education_categories: { name: string } | null;
};

type ViewerState = {
  isLoggedIn: boolean;
  hasPaidAgentAccess: boolean;
};

function formatDate(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatDuration(seconds?: number | null) {
  if (!seconds || seconds <= 0) return "-";

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  if (mins >= 60) {
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hours}h ${remainingMins}m`;
  }

  if (secs === 0) return `${mins}m`;
  return `${mins}m ${secs}s`;
}

function getInitials(title?: string | null) {
  if (!title) return "ED";

  return title
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

function isLiveNow(publishedAt?: string | null) {
  if (!publishedAt) return true;

  const publishTime = new Date(publishedAt).getTime();
  if (Number.isNaN(publishTime)) return false;

  return publishTime <= Date.now();
}

function getTypeIcon(type: EducationContentType) {
  switch (type) {
    case "tutorial":
      return BookOpen;
    case "training":
      return Presentation;
    case "podcast":
      return Mic;
    case "webinar":
      return Tv;
    default:
      return Video;
  }
}

function getYouTubeEmbedUrl(url: string) {
  try {
    const parsed = new URL(url);

    if (parsed.hostname.includes("youtube.com") && parsed.searchParams.get("v")) {
      return `https://www.youtube.com/embed/${parsed.searchParams.get("v")}`;
    }

    if (parsed.hostname.includes("youtu.be")) {
      const id = parsed.pathname.replace("/", "").trim();
      if (id) return `https://www.youtube.com/embed/${id}`;
    }

    return null;
  } catch {
    return null;
  }
}

function getVimeoEmbedUrl(url: string) {
  try {
    const parsed = new URL(url);

    if (parsed.hostname.includes("vimeo.com")) {
      const id = parsed.pathname.split("/").filter(Boolean).pop();
      if (id) return `https://player.vimeo.com/video/${id}`;
    }

    return null;
  } catch {
    return null;
  }
}

function isDirectVideoUrl(url: string) {
  return /\.(mp4|webm|mov)(\?.*)?$/i.test(url);
}

function normalizeEducationVideo(row: any): EducationVideo {
  const category = Array.isArray(row?.education_categories)
    ? row.education_categories[0] ?? null
    : row?.education_categories ?? null;

  return {
    id: row?.id ?? "",
    title: row?.title ?? "",
    title_id: row?.title_id ?? "",
    slug: row?.slug ?? "",
    description: row?.description ?? "",
    description_id: row?.description_id ?? "",
    content_type: (row?.content_type ?? "tutorial") as EducationContentType,
    speaker_name: row?.speaker_name ?? "",
    thumbnail_url: row?.thumbnail_url ?? "",
    video_provider: (row?.video_provider ?? "supabase") as
      | "supabase"
      | "external",
    video_url: row?.video_url ?? "",
    video_storage_path: row?.video_storage_path ?? "",
    duration_seconds: Number(row?.duration_seconds ?? 0),
    access_type: (row?.access_type ?? "public") as EducationAccessType,
    published_at: row?.published_at ?? null,
    is_featured: Boolean(row?.is_featured),
    education_categories: category?.name ? { name: category.name } : null,
  };
}

/**
 * Replace this with your real paid-agent membership query.
 */
async function resolvePaidAgentAccess(userId: string): Promise<boolean> {
  void userId;
  return false;
}

export default function PublicEducationDetailPage() {
  const { lang } = useLanguage();
  const params = useParams();

  const slug =
    typeof params?.slug === "string"
      ? params.slug
      : Array.isArray(params?.slug)
        ? params.slug[0]
        : "";

  const ui = useMemo(
    () => ({
      back: lang === "id" ? "Kembali ke Education" : "Back to Education",
      notFound: lang === "id" ? "Video tidak ditemukan" : "Video not found",
      notFoundDesc:
        lang === "id"
          ? "Video tidak tersedia atau belum dipublish."
          : "This video is unavailable or not yet published.",
      loading: lang === "id" ? "Memuat video..." : "Loading video...",
      free: lang === "id" ? "Free" : "Free",
      paidAgent: lang === "id" ? "Paid Agent" : "Paid Agent",
      featured: lang === "id" ? "Featured" : "Featured",
      tutorial: lang === "id" ? "Tutorial" : "Tutorial",
      training: lang === "id" ? "Training" : "Training",
      podcast: lang === "id" ? "Podcast" : "Podcast",
      webinar: lang === "id" ? "Webinar" : "Webinar",
      category: lang === "id" ? "Kategori" : "Category",
      speaker: lang === "id" ? "Speaker" : "Speaker",
      duration: lang === "id" ? "Durasi" : "Duration",
      published: lang === "id" ? "Published" : "Published",
      access: lang === "id" ? "Akses" : "Access",
      noDescription:
        lang === "id" ? "Belum ada deskripsi." : "No description yet.",
      watchVideo: lang === "id" ? "Tonton Video" : "Watch Video",
      lockedTitle:
        lang === "id"
          ? "Video ini khusus untuk Paid Agent Member"
          : "This video is for Paid Agent Members only",
      lockedDescLoggedOut:
        lang === "id"
          ? "Silakan login terlebih dahulu lalu aktifkan membership agent untuk membuka video training ini."
          : "Please log in first, then activate agent membership to unlock this training video.",
      lockedDescNoMembership:
        lang === "id"
          ? "Akun Anda belum memiliki membership agent aktif. Upgrade membership untuk menonton video ini."
          : "Your account does not have an active agent membership yet. Upgrade your membership to watch this video.",
      lockedLabel: lang === "id" ? "Terkunci" : "Locked",
      accessGranted: lang === "id" ? "Akses aktif" : "Access granted",
      signedUrlFailed:
        lang === "id"
          ? "Video tidak bisa dimuat saat ini."
          : "The video cannot be loaded right now.",
      externalOpen:
        lang === "id" ? "Buka video di tab baru" : "Open video in new tab",
      notSet: lang === "id" ? "Belum diatur" : "Not set",
      education: lang === "id" ? "Education" : "Education",
      liveNow: lang === "id" ? "Live" : "Live",
    }),
    [lang]
  );

  const [video, setVideo] = useState<EducationVideo | null>(null);
  const [viewer, setViewer] = useState<ViewerState>({
    isLoggedIn: false,
    hasPaidAgentAccess: false,
  });
  const [videoPlaybackUrl, setVideoPlaybackUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState("");
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function loadPage() {
      if (!slug) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setLoading(true);
      setVideoError("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      let paidAgentAccess = false;

      if (user?.id) {
        paidAgentAccess = await resolvePaidAgentAccess(user.id);
      }

      if (ignore) return;

      setViewer({
        isLoggedIn: Boolean(user?.id),
        hasPaidAgentAccess: paidAgentAccess,
      });

      const { data, error } = await supabase
        .from("education_videos")
        .select(`
          id,
          title,
          title_id,
          slug,
          description,
          description_id,
          content_type,
          speaker_name,
          thumbnail_url,
          video_provider,
          video_url,
          video_storage_path,
          duration_seconds,
          access_type,
          published_at,
          is_featured,
          education_categories(name)
        `)
        .eq("slug", slug)
        .eq("status", "published")
        .single();

      if (ignore) return;

      if (error || !data || !isLiveNow(data.published_at)) {
        console.error("Failed to load education video:", error);
        setNotFound(true);
        setLoading(false);
        return;
      }

      const loadedVideo = normalizeEducationVideo(data);
      setVideo(loadedVideo);

      const canWatch =
        loadedVideo.access_type === "public" ||
        (loadedVideo.access_type === "paid_agent" && paidAgentAccess);

      if (
        canWatch &&
        loadedVideo.video_provider === "supabase" &&
        loadedVideo.video_storage_path
      ) {
        setVideoLoading(true);

        const { data: signedData, error: signedError } = await supabase.storage
          .from("education-videos")
          .createSignedUrl(loadedVideo.video_storage_path, 60 * 60);

        if (ignore) return;

        if (signedError || !signedData?.signedUrl) {
          console.error("Failed to create signed URL:", signedError);
          setVideoError(ui.signedUrlFailed);
          setVideoPlaybackUrl(null);
        } else {
          setVideoPlaybackUrl(signedData.signedUrl);
        }

        setVideoLoading(false);
      } else if (
        canWatch &&
        loadedVideo.video_provider === "external" &&
        loadedVideo.video_url
      ) {
        setVideoPlaybackUrl(loadedVideo.video_url);
      } else {
        setVideoPlaybackUrl(null);
      }

      setLoading(false);
    }

    loadPage();

    return () => {
      ignore = true;
    };
  }, [slug, ui.signedUrlFailed]);

  const activeTitle =
    lang === "id"
      ? video?.title_id?.trim() || video?.title?.trim() || ""
      : video?.title?.trim() || video?.title_id?.trim() || "";

  const activeDescription =
    lang === "id"
      ? video?.description_id?.trim() || video?.description?.trim() || ""
      : video?.description?.trim() || video?.description_id?.trim() || "";

  const typeLabel = useMemo(() => {
    if (!video) return "";
    if (video.content_type === "tutorial") return ui.tutorial;
    if (video.content_type === "training") return ui.training;
    if (video.content_type === "podcast") return ui.podcast;
    return ui.webinar;
  }, [video, ui]);

  const canWatch = useMemo(() => {
    if (!video) return false;
    if (video.access_type === "public") return true;
    return viewer.hasPaidAgentAccess;
  }, [video, viewer.hasPaidAgentAccess]);

  const isLocked = Boolean(video) && !canWatch;

  const youtubeEmbedUrl = useMemo(() => {
    if (!videoPlaybackUrl) return null;
    return getYouTubeEmbedUrl(videoPlaybackUrl);
  }, [videoPlaybackUrl]);

  const vimeoEmbedUrl = useMemo(() => {
    if (!videoPlaybackUrl) return null;
    return getVimeoEmbedUrl(videoPlaybackUrl);
  }, [videoPlaybackUrl]);

  const directVideoUrl = useMemo(() => {
    if (!videoPlaybackUrl) return null;
    return isDirectVideoUrl(videoPlaybackUrl) ? videoPlaybackUrl : null;
  }, [videoPlaybackUrl]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#FAFAF8] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl rounded-3xl border border-gray-200 bg-white p-6 text-sm text-gray-500 shadow-sm sm:p-8">
          {ui.loading}
        </div>
      </main>
    );
  }

  if (notFound || !video) {
    return (
      <main className="min-h-screen bg-[#FAFAF8] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-xl font-bold text-[#1C1C1E] sm:text-2xl">
            {ui.notFound}
          </h1>

          <p className="mt-3 text-sm text-gray-600">{ui.notFoundDesc}</p>

          <Link
            href="/education"
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-black px-5 py-3 text-sm font-semibold text-white"
          >
            <ArrowLeft size={16} />
            {ui.back}
          </Link>
        </div>
      </main>
    );
  }

  const TypeIcon = getTypeIcon(video.content_type);

  return (
    <main className="min-h-screen bg-[#FAFAF8] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/education"
          className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-[#1C1C1E] hover:opacity-70"
        >
          <ArrowLeft size={16} />
          {ui.back}
        </Link>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.15fr)_380px]">
          <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
            <div className="relative">
              {video.thumbnail_url ? (
                <img
                  src={video.thumbnail_url}
                  alt={activeTitle || "Education cover"}
                  className="h-[240px] w-full object-cover sm:h-[320px] lg:h-[420px]"
                />
              ) : (
                <div className="flex h-[240px] w-full items-center justify-center bg-[#1C1C1E] text-4xl font-bold text-white sm:h-[320px] lg:h-[420px]">
                  {getInitials(activeTitle)}
                </div>
              )}

              <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                <div className="inline-flex items-center gap-1 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-[#1C1C1E] shadow-sm">
                  <TypeIcon size={14} />
                  {typeLabel}
                </div>

                <div
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold shadow-sm ${
                    video.access_type === "paid_agent"
                      ? "bg-red-100 text-red-700"
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {video.access_type === "paid_agent" ? <Lock size={12} /> : null}
                  {video.access_type === "paid_agent" ? ui.paidAgent : ui.free}
                </div>

                {video.is_featured ? (
                  <div className="inline-flex rounded-full bg-[#1C1C1E] px-3 py-1 text-xs font-semibold text-white shadow-sm">
                    {ui.featured}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="p-5 sm:p-7 lg:p-8">
              <h1 className="text-2xl font-bold leading-tight text-[#1C1C1E] sm:text-3xl lg:text-4xl">
                {activeTitle}
              </h1>

              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-gray-500 sm:text-sm">
                <span className="inline-flex items-center gap-1">
                  <Clock3 size={14} />
                  {formatDuration(video.duration_seconds)}
                </span>
                <span>•</span>
                <span>{formatDate(video.published_at)}</span>
                <span>•</span>
                <span>{canWatch ? ui.accessGranted : ui.lockedLabel}</span>
              </div>

              <div className="mt-6">
                <h2 className="text-base font-bold text-[#1C1C1E]">
                  {ui.watchVideo}
                </h2>

                <div className="mt-4 overflow-hidden rounded-3xl border border-gray-200 bg-black">
                  {isLocked ? (
                    <div className="flex min-h-[260px] flex-col items-center justify-center px-6 py-10 text-center text-white sm:min-h-[360px]">
                      <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-white/15">
                        <Lock size={24} />
                      </div>

                      <h3 className="mt-5 text-xl font-bold">{ui.lockedTitle}</h3>

                      <p className="mt-3 max-w-xl text-sm leading-7 text-white/80 sm:text-base">
                        {viewer.isLoggedIn
                          ? ui.lockedDescNoMembership
                          : ui.lockedDescLoggedOut}
                      </p>

                      <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#1C1C1E]">
                        <ShieldCheck size={16} />
                        {ui.paidAgent}
                      </div>
                    </div>
                  ) : videoLoading ? (
                    <div className="flex min-h-[260px] items-center justify-center px-6 py-10 text-center text-sm text-white/80 sm:min-h-[360px]">
                      {ui.loading}
                    </div>
                  ) : videoError ? (
                    <div className="flex min-h-[260px] items-center justify-center px-6 py-10 text-center text-sm text-white/80 sm:min-h-[360px]">
                      {videoError}
                    </div>
                  ) : youtubeEmbedUrl ? (
                    <div className="aspect-video w-full">
                      <iframe
                        src={youtubeEmbedUrl}
                        title={activeTitle || "Education video"}
                        className="h-full w-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  ) : vimeoEmbedUrl ? (
                    <div className="aspect-video w-full">
                      <iframe
                        src={vimeoEmbedUrl}
                        title={activeTitle || "Education video"}
                        className="h-full w-full"
                        allow="autoplay; fullscreen; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  ) : directVideoUrl ? (
                    <video
                      controls
                      playsInline
                      className="aspect-video w-full bg-black"
                      src={directVideoUrl}
                    />
                  ) : videoPlaybackUrl ? (
                    <div className="flex min-h-[260px] flex-col items-center justify-center px-6 py-10 text-center sm:min-h-[360px]">
                      <PlayCircle size={44} className="text-white" />
                      <a
                        href={videoPlaybackUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-4 inline-flex rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#1C1C1E]"
                      >
                        {ui.externalOpen}
                      </a>
                    </div>
                  ) : (
                    <div className="flex min-h-[260px] items-center justify-center px-6 py-10 text-center text-sm text-white/80 sm:min-h-[360px]">
                      {ui.notFoundDesc}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-8">
                <h2 className="text-base font-bold text-[#1C1C1E]">
                  {lang === "id" ? "Deskripsi" : "Description"}
                </h2>
                <div className="mt-3 whitespace-pre-line text-sm leading-8 text-gray-700 sm:text-base">
                  {activeDescription || ui.noDescription}
                </div>
              </div>
            </div>
          </section>

          <aside className="space-y-6">
            <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-lg font-bold text-[#1C1C1E]">{ui.education}</h2>

              <div className="mt-5 space-y-4 text-sm text-gray-600">
                <div className="flex items-start justify-between gap-4">
                  <span className="font-semibold text-[#1C1C1E]">{ui.category}</span>
                  <span className="text-right">
                    {video.education_categories?.name || ui.notSet}
                  </span>
                </div>

                <div className="flex items-start justify-between gap-4">
                  <span className="font-semibold text-[#1C1C1E]">{ui.speaker}</span>
                  <span className="text-right">{video.speaker_name || ui.notSet}</span>
                </div>

                <div className="flex items-start justify-between gap-4">
                  <span className="font-semibold text-[#1C1C1E]">{ui.duration}</span>
                  <span className="text-right">
                    {formatDuration(video.duration_seconds)}
                  </span>
                </div>

                <div className="flex items-start justify-between gap-4">
                  <span className="font-semibold text-[#1C1C1E]">{ui.published}</span>
                  <span className="text-right">{formatDate(video.published_at)}</span>
                </div>

                <div className="flex items-start justify-between gap-4">
                  <span className="font-semibold text-[#1C1C1E]">{ui.access}</span>
                  <span className="text-right">
                    {video.access_type === "paid_agent" ? ui.paidAgent : ui.free}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#1C1C1E] text-white">
                  {canWatch ? <PlayCircle size={18} /> : <Lock size={18} />}
                </div>

                <div>
                  <h2 className="text-base font-bold text-[#1C1C1E]">
                    {canWatch ? ui.liveNow : ui.lockedLabel}
                  </h2>
                  <p className="mt-2 text-sm leading-7 text-gray-600">
                    {canWatch
                      ? video.access_type === "paid_agent"
                        ? ui.paidAgent
                        : ui.free
                      : viewer.isLoggedIn
                        ? ui.lockedDescNoMembership
                        : ui.lockedDescLoggedOut}
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}