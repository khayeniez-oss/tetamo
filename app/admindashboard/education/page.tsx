"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Eye,
  Lock,
  Mic,
  Plus,
  Presentation,
  Search,
  Tv,
  Video,
} from "lucide-react";
import { useLanguage } from "@/app/context/LanguageContext";
import { supabase } from "@/lib/supabase";
import { TetamoSelect } from "@/components/ui/TetamoSelect";

type EducationAccessType = "public" | "paid_agent";
type EducationStatus = "draft" | "published";
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
  duration_seconds: number;
  access_type: EducationAccessType;
  status: EducationStatus;
  published_at: string | null;
  is_featured: boolean | null;
  sort_order: number | null;
  created_at: string | null;
  updated_at: string | null;
  education_categories: { name: string } | null;
};

type StatusFilter = "all" | "draft" | "published" | "scheduled";
type AccessFilter = "all" | "public" | "paid_agent";
type TypeFilter = "all" | EducationContentType;

function formatDateTime(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
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

function isFutureDate(value?: string | null) {
  if (!value) return false;

  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return false;

  return time > Date.now();
}

function getEffectiveStatus(
  video: Pick<EducationVideo, "status" | "published_at">
): "draft" | "published" | "scheduled" {
  if (video.status === "draft") return "draft";
  if (video.status === "published" && isFutureDate(video.published_at)) {
    return "scheduled";
  }
  return "published";
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
    status: (row?.status ?? "draft") as EducationStatus,
    published_at: row?.published_at ?? null,
    is_featured: Boolean(row?.is_featured),
    sort_order: Number(row?.sort_order ?? 0),
    created_at: row?.created_at ?? null,
    updated_at: row?.updated_at ?? null,
    education_categories: category?.name ? { name: category.name } : null,
  };
}

export default function AdminEducationPage() {
  const { lang } = useLanguage();

  const ui = useMemo(
    () => ({
      title: "Education Manager",
      subtitle:
        lang === "id"
          ? "Kelola video tutorial, training, podcast, dan webinar."
          : "Manage tutorial, training, podcast, and webinar videos.",
      createNew: lang === "id" ? "Buat Video Baru" : "Create New Video",
      searchPlaceholder:
        lang === "id"
          ? "Cari judul, kategori, speaker, slug..."
          : "Search title, category, speaker, slug...",
      allStatus: lang === "id" ? "Semua Status" : "All Status",
      draft: lang === "id" ? "Draft" : "Draft",
      published: lang === "id" ? "Published" : "Published",
      scheduled: lang === "id" ? "Scheduled" : "Scheduled",
      allAccess: lang === "id" ? "Semua Akses" : "All Access",
      public: lang === "id" ? "Public" : "Public",
      paidAgent: lang === "id" ? "Paid Agent" : "Paid Agent",
      allTypes: lang === "id" ? "Semua Tipe" : "All Types",
      tutorial: lang === "id" ? "Tutorial" : "Tutorial",
      training: lang === "id" ? "Training" : "Training",
      podcast: lang === "id" ? "Podcast" : "Podcast",
      webinar: lang === "id" ? "Webinar" : "Webinar",
      totalVideos: lang === "id" ? "Total Video" : "Total Videos",
      liveNow: lang === "id" ? "Live Sekarang" : "Live Now",
      scheduledCount: lang === "id" ? "Terjadwal" : "Scheduled",
      drafts: lang === "id" ? "Draft" : "Drafts",
      noVideos:
        lang === "id"
          ? "Belum ada video education."
          : "No education videos yet.",
      noResults:
        lang === "id"
          ? "Tidak ada hasil yang cocok."
          : "No matching results.",
      viewPublic: lang === "id" ? "Lihat Public" : "View Public",
      edit: lang === "id" ? "Edit" : "Edit",
      category: lang === "id" ? "Kategori" : "Category",
      speaker: lang === "id" ? "Speaker" : "Speaker",
      duration: lang === "id" ? "Durasi" : "Duration",
      publishAt: lang === "id" ? "Publish At" : "Publish At",
      updatedAt: lang === "id" ? "Updated" : "Updated",
      featured: lang === "id" ? "Featured" : "Featured",
      notSet: lang === "id" ? "Belum diatur" : "Not set",
      videosFound: (count: number) =>
        lang === "id" ? `${count} video ditemukan` : `${count} videos found`,
      loading: lang === "id" ? "Memuat video..." : "Loading videos...",
    }),
    [lang]
  );

  const statusOptions = useMemo(
    () => [
      { value: "all", label: ui.allStatus },
      { value: "draft", label: ui.draft },
      { value: "published", label: ui.published },
      { value: "scheduled", label: ui.scheduled },
    ],
    [ui]
  );

  const accessOptions = useMemo(
    () => [
      { value: "all", label: ui.allAccess },
      { value: "public", label: ui.public },
      { value: "paid_agent", label: ui.paidAgent },
    ],
    [ui]
  );

  const typeOptions = useMemo(
    () => [
      { value: "all", label: ui.allTypes },
      { value: "tutorial", label: ui.tutorial },
      { value: "training", label: ui.training },
      { value: "podcast", label: ui.podcast },
      { value: "webinar", label: ui.webinar },
    ],
    [ui]
  );

  const [videos, setVideos] = useState<EducationVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [accessFilter, setAccessFilter] = useState<AccessFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");

  useEffect(() => {
    let ignore = false;

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
          status,
          published_at,
          is_featured,
          sort_order,
          created_at,
          updated_at,
          education_categories(name)
        `)
        .order("sort_order", { ascending: true })
        .order("published_at", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Failed to load education videos:", error);
        if (!ignore) {
          setVideos([]);
          setLoading(false);
        }
        return;
      }

      const normalizedVideos = Array.isArray(data)
        ? data.map((row) => normalizeEducationVideo(row))
        : [];

      if (!ignore) {
        setVideos(normalizedVideos);
        setLoading(false);
      }
    }

    loadVideos();

    return () => {
      ignore = true;
    };
  }, []);

  const filteredVideos = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return videos.filter((video) => {
      const effectiveStatus = getEffectiveStatus(video);

      if (statusFilter !== "all" && effectiveStatus !== statusFilter) {
        return false;
      }

      if (accessFilter !== "all" && video.access_type !== accessFilter) {
        return false;
      }

      if (typeFilter !== "all" && video.content_type !== typeFilter) {
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
        ${video.slug}
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
  }, [videos, searchQuery, statusFilter, accessFilter, typeFilter, lang]);

  const stats = useMemo(() => {
    const live = videos.filter(
      (video) => getEffectiveStatus(video) === "published"
    ).length;
    const scheduled = videos.filter(
      (video) => getEffectiveStatus(video) === "scheduled"
    ).length;
    const drafts = videos.filter(
      (video) => getEffectiveStatus(video) === "draft"
    ).length;

    return {
      total: videos.length,
      live,
      scheduled,
      drafts,
    };
  }, [videos]);

  const getTypeLabel = (type: EducationContentType) => {
    if (type === "tutorial") return ui.tutorial;
    if (type === "training") return ui.training;
    if (type === "podcast") return ui.podcast;
    return ui.webinar;
  };

  const getAccessLabel = (access: EducationAccessType) => {
    return access === "paid_agent" ? ui.paidAgent : ui.public;
  };

  const getStatusLabel = (status: "draft" | "published" | "scheduled") => {
    if (status === "draft") return ui.draft;
    if (status === "scheduled") return ui.scheduled;
    return ui.published;
  };

  return (
    <div className="min-h-screen bg-[#F6F6F3]">
      <div className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold text-[#1C1C1E]">
              {ui.title}
            </h1>
            <p className="mt-1 text-sm text-gray-500">{ui.subtitle}</p>
          </div>

          <Link
            href="/admindashboard/education/new"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1C1C1E] px-4 py-3 text-sm font-semibold text-white hover:opacity-90"
          >
            <Plus size={16} />
            {ui.createNew}
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">{ui.totalVideos}</p>
            <p className="mt-2 text-2xl font-bold text-[#1C1C1E]">
              {stats.total}
            </p>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">{ui.liveNow}</p>
            <p className="mt-2 text-2xl font-bold text-[#1C1C1E]">
              {stats.live}
            </p>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">{ui.scheduledCount}</p>
            <p className="mt-2 text-2xl font-bold text-[#1C1C1E]">
              {stats.scheduled}
            </p>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">{ui.drafts}</p>
            <p className="mt-2 text-2xl font-bold text-[#1C1C1E]">
              {stats.drafts}
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(0,0.6fr))]">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={ui.searchPlaceholder}
                className="w-full rounded-2xl border border-gray-300 bg-white py-3 pl-11 pr-4 text-sm outline-none placeholder-gray-400 focus:border-[#1C1C1E]"
              />
            </div>

            <TetamoSelect
              value={statusFilter}
              onChange={(value: string) =>
                setStatusFilter(value as StatusFilter)
              }
              placeholder={ui.allStatus}
              options={statusOptions}
            />

            <TetamoSelect
              value={accessFilter}
              onChange={(value: string) =>
                setAccessFilter(value as AccessFilter)
              }
              placeholder={ui.allAccess}
              options={accessOptions}
            />

            <TetamoSelect
              value={typeFilter}
              onChange={(value: string) => setTypeFilter(value as TypeFilter)}
              placeholder={ui.allTypes}
              options={typeOptions}
            />
          </div>

          <div className="mt-4 text-sm text-gray-500">
            {ui.videosFound(filteredVideos.length)}
          </div>
        </div>

        {loading ? (
          <div className="mt-6 rounded-3xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500 shadow-sm">
            {ui.loading}
          </div>
        ) : filteredVideos.length === 0 ? (
          <div className="mt-6 rounded-3xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500 shadow-sm">
            {videos.length === 0 ? ui.noVideos : ui.noResults}
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-2">
            {filteredVideos.map((video) => {
              const effectiveStatus = getEffectiveStatus(video);
              const Icon = getTypeIcon(video.content_type);

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

              return (
                <article
                  key={video.id}
                  className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm"
                >
                  <div className="flex flex-col md:flex-row">
                    <div className="relative h-56 w-full shrink-0 md:h-auto md:w-[260px]">
                      {video.thumbnail_url ? (
                        <img
                          src={video.thumbnail_url}
                          alt={activeTitle}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-[#1C1C1E] text-4xl font-bold text-white">
                          {getInitials(activeTitle)}
                        </div>
                      )}

                      <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                        <div className="inline-flex items-center gap-1 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-[#1C1C1E] shadow-sm">
                          <Icon size={14} />
                          {getTypeLabel(video.content_type)}
                        </div>

                        {video.is_featured ? (
                          <div className="rounded-full bg-[#1C1C1E] px-3 py-1 text-xs font-semibold text-white">
                            {ui.featured}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="min-w-0 flex-1 p-5 sm:p-6">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            effectiveStatus === "draft"
                              ? "bg-gray-100 text-gray-700"
                              : effectiveStatus === "scheduled"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {getStatusLabel(effectiveStatus)}
                        </span>

                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                            video.access_type === "paid_agent"
                              ? "bg-red-100 text-red-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {video.access_type === "paid_agent" ? (
                            <Lock size={12} />
                          ) : null}
                          {getAccessLabel(video.access_type)}
                        </span>
                      </div>

                      <h2 className="mt-3 line-clamp-2 text-xl font-bold leading-8 text-[#1C1C1E]">
                        {activeTitle || "Untitled"}
                      </h2>

                      <p className="mt-3 line-clamp-3 text-sm leading-7 text-gray-600">
                        {activeDescription || ui.notSet}
                      </p>

                      <div className="mt-5 grid grid-cols-1 gap-3 text-sm text-gray-600 sm:grid-cols-2">
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

                        <div>
                          <span className="font-semibold text-[#1C1C1E]">
                            {ui.duration}:
                          </span>{" "}
                          {formatDuration(video.duration_seconds)}
                        </div>

                        <div>
                          <span className="font-semibold text-[#1C1C1E]">
                            {ui.publishAt}:
                          </span>{" "}
                          {formatDateTime(video.published_at)}
                        </div>

                        <div className="sm:col-span-2">
                          <span className="font-semibold text-[#1C1C1E]">
                            {ui.updatedAt}:
                          </span>{" "}
                          {formatDateTime(video.updated_at)}
                        </div>
                      </div>

                      <div className="mt-6 flex flex-wrap gap-3">
                        <Link
                          href={`/admindashboard/education/${video.id}/edit`}
                          className="inline-flex items-center justify-center rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-[#1C1C1E] hover:bg-gray-50"
                        >
                          {ui.edit}
                        </Link>

                        {effectiveStatus !== "draft" ? (
                          <Link
                            href={`/education/${video.slug}`}
                            target="_blank"
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-[#1C1C1E] hover:bg-gray-50"
                          >
                            <Eye size={15} />
                            {ui.viewPublic}
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}