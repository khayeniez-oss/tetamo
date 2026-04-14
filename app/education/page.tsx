"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Clock3,
  Lightbulb,
  Lock,
  Mic,
  PlayCircle,
  Presentation,
  Search,
  Tv,
  Video,
} from "lucide-react";
import { useLanguage } from "@/app/context/LanguageContext";
import { supabase } from "@/lib/supabase";
import { TetamoSelect } from "@/components/ui/TetamoSelect";

type EducationAccessType = "public" | "paid_agent";
type EducationContentType =
  | "tutorial"
  | "training"
  | "podcast"
  | "webinar"
  | "tips";

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
  duration_seconds: number;
  access_type: EducationAccessType;
  published_at: string | null;
  is_featured: boolean | null;
  education_categories: { name: string } | null;
};

type ViewerState = {
  isLoggedIn: boolean;
  hasEducationAccess: boolean;
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
    case "tips":
      return Lightbulb;
    default:
      return Video;
  }
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
    duration_seconds: Number(row?.duration_seconds ?? 0),
    access_type: (row?.access_type ?? "public") as EducationAccessType,
    published_at: row?.published_at ?? null,
    is_featured: Boolean(row?.is_featured),
    education_categories: category?.name ? { name: category.name } : null,
  };
}

async function resolveEducationAccess(userId: string): Promise<boolean> {
  const nowIso = new Date().toISOString();

  try {
    const [membershipRes, educationPassRes] = await Promise.all([
      supabase
        .from("agent_memberships")
        .select("id")
        .eq("user_id", userId)
        .eq("status", "active")
        .gt("expires_at", nowIso)
        .limit(1),
      supabase
        .from("education_access_passes")
        .select("id")
        .eq("user_id", userId)
        .eq("status", "active")
        .gt("expires_at", nowIso)
        .limit(1),
    ]);

    if (membershipRes.error) {
      console.error("Failed to check agent membership access:", membershipRes.error);
    }

    if (educationPassRes.error) {
      console.error(
        "Failed to check education access pass:",
        educationPassRes.error
      );
    }

    const hasMembership =
      Array.isArray(membershipRes.data) && membershipRes.data.length > 0;

    const hasEducationPass =
      Array.isArray(educationPassRes.data) && educationPassRes.data.length > 0;

    return hasMembership || hasEducationPass;
  } catch (error) {
    console.error("Failed to resolve education access:", error);
    return false;
  }
}

export default function PublicEducationPage() {
  const { lang } = useLanguage();

  const ui = useMemo(
    () => ({
      heroBadge: "TETAMO EDUCATION",
      heroTitle:
        lang === "id"
          ? "Tutorial, training, podcast, webinar, dan tips untuk belajar lebih cepat"
          : "Tutorials, training, podcasts, webinars, and tips to help you learn faster",
      heroText:
        lang === "id"
          ? "Tonton video education Tetamo untuk panduan platform, training penjualan, insight properti, tips praktis, dan konten pembelajaran lainnya."
          : "Watch Tetamo education videos for platform guides, sales training, property insights, practical tips, and more learning content.",
      searchPlaceholder:
        lang === "id"
          ? "Cari judul, speaker, kategori, tipe..."
          : "Search title, speaker, category, type...",
      allTypes: lang === "id" ? "Semua Tipe" : "All Types",
      tutorial: lang === "id" ? "Tutorial" : "Tutorial",
      training: lang === "id" ? "Training" : "Training",
      podcast: lang === "id" ? "Podcast" : "Podcast",
      webinar: lang === "id" ? "Webinar" : "Webinar",
      tips: lang === "id" ? "Tips" : "Tips",
      allAccess: lang === "id" ? "Semua Akses" : "All Access",
      free: lang === "id" ? "Free" : "Free",
      premiumAccess: lang === "id" ? "Premium Access" : "Premium Access",
      loading: lang === "id" ? "Memuat video..." : "Loading videos...",
      noVideos:
        lang === "id"
          ? "Belum ada video education yang tersedia."
          : "No education videos available yet.",
      noResults:
        lang === "id"
          ? "Tidak ada hasil yang cocok."
          : "No matching results.",
      featured: lang === "id" ? "Featured" : "Featured",
      category: lang === "id" ? "Kategori" : "Category",
      speaker: lang === "id" ? "Speaker" : "Speaker",
      watchNow: lang === "id" ? "Tonton Sekarang" : "Watch Now",
      unlockToWatch:
        lang === "id" ? "Buka untuk Menonton" : "Unlock to Watch",
      locked: lang === "id" ? "Terkunci" : "Locked",
      notSet: lang === "id" ? "Belum diatur" : "Not set",
      videosFound: (count: number) =>
        lang === "id" ? `${count} video ditemukan` : `${count} videos found`,
      premiumTagline:
        lang === "id"
          ? "Aktif untuk member agent atau pemilik Education Pass"
          : "Available for active agent members or Education Pass holders",
      freeTagline:
        lang === "id"
          ? "Bisa ditonton semua orang"
          : "Available to everyone",
    }),
    [lang]
  );

  const typeOptions = useMemo(
    () => [
      { value: "all", label: ui.allTypes },
      { value: "tutorial", label: ui.tutorial },
      { value: "training", label: ui.training },
      { value: "podcast", label: ui.podcast },
      { value: "webinar", label: ui.webinar },
      { value: "tips", label: ui.tips },
    ],
    [ui]
  );

  const accessOptions = useMemo(
    () => [
      { value: "all", label: ui.allAccess },
      { value: "public", label: ui.free },
      { value: "paid_agent", label: ui.premiumAccess },
    ],
    [ui]
  );

  const [videos, setVideos] = useState<EducationVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | EducationContentType>(
    "all"
  );
  const [accessFilter, setAccessFilter] = useState<
    "all" | EducationAccessType
  >("all");
  const [viewer, setViewer] = useState<ViewerState>({
    isLoggedIn: false,
    hasEducationAccess: false,
  });

  const getTypeLabel = (type: EducationContentType) => {
    if (type === "tutorial") return ui.tutorial;
    if (type === "training") return ui.training;
    if (type === "podcast") return ui.podcast;
    if (type === "webinar") return ui.webinar;
    return ui.tips;
  };

  useEffect(() => {
    let ignore = false;

    async function loadViewer() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (ignore) return;

      if (!user?.id) {
        setViewer({
          isLoggedIn: false,
          hasEducationAccess: false,
        });
        return;
      }

      const hasEducationAccess = await resolveEducationAccess(user.id);

      if (!ignore) {
        setViewer({
          isLoggedIn: true,
          hasEducationAccess,
        });
      }
    }

    async function loadVideos() {
      setLoading(true);

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
          duration_seconds,
          access_type,
          published_at,
          is_featured,
          education_categories(name)
        `)
        .eq("status", "published")
        .order("is_featured", { ascending: false })
        .order("published_at", { ascending: false })
        .order("created_at", { ascending: false });

      if (ignore) return;

      if (error) {
        console.error("Failed to load education videos:", error);
        setVideos([]);
        setLoading(false);
        return;
      }

      const normalizedVideos = Array.isArray(data)
        ? data.map((row) => normalizeEducationVideo(row))
        : [];

      const liveVideos = normalizedVideos.filter((video) =>
        isLiveNow(video.published_at)
      );

      setVideos(liveVideos);
      setLoading(false);
    }

    loadViewer();
    loadVideos();

    return () => {
      ignore = true;
    };
  }, []);

  const filteredVideos = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return videos.filter((video) => {
      if (typeFilter !== "all" && video.content_type !== typeFilter) {
        return false;
      }

      if (accessFilter !== "all" && video.access_type !== accessFilter) {
        return false;
      }

      if (!q) return true;

      const activeTitle =
        lang === "id"
          ? video.title_id?.trim() || video.title?.trim() || ""
          : video.title?.trim() || video.title_id?.trim() || "";

      const activeDescription =
        lang === "id"
          ? video.description_id?.trim() || video.description?.trim() || ""
          : video.description?.trim() || video.description_id?.trim() || "";

      const searchable = `
        ${activeTitle}
        ${activeDescription}
        ${video.education_categories?.name ?? ""}
        ${video.speaker_name ?? ""}
        ${video.content_type}
        ${video.access_type}
      `.toLowerCase();

      return q
        .split(/\s+/)
        .filter(Boolean)
        .every((word) => searchable.includes(word));
    });
  }, [videos, searchQuery, typeFilter, accessFilter, lang]);

  return (
    <main className="min-h-screen bg-[#FAFAF8]">
      <section className="border-b border-gray-200 bg-white px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <span className="inline-flex rounded-full border border-gray-200 bg-gray-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-gray-600">
              {ui.heroBadge}
            </span>

            <h1 className="mt-4 text-3xl font-bold leading-tight text-[#1C1C1E] sm:text-4xl lg:text-5xl">
              {ui.heroTitle}
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-gray-600 sm:text-base">
              {ui.heroText}
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,0.6fr)_minmax(0,0.6fr)]">
            <div className="relative">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
                size={18}
              />
              <input
                type="text"
                placeholder={ui.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-2xl border border-gray-300 bg-white py-3 pl-12 pr-4 text-sm outline-none placeholder-gray-400 focus:border-[#1C1C1E]"
              />
            </div>

            <TetamoSelect
              value={typeFilter}
              onChange={(value: string) =>
                setTypeFilter(value as "all" | EducationContentType)
              }
              placeholder={ui.allTypes}
              options={typeOptions}
            />

            <TetamoSelect
              value={accessFilter}
              onChange={(value: string) =>
                setAccessFilter(value as "all" | EducationAccessType)
              }
              placeholder={ui.allAccess}
              options={accessOptions}
            />
          </div>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 text-sm text-gray-500">
            {ui.videosFound(filteredVideos.length)}
          </div>

          {loading ? (
            <div className="rounded-3xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500 shadow-sm">
              {ui.loading}
            </div>
          ) : filteredVideos.length === 0 ? (
            <div className="rounded-3xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500 shadow-sm">
              {videos.length === 0 ? ui.noVideos : ui.noResults}
            </div>
          ) : (
            <div className="space-y-6">
              {filteredVideos.map((video) => {
                const activeTitle =
                  lang === "id"
                    ? video.title_id?.trim() || video.title?.trim() || ""
                    : video.title?.trim() || video.title_id?.trim() || "";

                const activeDescription =
                  lang === "id"
                    ? video.description_id?.trim() ||
                      video.description?.trim() ||
                      ""
                    : video.description?.trim() ||
                      video.description_id?.trim() ||
                      "";

                const Icon = getTypeIcon(video.content_type);
                const isLocked =
                  video.access_type === "paid_agent" &&
                  !viewer.hasEducationAccess;

                return (
                  <article
                    key={video.id}
                    className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <Link href={`/education/${video.slug}`} className="block">
                      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_260px]">
                        <div className="p-5 sm:p-6 lg:p-7">
                          <div className="flex flex-wrap gap-2">
                            <div className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-[#1C1C1E]">
                              <Icon size={14} />
                              {getTypeLabel(video.content_type)}
                            </div>

                            <div
                              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                                video.access_type === "paid_agent"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-blue-100 text-blue-700"
                              }`}
                            >
                              {video.access_type === "paid_agent" ? (
                                <Lock size={12} />
                              ) : null}
                              {video.access_type === "paid_agent"
                                ? ui.premiumAccess
                                : ui.free}
                            </div>

                            {video.is_featured ? (
                              <div className="inline-flex rounded-full bg-[#1C1C1E] px-3 py-1 text-xs font-semibold text-white">
                                {ui.featured}
                              </div>
                            ) : null}
                          </div>

                          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                            <span className="inline-flex items-center gap-1">
                              <Clock3 size={13} />
                              {formatDuration(video.duration_seconds)}
                            </span>
                            <span>•</span>
                            <span>{formatDate(video.published_at)}</span>
                          </div>

                          <h2 className="mt-4 text-xl font-bold leading-8 text-[#1C1C1E] sm:text-2xl">
                            {activeTitle}
                          </h2>

                          <p className="mt-4 line-clamp-4 text-sm leading-8 text-gray-600 sm:text-base">
                            {activeDescription || ui.notSet}
                          </p>

                          <div className="mt-5 grid grid-cols-1 gap-2 text-sm text-gray-600 sm:grid-cols-2">
                            <div>
                              <span className="font-semibold text-[#1C1C1E]">
                                {ui.category}:
                              </span>{" "}
                              {video.education_categories?.name || ui.notSet}
                            </div>

                            <div>
                              <span className="font-semibold text-[#1C1C1E]">
                                {ui.speaker}:
                              </span>{" "}
                              {video.speaker_name || ui.notSet}
                            </div>
                          </div>

                          <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#1C1C1E]">
                            <PlayCircle size={16} />
                            {isLocked ? ui.unlockToWatch : ui.watchNow}
                          </div>

                          <p className="mt-2 text-xs text-gray-500">
                            {video.access_type === "paid_agent"
                              ? ui.premiumTagline
                              : ui.freeTagline}
                          </p>
                        </div>

                        <div className="relative border-t border-gray-200 bg-[#F3F4F6] md:border-l md:border-t-0">
                          <div className="flex h-[240px] items-center justify-center p-4 md:h-full md:min-h-[290px]">
                            {video.thumbnail_url ? (
                              <img
                                src={video.thumbnail_url}
                                alt={activeTitle}
                                className="max-h-full max-w-full rounded-2xl object-contain"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center rounded-2xl bg-[#1C1C1E] text-4xl font-bold text-white">
                                {getInitials(activeTitle)}
                              </div>
                            )}
                          </div>

                          {isLocked ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                              <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#1C1C1E] shadow-sm">
                                <Lock size={15} />
                                {ui.locked}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </Link>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}