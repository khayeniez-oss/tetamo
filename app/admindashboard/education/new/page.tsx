"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Eye,
  ImageIcon,
  Mic,
  Plus,
  Presentation,
  Save,
  Send,
  Tv,
  Upload,
  Video,
  BookOpen,
  Lock,
} from "lucide-react";
import { useLanguage } from "@/app/context/LanguageContext";
import { supabase } from "@/lib/supabase";

type EducationAccessType = "public" | "paid_agent";
type EducationContentType = "tutorial" | "training" | "podcast" | "webinar";
type VideoProvider = "supabase" | "external";
type PreviewLang = "en" | "id";

type EducationCategory = {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
};

type EducationForm = {
  title: string;
  title_id: string;
  slug: string;
  description: string;
  description_id: string;
  content_type: EducationContentType;
  category_id: string;
  speaker_name: string;
  thumbnail_url: string;
  video_provider: VideoProvider;
  video_url: string;
  video_storage_path: string;
  duration_seconds: string;
  access_type: EducationAccessType;
  is_featured: boolean;
  sort_order: string;
  publish_at: string;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

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

function toIsoFromDatetimeLocal(value: string) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date.toISOString();
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

function InputBase(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none placeholder-gray-400 focus:border-[#1C1C1E] ${props.className ?? ""}`}
    />
  );
}

function SelectBase(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-[#1C1C1E] ${props.className ?? ""}`}
    />
  );
}

function TextareaBase(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none placeholder-gray-400 focus:border-[#1C1C1E] ${props.className ?? ""}`}
    />
  );
}

function FieldLabel({
  children,
  required = false,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="mb-2 block text-sm font-semibold text-[#1C1C1E]">
      {children}
      {required && <span className="ml-1 text-red-500">*</span>}
    </label>
  );
}

function LangPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
        active
          ? "border-[#1C1C1E] bg-[#1C1C1E] text-white"
          : "border-gray-300 bg-white text-[#1C1C1E] hover:bg-gray-50"
      }`}
    >
      {children}
    </button>
  );
}

function ToggleCard({
  active,
  onClick,
  title,
  subtitle,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition ${
        active
          ? "border-[#1C1C1E] bg-[#1C1C1E] text-white"
          : "border-gray-300 bg-white text-[#1C1C1E] hover:bg-gray-50"
      }`}
    >
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0">
        <div className="font-semibold">{title}</div>
        <div className={`mt-1 text-xs ${active ? "text-white/80" : "text-gray-500"}`}>
          {subtitle}
        </div>
      </div>
    </button>
  );
}

function getTypeIcon(type: EducationContentType) {
  switch (type) {
    case "tutorial":
      return <BookOpen size={16} />;
    case "training":
      return <Presentation size={16} />;
    case "podcast":
      return <Mic size={16} />;
    case "webinar":
      return <Tv size={16} />;
    default:
      return <Video size={16} />;
  }
}

export default function AdminNewEducationPage() {
  const router = useRouter();
  const { lang } = useLanguage();

  const ui = useMemo(
    () => ({
      back: lang === "id" ? "Kembali" : "Back",
      pageTitle: lang === "id" ? "Video Education Baru" : "New Education Video",
      pageSubtitle:
        lang === "id"
          ? "Buat video tutorial, training, podcast, atau webinar."
          : "Create tutorial, training, podcast, or webinar videos.",
      preview: lang === "id" ? "Preview" : "Preview",
      hidePreview: lang === "id" ? "Sembunyikan Preview" : "Hide Preview",
      saveDraft: lang === "id" ? "Simpan Draft" : "Save Draft",
      saving: lang === "id" ? "Menyimpan..." : "Saving...",
      publish: lang === "id" ? "Publish" : "Publish",
      publishing: lang === "id" ? "Publishing..." : "Publishing...",
      schedule: lang === "id" ? "Jadwalkan" : "Schedule",
      scheduling: lang === "id" ? "Menjadwalkan..." : "Scheduling...",
      englishVersion: lang === "id" ? "Versi English" : "English Version",
      indonesianVersion: lang === "id" ? "Versi Indonesia" : "Indonesian Version",
      englishTitle: lang === "id" ? "Judul English" : "English Title",
      indonesianTitle: lang === "id" ? "Judul Indonesia" : "Indonesian Title",
      englishDescription: lang === "id" ? "Deskripsi English" : "English Description",
      indonesianDescription: lang === "id" ? "Deskripsi Indonesia" : "Indonesian Description",
      addEnglishTitle: lang === "id" ? "Tambah judul English" : "Add English title",
      addIndonesianTitle:
        lang === "id" ? "Tambah judul Bahasa Indonesia" : "Add Indonesian title",
      writeEnglishDescription:
        lang === "id"
          ? "Tulis deskripsi English..."
          : "Write English description...",
      writeIndonesianDescription:
        lang === "id"
          ? "Tulis deskripsi Bahasa Indonesia..."
          : "Write Indonesian description...",
      publishSettings: lang === "id" ? "Pengaturan Publish" : "Publish Settings",
      slug: lang === "id" ? "Slug" : "Slug",
      writerSpeaker: lang === "id" ? "Speaker / Host" : "Speaker / Host",
      category: lang === "id" ? "Kategori" : "Category",
      selectCategory: lang === "id" ? "Pilih kategori" : "Select category",
      loadingCategories:
        lang === "id" ? "Memuat kategori..." : "Loading categories...",
      contentType: lang === "id" ? "Tipe Konten" : "Content Type",
      accessType: lang === "id" ? "Tipe Akses" : "Access Type",
      duration: lang === "id" ? "Durasi (detik)" : "Duration (seconds)",
      durationHelp:
        lang === "id"
          ? "Minimum 90 detik, maksimum 2700 detik (45 menit). Contoh: 180 = 3 menit."
          : "Minimum 90 seconds, maximum 2700 seconds (45 minutes). Example: 180 = 3 minutes.",
      sortOrder: lang === "id" ? "Urutan" : "Sort Order",
      featured: lang === "id" ? "Featured" : "Featured",
      publishDate: lang === "id" ? "Tanggal Publish" : "Publish Date",
      publishDateHelp:
        lang === "id"
          ? "Kosongkan untuk publish langsung. Isi tanggal masa depan untuk schedule."
          : "Leave blank to publish immediately. Set a future date to schedule.",
      media: lang === "id" ? "Media" : "Media",
      thumbnail: lang === "id" ? "Thumbnail" : "Thumbnail",
      uploadThumbnail: lang === "id" ? "Upload Thumbnail" : "Upload Thumbnail",
      remove: lang === "id" ? "Hapus" : "Remove",
      noThumbnail: lang === "id" ? "Belum ada thumbnail" : "No thumbnail yet",
      videoSource: lang === "id" ? "Sumber Video" : "Video Source",
      uploadToSupabase:
        lang === "id" ? "Upload ke Supabase" : "Upload to Supabase",
      externalUrl: lang === "id" ? "URL Eksternal" : "External URL",
      uploadVideo: lang === "id" ? "Upload Video" : "Upload Video",
      replaceVideo: lang === "id" ? "Ganti Video" : "Replace Video",
      videoAttached: lang === "id" ? "Video sudah terpasang" : "Video attached",
      noVideoYet: lang === "id" ? "Belum ada video" : "No video yet",
      videoUrl: lang === "id" ? "URL Video" : "Video URL",
      enterVideoUrl:
        lang === "id"
          ? "Masukkan URL video eksternal"
          : "Enter external video URL",
      publicAccess: lang === "id" ? "Public" : "Public",
      publicAccessDesc:
        lang === "id"
          ? "Semua orang bisa menonton."
          : "Everyone can watch.",
      paidAgentAccess: lang === "id" ? "Paid Agent" : "Paid Agent",
      paidAgentAccessDesc:
        lang === "id"
          ? "Hanya agent member aktif yang bisa menonton."
          : "Only active paid agents can watch.",
      tutorial: lang === "id" ? "Tutorial" : "Tutorial",
      training: lang === "id" ? "Training" : "Training",
      podcast: lang === "id" ? "Podcast" : "Podcast",
      webinar: lang === "id" ? "Webinar" : "Webinar",
      scheduleStatus: lang === "id" ? "Status Schedule" : "Schedule Status",
      scheduleNow: lang === "id" ? "Publish langsung" : "Immediate publish",
      scheduleFuture: lang === "id" ? "Terjadwal" : "Scheduled",
      currentPlan:
        lang === "id"
          ? "Video berdurasi panjang lebih cocok saat Supabase sudah Pro."
          : "Longer video uploads are better once Supabase is on Pro.",
      previewCard: lang === "id" ? "Preview Kartu" : "Card Preview",
      untitled: lang === "id" ? "Belum ada judul" : "Untitled",
      noDescription:
        lang === "id" ? "Belum ada deskripsi." : "No description yet.",
      publicUrl: lang === "id" ? "Public URL" : "Public URL",
      uploadThumbnailFailed:
        lang === "id" ? "Gagal upload thumbnail." : "Failed to upload thumbnail.",
      uploadVideoFailed:
        lang === "id" ? "Gagal upload video." : "Failed to upload video.",
      titleRequired:
        lang === "id" ? "Judul English wajib diisi." : "English title is required.",
      titleIdRequired:
        lang === "id"
          ? "Judul Bahasa Indonesia wajib diisi."
          : "Indonesian title is required.",
      slugRequired: lang === "id" ? "Slug wajib diisi." : "Slug is required.",
      descriptionRequired:
        lang === "id"
          ? "Deskripsi English wajib diisi."
          : "English description is required.",
      descriptionIdRequired:
        lang === "id"
          ? "Deskripsi Bahasa Indonesia wajib diisi."
          : "Indonesian description is required.",
      durationRequired:
        lang === "id" ? "Durasi wajib diisi." : "Duration is required.",
      durationRange:
        lang === "id"
          ? "Durasi harus 90 sampai 2700 detik."
          : "Duration must be between 90 and 2700 seconds.",
      mediaRequired:
        lang === "id"
          ? "Upload video atau isi URL video."
          : "Upload a video or enter a video URL.",
      publishDateInvalid:
        lang === "id" ? "Tanggal publish tidak valid." : "Publish date is invalid.",
      createSuccessDraft:
        lang === "id" ? "Draft video berhasil disimpan." : "Video draft saved successfully.",
      createSuccessPublished:
        lang === "id" ? "Video berhasil dipublish." : "Video published successfully.",
      createSuccessScheduled: (date: string) =>
        lang === "id"
          ? `Video berhasil dijadwalkan untuk ${date}.`
          : `Video scheduled for ${date}.`,
      englishPreview: lang === "id" ? "Preview English" : "English Preview",
      indonesianPreview: lang === "id" ? "Preview Indonesia" : "Indonesian Preview",
      sourcePath: lang === "id" ? "Path Video" : "Video Path",
      notSet: lang === "id" ? "Belum diatur" : "Not set",
    }),
    [lang]
  );

  const thumbnailInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);

  const [form, setForm] = useState<EducationForm>({
    title: "",
    title_id: "",
    slug: "",
    description: "",
    description_id: "",
    content_type: "tutorial",
    category_id: "",
    speaker_name: "",
    thumbnail_url: "",
    video_provider: "supabase",
    video_url: "",
    video_storage_path: "",
    duration_seconds: "",
    access_type: "public",
    is_featured: false,
    sort_order: "0",
    publish_at: "",
  });

  const [slugTouched, setSlugTouched] = useState(false);
  const [categories, setCategories] = useState<EducationCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  const [previewMode, setPreviewMode] = useState(false);
  const [previewLang, setPreviewLang] = useState<PreviewLang>("en");
  const [savingDraft, setSavingDraft] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);

  useEffect(() => {
    if (!slugTouched) {
      setForm((prev) => ({
        ...prev,
        slug: slugify(prev.title),
      }));
    }
  }, [form.title, slugTouched]);

  useEffect(() => {
    let ignore = false;

    async function loadCategories() {
      setLoadingCategories(true);

      const { data, error } = await supabase
        .from("education_categories")
        .select("id, name, slug, sort_order")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });

      if (!ignore) {
        if (error) {
          console.error("Failed to load education categories:", error);
          setCategories([]);
        } else {
          setCategories((data ?? []) as EducationCategory[]);
        }

        setLoadingCategories(false);
      }
    }

    loadCategories();

    return () => {
      ignore = true;
    };
  }, []);

  const publicUrlPreview = useMemo(() => {
    return form.slug ? `/education/${form.slug}` : "/education/[slug]";
  }, [form.slug]);

  const previewTitle = previewLang === "id" ? form.title_id : form.title;
  const previewDescription =
    previewLang === "id" ? form.description_id : form.description;

  const publishAtIso = useMemo(() => {
    return toIsoFromDatetimeLocal(form.publish_at);
  }, [form.publish_at]);

  const isScheduled = useMemo(() => {
    if (!publishAtIso) return false;
    return new Date(publishAtIso).getTime() > Date.now();
  }, [publishAtIso]);

  const durationNumber = Number(form.duration_seconds || 0);

  function updateField<K extends keyof EducationForm>(
    key: K,
    value: EducationForm[K]
  ) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function uploadThumbnail(file: File) {
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const cleanSlug = form.slug || slugify(form.title) || "education";
    const path = `thumb/${cleanSlug}-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("education-thumbnails")
      .upload(path, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from("education-thumbnails")
      .getPublicUrl(path);

    return data.publicUrl;
  }

  async function uploadVideo(file: File) {
    const ext = file.name.split(".").pop()?.toLowerCase() || "mp4";
    const cleanSlug = form.slug || slugify(form.title) || "education";
    const safeName = file.name.toLowerCase().replace(/[^a-z0-9.\-_]+/g, "-");
    const path = `video/${cleanSlug}-${Date.now()}-${safeName || `video.${ext}`}`;

    const { error: uploadError } = await supabase.storage
      .from("education-videos")
      .upload(path, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) throw uploadError;

    return path;
  }

  async function handleThumbnailUpload(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingThumbnail(true);
      const url = await uploadThumbnail(file);
      updateField("thumbnail_url", url);
    } catch (error: any) {
      console.error("Failed to upload thumbnail:", error);
      alert(error?.message || ui.uploadThumbnailFailed);
    } finally {
      setUploadingThumbnail(false);
      if (thumbnailInputRef.current) thumbnailInputRef.current.value = "";
    }
  }

  async function handleVideoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingVideo(true);
      const path = await uploadVideo(file);
      setForm((prev) => ({
        ...prev,
        video_storage_path: path,
        video_url: "",
        video_provider: "supabase",
      }));
    } catch (error: any) {
      console.error("Failed to upload video:", error);
      alert(error?.message || ui.uploadVideoFailed);
    } finally {
      setUploadingVideo(false);
      if (videoInputRef.current) videoInputRef.current.value = "";
    }
  }

  async function saveVideo(status: "draft" | "published") {
    const cleanTitle = form.title.trim();
    const cleanTitleId = form.title_id.trim();
    const cleanSlug = slugify(form.slug || form.title);
    const cleanDescription = form.description.trim();
    const cleanDescriptionId = form.description_id.trim();
    const cleanSpeaker = form.speaker_name.trim();
    const cleanDuration = Number(form.duration_seconds || 0);
    const cleanSortOrder = Number(form.sort_order || 0);
    const cleanExternalVideoUrl = form.video_url.trim();
    const resolvedPublishedAt =
      status === "published"
        ? publishAtIso || new Date().toISOString()
        : null;

    if (!cleanTitle) {
      alert(ui.titleRequired);
      return;
    }

    if (!cleanTitleId) {
      alert(ui.titleIdRequired);
      return;
    }

    if (!cleanSlug) {
      alert(ui.slugRequired);
      return;
    }

    if (!cleanDescription) {
      alert(ui.descriptionRequired);
      return;
    }

    if (!cleanDescriptionId) {
      alert(ui.descriptionIdRequired);
      return;
    }

    if (!cleanDuration) {
      alert(ui.durationRequired);
      return;
    }

    if (cleanDuration < 90 || cleanDuration > 2700) {
      alert(ui.durationRange);
      return;
    }

    if (form.video_provider === "external" && !cleanExternalVideoUrl) {
      alert(ui.mediaRequired);
      return;
    }

    if (form.video_provider === "supabase" && !form.video_storage_path) {
      alert(ui.mediaRequired);
      return;
    }

    if (status === "published" && form.publish_at && !publishAtIso) {
      alert(ui.publishDateInvalid);
      return;
    }

    status === "draft" ? setSavingDraft(true) : setPublishing(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user?.id) {
        alert("Please log in first.");
        return;
      }

      const { data, error } = await supabase
        .from("education_videos")
        .insert({
          title: cleanTitle,
          title_id: cleanTitleId,
          slug: cleanSlug,
          description: cleanDescription,
          description_id: cleanDescriptionId,
          content_type: form.content_type,
          category_id: form.category_id || null,
          speaker_name: cleanSpeaker || null,
          thumbnail_url: form.thumbnail_url || null,
          video_provider: form.video_provider,
          video_url: form.video_provider === "external" ? cleanExternalVideoUrl : null,
          video_storage_path:
            form.video_provider === "supabase" ? form.video_storage_path : null,
          duration_seconds: cleanDuration,
          access_type: form.access_type,
          status,
          published_at: resolvedPublishedAt,
          is_featured: form.is_featured,
          sort_order: Number.isNaN(cleanSortOrder) ? 0 : cleanSortOrder,
          created_by: user.id,
          updated_by: user.id,
        })
        .select("id")
        .single();

      if (error) throw error;

      if (status === "draft") {
        alert(ui.createSuccessDraft);
      } else if (resolvedPublishedAt && new Date(resolvedPublishedAt).getTime() > Date.now()) {
        alert(ui.createSuccessScheduled(formatDateTime(resolvedPublishedAt)));
      } else {
        alert(ui.createSuccessPublished);
      }

      if (data?.id) {
        router.push(`/admindashboard/education/${data.id}/edit`);
      } else {
        router.push("/admindashboard/education");
      }
    } catch (error: any) {
      console.error("Failed to save education video:", error);
      alert(error?.message || "Failed to save video.");
    } finally {
      setSavingDraft(false);
      setPublishing(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F6F6F3]">
      <input
        ref={thumbnailInputRef}
        type="file"
        accept="image/*"
        onChange={handleThumbnailUpload}
        className="hidden"
      />

      <input
        ref={videoInputRef}
        type="file"
        accept="video/mp4,video/quicktime,video/webm"
        onChange={handleVideoUpload}
        className="hidden"
      />

      <div className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/admindashboard/education"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-[#1C1C1E] hover:bg-gray-50"
            >
              <ArrowLeft size={16} />
              {ui.back}
            </Link>

            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold text-[#1C1C1E] sm:text-2xl">
                {ui.pageTitle}
              </h1>
              <p className="text-xs text-gray-500 sm:text-sm">{ui.pageSubtitle}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setPreviewMode((prev) => !prev)}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-[#1C1C1E] hover:bg-gray-50"
            >
              <Eye size={16} />
              {previewMode ? ui.hidePreview : ui.preview}
            </button>

            <button
              type="button"
              onClick={() => saveVideo("draft")}
              disabled={savingDraft || publishing}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-[#1C1C1E] hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save size={16} />
              {savingDraft ? ui.saving : ui.saveDraft}
            </button>

            <button
              type="button"
              onClick={() => saveVideo("published")}
              disabled={savingDraft || publishing}
              className="inline-flex items-center gap-2 rounded-xl bg-[#1C1C1E] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send size={16} />
              {publishing
                ? isScheduled
                  ? ui.scheduling
                  : ui.publishing
                : isScheduled
                  ? ui.schedule
                  : ui.publish}
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:px-8">
        <div className="space-y-6">
          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-6 flex flex-wrap items-center gap-2">
              <LangPill
                active={previewLang === "en"}
                onClick={() => setPreviewLang("en")}
              >
                {ui.englishPreview}
              </LangPill>
              <LangPill
                active={previewLang === "id"}
                onClick={() => setPreviewLang("id")}
              >
                {ui.indonesianPreview}
              </LangPill>
            </div>

            <div className="space-y-6">
              <div className="rounded-3xl border border-gray-200 bg-[#FAFAF8] p-4 sm:p-5">
                <h2 className="text-lg font-bold text-[#1C1C1E]">
                  {ui.englishVersion}
                </h2>

                <div className="mt-4">
                  <FieldLabel required>{ui.englishTitle}</FieldLabel>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => updateField("title", e.target.value)}
                    placeholder={ui.addEnglishTitle}
                    className="w-full border-0 bg-transparent p-0 text-3xl font-bold text-[#1C1C1E] outline-none placeholder:text-gray-300 sm:text-4xl"
                  />
                </div>

                <div className="mt-6">
                  <FieldLabel required>{ui.englishDescription}</FieldLabel>
                  <TextareaBase
                    rows={8}
                    value={form.description}
                    onChange={(e) => updateField("description", e.target.value)}
                    placeholder={ui.writeEnglishDescription}
                    className="resize-none border-gray-200 bg-white"
                  />
                </div>
              </div>

              <div className="rounded-3xl border border-gray-200 bg-[#FAFAF8] p-4 sm:p-5">
                <h2 className="text-lg font-bold text-[#1C1C1E]">
                  {ui.indonesianVersion}
                </h2>

                <div className="mt-4">
                  <FieldLabel required>{ui.indonesianTitle}</FieldLabel>
                  <InputBase
                    type="text"
                    value={form.title_id}
                    onChange={(e) => updateField("title_id", e.target.value)}
                    placeholder={ui.addIndonesianTitle}
                  />
                </div>

                <div className="mt-6">
                  <FieldLabel required>{ui.indonesianDescription}</FieldLabel>
                  <TextareaBase
                    rows={8}
                    value={form.description_id}
                    onChange={(e) => updateField("description_id", e.target.value)}
                    placeholder={ui.writeIndonesianDescription}
                    className="resize-none border-gray-200 bg-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {previewMode ? (
            <div className="rounded-3xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-200 px-5 py-4 sm:px-6">
                <h2 className="text-lg font-bold text-[#1C1C1E]">{ui.previewCard}</h2>
              </div>

              <div className="p-5 sm:p-6">
                {form.thumbnail_url ? (
                  <img
                    src={form.thumbnail_url}
                    alt={previewTitle || ui.untitled}
                    className="h-[260px] w-full rounded-3xl object-cover sm:h-[360px]"
                  />
                ) : (
                  <div className="flex h-[220px] items-center justify-center rounded-3xl bg-[#1C1C1E] text-4xl font-bold text-white">
                    {getInitials(previewTitle)}
                  </div>
                )}

                <div className="mt-6 flex flex-wrap gap-2">
                  <div className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-700">
                    {getTypeIcon(form.content_type)}
                    {form.content_type}
                  </div>

                  <div
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                      form.access_type === "paid_agent"
                        ? "bg-red-100 text-red-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {form.access_type === "paid_agent" ? <Lock size={12} /> : null}
                    {form.access_type === "paid_agent" ? ui.paidAgentAccess : ui.publicAccess}
                  </div>

                  {form.is_featured ? (
                    <div className="inline-flex rounded-full bg-[#1C1C1E] px-3 py-1 text-xs font-semibold text-white">
                      {ui.featured}
                    </div>
                  ) : null}
                </div>

                <h2 className="mt-4 text-3xl font-bold leading-tight text-[#1C1C1E]">
                  {previewTitle || ui.untitled}
                </h2>

                <div className="mt-4 grid grid-cols-1 gap-3 text-sm text-gray-600 sm:grid-cols-2">
                  <div>
                    <span className="font-semibold text-[#1C1C1E]">{ui.category}:</span>{" "}
                    {categories.find((item) => item.id === form.category_id)?.name || ui.notSet}
                  </div>

                  <div>
                    <span className="font-semibold text-[#1C1C1E]">{ui.writerSpeaker}:</span>{" "}
                    {form.speaker_name || ui.notSet}
                  </div>

                  <div>
                    <span className="font-semibold text-[#1C1C1E]">{ui.duration}:</span>{" "}
                    {durationNumber ? formatDuration(durationNumber) : ui.notSet}
                  </div>

                  <div>
                    <span className="font-semibold text-[#1C1C1E]">{ui.publishDate}:</span>{" "}
                    {publishAtIso ? formatDateTime(publishAtIso) : ui.scheduleNow}
                  </div>
                </div>

                <p className="mt-6 text-base leading-8 text-gray-600">
                  {previewDescription || ui.noDescription}
                </p>
              </div>
            </div>
          ) : null}
        </div>

        <aside className="space-y-6">
          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-bold text-[#1C1C1E]">{ui.publishSettings}</h2>

            <div className="mt-5 space-y-5">
              <div>
                <FieldLabel required>{ui.slug}</FieldLabel>
                <InputBase
                  type="text"
                  value={form.slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    updateField("slug", slugify(e.target.value));
                  }}
                />
                <p className="mt-2 text-xs text-gray-500">
                  {ui.publicUrl}:{" "}
                  <span className="font-medium text-gray-700">{publicUrlPreview}</span>
                </p>
              </div>

              <div>
                <FieldLabel>{ui.writerSpeaker}</FieldLabel>
                <InputBase
                  type="text"
                  value={form.speaker_name}
                  onChange={(e) => updateField("speaker_name", e.target.value)}
                  placeholder={ui.writerSpeaker}
                />
              </div>

              <div>
                <FieldLabel>{ui.category}</FieldLabel>
                <SelectBase
                  value={form.category_id}
                  onChange={(e) => updateField("category_id", e.target.value)}
                  disabled={loadingCategories}
                >
                  <option value="">
                    {loadingCategories ? ui.loadingCategories : ui.selectCategory}
                  </option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </SelectBase>
              </div>

              <div>
                <FieldLabel>{ui.contentType}</FieldLabel>
                <SelectBase
                  value={form.content_type}
                  onChange={(e) =>
                    updateField("content_type", e.target.value as EducationContentType)
                  }
                >
                  <option value="tutorial">{ui.tutorial}</option>
                  <option value="training">{ui.training}</option>
                  <option value="podcast">{ui.podcast}</option>
                  <option value="webinar">{ui.webinar}</option>
                </SelectBase>
              </div>

              <div>
                <FieldLabel>{ui.accessType}</FieldLabel>
                <div className="grid grid-cols-1 gap-3">
                  <ToggleCard
                    active={form.access_type === "public"}
                    onClick={() => updateField("access_type", "public")}
                    title={ui.publicAccess}
                    subtitle={ui.publicAccessDesc}
                    icon={<Video size={16} />}
                  />
                  <ToggleCard
                    active={form.access_type === "paid_agent"}
                    onClick={() => updateField("access_type", "paid_agent")}
                    title={ui.paidAgentAccess}
                    subtitle={ui.paidAgentAccessDesc}
                    icon={<Lock size={16} />}
                  />
                </div>
              </div>

              <div>
                <FieldLabel required>{ui.duration}</FieldLabel>
                <InputBase
                  type="number"
                  min={90}
                  max={2700}
                  value={form.duration_seconds}
                  onChange={(e) => updateField("duration_seconds", e.target.value)}
                  placeholder="180"
                />
                <p className="mt-2 text-xs text-gray-500">{ui.durationHelp}</p>
              </div>

              <div>
                <FieldLabel>{ui.sortOrder}</FieldLabel>
                <InputBase
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => updateField("sort_order", e.target.value)}
                />
              </div>

              <div>
                <FieldLabel>{ui.publishDate}</FieldLabel>
                <InputBase
                  type="datetime-local"
                  value={form.publish_at}
                  onChange={(e) => updateField("publish_at", e.target.value)}
                />
                <p className="mt-2 text-xs text-gray-500">{ui.publishDateHelp}</p>
              </div>

              <div>
                <FieldLabel>{ui.featured}</FieldLabel>
                <button
                  type="button"
                  onClick={() => updateField("is_featured", !form.is_featured)}
                  className={`inline-flex rounded-xl px-4 py-2 text-sm font-semibold ${
                    form.is_featured
                      ? "bg-[#1C1C1E] text-white"
                      : "border border-gray-300 bg-white text-[#1C1C1E]"
                  }`}
                >
                  {form.is_featured ? ui.featured : `+ ${ui.featured}`}
                </button>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-[#FAFAF8] p-4 text-sm text-gray-600">
                <div className="flex items-start gap-3">
                  <CalendarDays size={18} className="mt-0.5 shrink-0 text-[#1C1C1E]" />
                  <div>
                    <p className="font-semibold text-[#1C1C1E]">{ui.scheduleStatus}</p>
                    <p className="mt-1 leading-6">
                      {form.publish_at
                        ? publishAtIso
                          ? isScheduled
                            ? `${ui.scheduleFuture}: ${formatDateTime(publishAtIso)}`
                            : `${ui.scheduleNow}: ${formatDateTime(publishAtIso)}`
                          : ui.publishDateInvalid
                        : ui.scheduleNow}
                    </p>
                    <p className="mt-2 text-xs text-gray-500">{ui.currentPlan}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-bold text-[#1C1C1E]">{ui.media}</h2>

            <div className="mt-5 space-y-5">
              <div>
                <FieldLabel>{ui.thumbnail}</FieldLabel>

                {form.thumbnail_url ? (
                  <img
                    src={form.thumbnail_url}
                    alt="Thumbnail preview"
                    className="h-48 w-full rounded-3xl object-cover"
                  />
                ) : (
                  <div className="flex h-48 items-center justify-center rounded-3xl border border-dashed border-gray-300 bg-[#FAFAF8] text-sm text-gray-500">
                    {ui.noThumbnail}
                  </div>
                )}

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => thumbnailInputRef.current?.click()}
                    disabled={uploadingThumbnail}
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-[#1C1C1E] hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <ImageIcon size={16} />
                    {uploadingThumbnail ? ui.publishing : ui.uploadThumbnail}
                  </button>

                  {form.thumbnail_url ? (
                    <button
                      type="button"
                      onClick={() => updateField("thumbnail_url", "")}
                      className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-[#1C1C1E] hover:bg-gray-50"
                    >
                      {ui.remove}
                    </button>
                  ) : null}
                </div>
              </div>

              <div>
                <FieldLabel>{ui.videoSource}</FieldLabel>
                <SelectBase
                  value={form.video_provider}
                  onChange={(e) =>
                    updateField("video_provider", e.target.value as VideoProvider)
                  }
                >
                  <option value="supabase">{ui.uploadToSupabase}</option>
                  <option value="external">{ui.externalUrl}</option>
                </SelectBase>
              </div>

              {form.video_provider === "supabase" ? (
                <div>
                  <FieldLabel>{ui.videoSource}</FieldLabel>

                  <div className="rounded-2xl border border-gray-200 bg-[#FAFAF8] p-4 text-sm text-gray-600">
                    <p className="font-semibold text-[#1C1C1E]">
                      {form.video_storage_path ? ui.videoAttached : ui.noVideoYet}
                    </p>
                    <p className="mt-2 break-all text-xs">
                      {form.video_storage_path || ui.notSet}
                    </p>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => videoInputRef.current?.click()}
                      disabled={uploadingVideo}
                      className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-[#1C1C1E] hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Upload size={16} />
                      {uploadingVideo
                        ? ui.publishing
                        : form.video_storage_path
                          ? ui.replaceVideo
                          : ui.uploadVideo}
                    </button>

                    {form.video_storage_path ? (
                      <button
                        type="button"
                        onClick={() => updateField("video_storage_path", "")}
                        className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-[#1C1C1E] hover:bg-gray-50"
                      >
                        {ui.remove}
                      </button>
                    ) : null}
                  </div>

                  <p className="mt-3 text-xs text-gray-500">
                    {ui.sourcePath}: {form.video_storage_path || ui.notSet}
                  </p>
                </div>
              ) : (
                <div>
                  <FieldLabel required>{ui.videoUrl}</FieldLabel>
                  <InputBase
                    type="url"
                    value={form.video_url}
                    onChange={(e) => updateField("video_url", e.target.value)}
                    placeholder={ui.enterVideoUrl}
                  />
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}