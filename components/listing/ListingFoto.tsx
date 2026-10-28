"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import BackgroundMusic, { EMPTY_MUSIC, type BackgroundMusicChoice } from "./BackgroundMusic";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { renderDurable, hasPendingRender } from "@/lib/ai-video-durable/client.mjs";
import { useLanguage } from "@/app/context/LanguageContext";
import { propertyVideoContext } from "@/lib/property-video-context";

type Props = {
  draft: any;
  setDraft: (fn: any) => void;
  onNext: () => void;
  onBack: () => void;
};

type SourceType = "owner" | "agent" | "admin";

type AiVideoMediaItem = {
  id: string;
  file: File;
  url: string;
  kind: "image" | "video";
  durationSeconds: number;
  width: number;
  height: number;
};

type DraftMedia = {
  propertyId?: string;
  photos?: string[];
  coverIndex?: number;
  video?: string;
  title?: string;
  title_id?: string;
  description?: string;
  description_id?: string;
  mediaFolder?: string;
  mode?: "create" | "edit";
  source?: SourceType;
  aiGeneratedOnce?: boolean;
  aiGenerationCount?: number;
  ai_seo_title?: string;
  ai_seo_meta_description?: string;
  ai_social_caption?: string;
  ai_whatsapp_inquiry_message?: string;
};

type AiPropertyContent = {
  englishTitle?: string;
  indonesianTitle?: string;
  englishDescription?: string;
  indonesianDescription?: string;
  seoTitle?: string;
  seoMetaDescription?: string;
  socialCaption?: string;
  whatsappInquiryMessage?: string;
};

type AiPropertyResponse = {
  success?: boolean;
  data?: AiPropertyContent;
  error?: string;
  detail?: string;
};

const MAX_PHOTOS = 30;
const MIN_PHOTOS = 3;
const MAX_TITLE = 150;
const MAX_DESC = 2000;
const MAX_AI_GENERATIONS = 5;
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE = 100 * 1024 * 1024;

const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  studio: "Studio",
  rumah: "House",
  apartemen: "Apartment",
  gudang: "Warehouse",
  guesthouse: "Guesthouse",
  hotel: "Hotel",
  kantor: "Office",
  kos: "Boarding House",
  resort: "Resort",
  ruko: "Shophouse",
  rukos: "Shop-Boarding House",
  tanah: "Land",
  pabrik: "Factory",
  vila: "Villa",
};

const LISTING_TYPE_LABELS: Record<string, string> = {
  dijual: "For Sale",
  disewa: "For Rent",
  dijual_disewa: "For Sale + For Rent",
  lelang: "Auction",
};

const RENTAL_TYPE_LABELS: Record<string, string> = {
  bulanan: "Monthly Rental",
  tahunan: "Yearly Rental",
  monthly: "Monthly Rental",
  yearly: "Yearly Rental",
};

const FURNISHING_LABELS: Record<string, string> = {
  unfurnished: "Unfurnished",
  semi: "Semi Furnished",
  full: "Fully Furnished",
};

const FACILITY_LABELS: Record<string, string> = {
  fac_ac: "AC",
  fac_wifi: "WiFi",
  fac_cctv: "CCTV",
  fac_security: "24-Hour Security",
  fac_parking: "Parking",
  fac_garden: "Garden",
  fac_water_heater: "Water Heater",
  fac_kitchen_set: "Kitchen Set",
  fac_dining_area: "Dining Area",
  fac_living_room: "Living Room",
  fac_storage: "Storage Room",
  fac_balcony: "Balcony",
  fac_terrace: "Terrace",
  fac_laundry_area: "Laundry Area",
  fac_private_pool: "Private Pool",
  fac_shared_pool: "Swimming Pool",
  fac_carport: "Carport",
  fac_garage: "Garage",
  fac_maid_room: "Maid Room",
  fac_smart_lock: "Smart Lock",
  fac_smart_home: "Smart Home",
  fac_rooftop: "Rooftop",
  fac_gazebo: "Gazebo",
  fac_lift: "Lift",
  fac_gym: "Gym",
  fac_lobby: "Lobby",
  fac_reception: "Reception",
  fac_access_card: "Access Card",
  fac_basement_parking: "Basement Parking",
  fac_function_room: "Function Room",
  fac_playground: "Kids Playground",
  fac_loading_dock: "Loading Dock",
  fac_truck_access: "Truck Access",
  fac_office_room: "Office Room",
  fac_staff_room: "Staff Room",
  fac_generator: "Generator",
  fac_three_phase: "3-Phase Electricity",
  fac_high_ceiling: "High Ceiling",
  fac_meeting_room: "Meeting Room",
  fac_restaurant: "Restaurant",
  fac_spa: "Spa",
  fac_housekeeping: "Housekeeping Room",
};

const NEARBY_LABELS: Record<string, string> = {
  near_cafe: "Cafe",
  near_restaurant: "Restaurant",
  near_gym: "Gym",
  near_coworking: "Co-working Space",
  near_beach_club: "Beach Club",
  near_beach: "Beach",
  near_supermarket: "Supermarket",
  near_traditional_market: "Traditional Market",
  near_mall: "Mall",
  near_school: "School",
  near_international_school: "International School",
  near_university: "University",
  near_hospital: "Hospital",
  near_clinic: "Clinic",
  near_pharmacy: "Pharmacy",
  near_airport: "Airport",
  near_port: "Port",
  near_toll: "Toll Access",
  near_main_road: "Main Road",
  near_office: "Office Area",
  near_tourist_attraction: "Tourist Attraction",
};

function capitalizeFirstLetter(s: string) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-");
}

function getPublicFilePathFromUrl(url: string, bucket: string) {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const index = url.indexOf(marker);
  if (index === -1) return null;
  return url.slice(index + marker.length);
}

function getFileExtension(fileName: string) {
  const parts = fileName.toLowerCase().split(".");
  return parts.length > 1 ? parts.pop() || "" : "";
}

function isAcceptedImageFile(file: File) {
  const mime = String(file.type || "").toLowerCase();
  const ext = getFileExtension(file.name || "");

  if (mime.startsWith("image/")) return true;

  return ["jpg", "jpeg", "png", "webp", "heic", "heif"].includes(ext);
}

function isAcceptedVideoFile(file: File) {
  const mime = String(file.type || "").toLowerCase();
  const ext = getFileExtension(file.name || "");

  if (ALLOWED_VIDEO_TYPES.includes(mime) || mime.startsWith("video/")) {
    return true;
  }

  return ["mp4", "mov", "webm"].includes(ext);
}

function getSafeImageExtension(file: File) {
  const ext = getFileExtension(file.name || "");

  if (["jpg", "jpeg", "png", "webp", "heic", "heif"].includes(ext)) {
    return ext;
  }

  const mime = String(file.type || "").toLowerCase();

  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/heic") return "heic";
  if (mime === "image/heif") return "heif";

  return "jpg";
}

function getSafeVideoExtension(file: File) {
  const ext = getFileExtension(file.name || "");

  if (["mp4", "mov", "webm"].includes(ext)) {
    return ext;
  }

  const mime = String(file.type || "").toLowerCase();

  if (mime === "video/webm") return "webm";
  if (mime === "video/quicktime") return "mov";

  return "mp4";
}

function humanizeKey(key: string) {
  return key
    .replace(/^fac_/, "")
    .replace(/^near_/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeDraftValue(value: unknown): string {
  if (value === null || value === undefined) return "";

  if (Array.isArray(value)) {
    return value
      .map((item: unknown) => normalizeDraftValue(item))
      .filter((item: string) => item.length > 0)
      .join(", ");
  }

  if (typeof value === "object") {
    const objectValue = value as {
      name?: unknown;
      label?: unknown;
      title?: unknown;
      value?: unknown;
    };

    if (typeof objectValue.name === "string") return objectValue.name;
    if (typeof objectValue.label === "string") return objectValue.label;
    if (typeof objectValue.title === "string") return objectValue.title;
    if (typeof objectValue.value === "string") return objectValue.value;

    return "";
  }

  return String(value).trim();
}

function getDraftText(draft: any, keys: string[]) {
  for (const key of keys) {
    const value = normalizeDraftValue(draft?.[key]);
    if (value) return value;
  }

  return "";
}

function getMappedDraftText(
  draft: any,
  keys: string[],
  labelMap: Record<string, string>
) {
  const value = getDraftText(draft, keys);
  if (!value) return "";

  const normalized = value.trim().toLowerCase();
  return labelMap[normalized] || labelMap[value] || value;
}

function getBooleanRecordText(
  value: unknown,
  labelMap: Record<string, string> = {}
) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";

  const entries = Object.entries(value as Record<string, unknown>);

  const selected = entries
    .map(([key, rawValue]) => {
      if (rawValue === false || rawValue === null || rawValue === undefined) {
        return "";
      }

      if (rawValue === true) {
        return labelMap[key] || humanizeKey(key);
      }

      const normalizedValue = normalizeDraftValue(rawValue);
      if (!normalizedValue) return "";

      const label = labelMap[key] || humanizeKey(key);
      return `${label}: ${normalizedValue}`;
    })
    .filter(Boolean);

  return Array.from(new Set(selected)).join(", ");
}

function joinUniqueText(values: string[]) {
  return Array.from(
    new Set(
      values
        .map((value) => String(value || "").trim())
        .filter((value) => value.length > 0)
    )
  ).join(", ");
}

function getDraftLocation(draft: any) {
  const address = getDraftText(draft, [
    "address",
    "alamat",
    "propertyLocation",
    "fullLocation",
    "location",
  ]);

  const housingName = getDraftText(draft, [
    "customHousing",
    "custom_housing",
    "housingName",
    "housing_name",
    "cluster",
    "buildingName",
    "building_name",
  ]);

  const area = getDraftText(draft, [
    "area",
    "district",
    "kecamatan",
    "neighborhood",
    "subdistrict",
  ]);

  const city = getDraftText(draft, ["city", "kota", "regency", "kabupaten"]);
  const province = getDraftText(draft, ["province", "provinsi"]);

  return joinUniqueText([address, housingName, area, city, province]);
}

function getAiVideoLocation(draft: any) {
  const city = getDraftText(draft, [
    "city",
    "kota",
    "regency",
    "kabupaten",
  ]);

  const province = getDraftText(draft, ["province", "provinsi"]);

  return joinUniqueText([city, province]);
}

function getDraftLocationNotes(draft: any) {
  return joinUniqueText([
    getDraftText(draft, ["note", "locationNote", "location_note"]),
    getDraftText(draft, ["roadAccess", "road_access", "aksesJalan"]),
    getDraftText(draft, ["dimensionText", "dimension_text"]),
  ]);
}

function getDraftFeatures(draft: any) {
  const checklistFacilities = getBooleanRecordText(
    draft?.fasilitas ?? draft?.facilities,
    FACILITY_LABELS
  );

  const rawFacilities = joinUniqueText([
    getDraftText(draft, ["features", "amenities"]),
    getDraftText(draft, ["otherFacilities", "additionalFacilities"]),
    getDraftText(draft, ["propertyFeatures", "highlights"]),
    getDraftText(draft, ["parking", "parkir"]),
    getDraftText(draft, ["pool", "swimmingPool", "kolamRenang"]),
    getDraftText(draft, ["wifi", "internet"]),
    getDraftText(draft, ["kitchen", "dapur"]),
  ]);

  return joinUniqueText([checklistFacilities, rawFacilities]);
}

function getDraftNearbyPlaces(draft: any) {
  const checklistNearby = getBooleanRecordText(draft?.nearby, NEARBY_LABELS);

  const rawNearby = joinUniqueText([
    getDraftText(draft, [
      "nearbyPlaces",
      "nearbyLocation",
      "surroundings",
      "areaSekitar",
      "hotspots",
      "areaHighlights",
    ]),
    getDraftLocationNotes(draft),
  ]);

  return joinUniqueText([checklistNearby, rawNearby]);
}

function limitText(value: string, limit: number) {
  return value.trim().slice(0, limit);
}

function normalizeSourceFromDraftAndPath(draft: any, pathname: string): SourceType {
  const rawSource = String(draft?.source || "").toLowerCase();

  if (rawSource === "admin") return "admin";
  if (rawSource === "agent") return "agent";
  if (rawSource === "owner") return "owner";

  const rawRole = String(
    draft?.role ||
      draft?.userRole ||
      draft?.accountType ||
      draft?.profileRole ||
      draft?.dashboardRole ||
      ""
  ).toLowerCase();

  if (rawRole.includes("admin")) return "admin";
  if (rawRole.includes("agent")) return "agent";
  if (rawRole.includes("owner") || rawRole.includes("pemilik")) return "owner";

  if (pathname.startsWith("/admin")) return "admin";
  if (pathname.startsWith("/agent")) return "agent";
  if (pathname.startsWith("/pemilik")) return "owner";

  return "owner";
}

export default function ListingFoto({
  draft,
  setDraft,
  onNext,
  onBack,
}: Props) {
  const { lang } = useLanguage();
  const pathname = usePathname() || "";
  const initial = (draft || {}) as DraftMedia;

  const mode: "create" | "edit" =
    initial.mode === "edit" ? "edit" : "create";

  const source = useMemo<SourceType>(() => {
    return normalizeSourceFromDraftAndPath(draft, pathname);
  }, [draft, pathname]);

  const isEdit = mode === "edit";
  const isDemo = process.env.NODE_ENV === "development" && Boolean(draft?.demo);
  const videoLocked = isEdit && (source === "agent" || source === "owner");
  const isAgent = source === "agent";
  const [agentVideoEligible, setAgentVideoEligible] = useState(false);
  useEffect(() => {
    if (!isAgent || videoLocked) return;
    let cancelled = false;
    async function checkVideoMembership() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase.from("agent_memberships")
        .select("package_id,status,expires_at").eq("user_id", user.id).eq("status", "active");
      const eligible = !error && (data || []).some(row => ["gold", "agent-pro"].includes(row.package_id) && (!row.expires_at || new Date(row.expires_at).getTime() >= Date.now()));
      if (!cancelled) setAgentVideoEligible(eligible);
    }
    void checkVideoMembership().catch(() => { if (!cancelled) setAgentVideoEligible(false); });
    return () => { cancelled = true; };
  }, [isAgent, videoLocked]);
  const isAdmin = source === "admin";
  const canUseSocialCaption = isAgent || isAdmin;
  const shouldSubmitForApproval = isEdit || isAgent;

  const t =
    lang === "id"
      ? {
          back: "Kembali",
          pageTitle: "Upload Foto & Video",
          pageSubtitle:
            "Lengkapi foto, video, judul, dan deskripsi agar listing tampil lebih jelas dan menarik.",
          addPhotos: "Tambah Foto",
          uploading: "Mengupload...",
          removeAll: "Hapus semua",
          noPhotosYet: "Belum ada foto.",
          englishTitle: "Judul Properti Bahasa Inggris",
          indonesianTitle: "Judul Properti Bahasa Indonesia",
          englishDescription: "Deskripsi Bahasa Inggris",
          indonesianDescription: "Deskripsi Bahasa Indonesia",
          submitForApproval: "Submit untuk Persetujuan",
          saveAndContinue: "Simpan & Lanjutkan",
          videoOptional: "Video (Opsional)",
          noVideoYet: "Belum ada video.",
          uploadVideo: "Upload Video",
          removeVideo: "Hapus Video",
          loginFirst: "Silakan login terlebih dahulu.",
          maxPhotos: "Maksimum 30 foto.",
          minPhotos: "Minimal 3 foto diperlukan.",
          photoRequirement: "Minimal 3 foto diperlukan. Maksimum 30 foto.",
          imageTypesOnly:
            "Hanya file gambar yang diperbolehkan. Gunakan JPG, PNG, WEBP, HEIC, atau HEIF.",
          imageSizeLimit: "Ukuran foto harus di bawah 10MB.",
          photoUploadFailed: "Upload foto gagal.",
          videoMustBeVideo: "File harus berupa video.",
          videoSizeLimit: "Ukuran video harus di bawah 100MB.",
          videoUploadFailed: "Upload video gagal.",
          videoGuideTitle: "Panduan upload video",
          videoGuideMp4: "Upload format MP4 jika memungkinkan.",
          videoGuideResolution: "Gunakan resolusi 1080p atau 720p.",
          videoGuideCompressed:
            "Gunakan file hasil export yang sudah dikompres.",
          videoGuideRawPhone:
            "Jangan upload video mentah langsung dari HP.",
          englishTitleRequired: "Judul Bahasa Inggris wajib diisi.",
          indonesianTitleRequired: "Judul Bahasa Indonesia wajib diisi.",
          titleLimit: "Judul maksimal 150 karakter.",
          englishDescRequired: "Deskripsi Bahasa Inggris wajib diisi.",
          indonesianDescRequired: "Deskripsi Bahasa Indonesia wajib diisi.",
          descLimit: "Deskripsi maksimal 2000 karakter.",
          coverNote: "Klik foto kecil untuk memilih cover.",
          titleGuide1: "Maksimal 150 karakter.",
          titleGuide2: "Huruf pertama judul harus kapital.",
          titleGuide3: "Buat singkat, jelas, dan menjual.",
          descGuide1: "Maksimal 2000 karakter.",
          descGuide2: "Huruf pertama deskripsi harus kapital.",
          descGuide3: "Jelaskan poin penting properti dengan jelas.",
          uploadPhotoHint:
            "Boleh upload screenshot, foto HP, JPG, PNG, WEBP, HEIC, atau HEIF.",
          aiBoxTitle: "Buat judul & deskripsi dengan AI",
          aiBoxSubtitle:
            "AI akan menggunakan detail properti, lokasi, fasilitas, dan area sekitar yang sudah Anda isi.",
          aiSocialNote:
            "Untuk agent/admin, AI juga akan membuat caption media sosial siap pakai.",
          aiButton: "✨ Generate dengan AI",
          aiGenerating: "Membuat...",
          aiUsedShort: "Batas AI Tercapai",
          aiNote:
            "AI dapat digunakan maksimal 5 kali per listing.",
          aiNeedDetails:
            "Lengkapi detail properti terlebih dahulu sebelum menggunakan AI.",
          aiFailed: "AI gagal membuat deskripsi. Silakan coba lagi.",
          aiOverwriteConfirm:
            "Konten judul/deskripsi yang sudah ada akan diganti oleh hasil AI. Lanjutkan?",
          aiAlreadyGenerated: "AI sudah digunakan maksimal 5 kali untuk listing ini.",
          socialCaptionTitle: "AI Social Media Caption",
          socialCaptionSubtitle:
            "Gunakan caption ini untuk promosi listing di Instagram, Facebook, TikTok, atau WhatsApp broadcast.",
          copyCaption: "Salin Caption",
          copiedCaption: "Caption tersalin",
        }
      : {
          back: "Back",
          pageTitle: "Upload Photos & Video",
          pageSubtitle:
            "Complete the photos, video, title, and description so the listing looks clearer and more attractive.",
          addPhotos: "Add Photos",
          uploading: "Uploading...",
          removeAll: "Remove all",
          noPhotosYet: "No photos yet.",
          englishTitle: "English Property Title",
          indonesianTitle: "Indonesian Property Title",
          englishDescription: "English Description",
          indonesianDescription: "Indonesian Description",
          submitForApproval: "Submit for Approval",
          saveAndContinue: "Save & Continue",
          videoOptional: "Video (Optional)",
          noVideoYet: "No video yet.",
          uploadVideo: "Upload Video",
          removeVideo: "Remove Video",
          loginFirst: "Please log in first.",
          maxPhotos: "Maximum 30 photos allowed.",
          minPhotos: "At least 3 photos are required.",
          photoRequirement: "At least 3 photos are required. Maximum 30 photos.",
          imageTypesOnly:
            "Only image files are allowed. Use JPG, PNG, WEBP, HEIC, or HEIF.",
          imageSizeLimit: "Image size must be under 10MB.",
          photoUploadFailed: "Photo upload failed.",
          videoMustBeVideo: "File must be a video.",
          videoSizeLimit: "Video size must be under 100MB.",
          videoUploadFailed: "Video upload failed.",
          videoGuideTitle: "Video upload guide",
          videoGuideMp4: "Upload MP4 if possible.",
          videoGuideResolution: "Use 1080p or 720p resolution.",
          videoGuideCompressed: "Use a compressed export.",
          videoGuideRawPhone: "Do not upload raw phone video.",
          englishTitleRequired: "English property title is required.",
          indonesianTitleRequired: "Indonesian property title is required.",
          titleLimit: "Title must be 150 characters or less.",
          englishDescRequired: "English description is required.",
          indonesianDescRequired: "Indonesian description is required.",
          descLimit: "Description must be 2000 characters or less.",
          coverNote: "Click a thumbnail to choose the cover image.",
          titleGuide1: "Maximum 150 characters.",
          titleGuide2: "The first letter of the title should be capitalized.",
          titleGuide3: "Keep it short, clear, and selling.",
          descGuide1: "Maximum 2000 characters.",
          descGuide2:
            "The first letter of the description should be capitalized.",
          descGuide3: "Explain the key property points clearly.",
          uploadPhotoHint:
            "You can upload screenshots, phone photos, JPG, PNG, WEBP, HEIC, or HEIF.",
          aiBoxTitle: "Create title & description with AI",
          aiBoxSubtitle:
            "AI will use the property details, location, facilities, and nearby area you filled earlier.",
          aiSocialNote:
            "For agent/admin, AI will also create a ready-to-use social media caption.",
          aiButton: "✨ Generate with AI",
          aiGenerating: "Generating...",
          aiUsedShort: "AI Limit Reached",
          aiNote:
            "AI can be used up to 5 times per listing.",
          aiNeedDetails:
            "Please complete the property details first before using AI.",
          aiFailed: "AI failed to generate the description. Please try again.",
          aiOverwriteConfirm:
            "Existing title/description content will be replaced by the AI result. Continue?",
          aiAlreadyGenerated: "AI has already been used 5 times for this listing.",
          socialCaptionTitle: "AI Social Media Caption",
          socialCaptionSubtitle:
            "Use this caption to promote the listing on Instagram, Facebook, TikTok, or WhatsApp broadcast.",
          copyCaption: "Copy Caption",
          copiedCaption: "Caption copied",
        };

  const [photos, setPhotos] = useState<string[]>(initial.photos ?? []);
  const [coverIndex, setCoverIndex] = useState<number>(initial.coverIndex ?? 0);
  const [video, setVideo] = useState<string>(initial.video ?? "");
  const [title, setTitle] = useState<string>(initial.title ?? "");
  const [titleId, setTitleId] = useState<string>(initial.title_id ?? "");
  const [description, setDescription] = useState<string>(
    initial.description ?? ""
  );
  const [descriptionId, setDescriptionId] = useState<string>(
    initial.description_id ?? ""
  );
  const [aiSeoTitle, setAiSeoTitle] = useState<string>(
    initial.ai_seo_title ?? ""
  );
  const [aiSeoMetaDescription, setAiSeoMetaDescription] = useState<string>(
    initial.ai_seo_meta_description ?? ""
  );
  const [socialCaption, setSocialCaption] = useState<string>(
    initial.ai_social_caption ?? ""
  );
  const [aiWhatsappInquiryMessage, setAiWhatsappInquiryMessage] =
    useState<string>(initial.ai_whatsapp_inquiry_message ?? "");

  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [aiError, setAiError] = useState("");
  const [captionCopied, setCaptionCopied] = useState(false);
  const [aiGenerationCount, setAiGenerationCount] = useState<number>(() => {
    const storedCount = Number(initial.aiGenerationCount);

    if (Number.isFinite(storedCount) && storedCount > 0) {
      return Math.min(Math.floor(storedCount), MAX_AI_GENERATIONS);
    }

    return initial.aiGeneratedOnce ? 1 : 0;
  });

  const hydratedRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);

  // Tetamo AI Video raw media is intentionally isolated from listing media.
  const [backgroundMusic, setBackgroundMusic] = useState<BackgroundMusicChoice>(EMPTY_MUSIC);
  const aiVideoInputRef = useRef<HTMLInputElement | null>(null);
  const [aiVideoMedia, setAiVideoMedia] = useState<AiVideoMediaItem[]>([]);
  const [draggedAiMediaId, setDraggedAiMediaId] = useState<string | null>(null);
  const [aiVideoPreparing, setAiVideoPreparing] = useState(false);
  const [aiVideoStage, setAiVideoStage] = useState<'preparing' | 'uploading' | 'rendering'>('preparing');
  const [aiVideoSuccessfulCount, setAiVideoSuccessfulCount] = useState<number | null>(null);
  const [aiVideoLimit, setAiVideoLimit] = useState<number | null>(null);
  const [aiVideoCanResume, setAiVideoCanResume] = useState(false);
  const aiStudioRef = useRef<HTMLDivElement | null>(null);
  const aiPreviewRef = useRef<HTMLDivElement | null>(null);
  const aiVideoRequestRef = useRef(false);
  const aiVideoApprovalRef = useRef(false);

  const photoInputId = "listing-photo-input";
  const videoInputId = "listing-video-input";

  useEffect(() => {
    if (hydratedRef.current) return;
    if (!draft) return;

    setPhotos((draft as any)?.photos ?? []);
    setCoverIndex((draft as any)?.coverIndex ?? 0);
    setVideo((draft as any)?.video ?? "");
    setTitle((draft as any)?.title ?? "");
    setTitleId((draft as any)?.title_id ?? "");
    setDescription((draft as any)?.description ?? "");
    setDescriptionId((draft as any)?.description_id ?? "");
    setAiSeoTitle((draft as any)?.ai_seo_title ?? "");
    setAiSeoMetaDescription((draft as any)?.ai_seo_meta_description ?? "");
    setSocialCaption((draft as any)?.ai_social_caption ?? "");
    setAiWhatsappInquiryMessage(
      (draft as any)?.ai_whatsapp_inquiry_message ?? ""
    );
    const storedAiCount = Number((draft as any)?.aiGenerationCount);

    if (Number.isFinite(storedAiCount) && storedAiCount > 0) {
      setAiGenerationCount(
        Math.min(Math.floor(storedAiCount), MAX_AI_GENERATIONS)
      );
    } else {
      setAiGenerationCount((draft as any)?.aiGeneratedOnce ? 1 : 0);
    }

    hydratedRef.current = true;
  }, [draft]);

  useEffect(() => {
    if (!hydratedRef.current) return;

    setDraft((p: any) => ({
      ...(p || {}),
      source,
      photos,
      coverIndex,
      video,
      title,
      title_id: titleId,
      description,
      description_id: descriptionId,
      aiGeneratedOnce: aiGenerationCount > 0,
      aiGenerationCount,
      ai_seo_title: aiSeoTitle,
      ai_seo_meta_description: aiSeoMetaDescription,
      ai_social_caption: socialCaption,
      ai_whatsapp_inquiry_message: aiWhatsappInquiryMessage,
    }));
  }, [
    source,
    photos,
    coverIndex,
    video,
    title,
    titleId,
    description,
    descriptionId,
    aiGenerationCount,
    aiSeoTitle,
    aiSeoMetaDescription,
    socialCaption,
    aiWhatsappInquiryMessage,
    setDraft,
  ]);

  useEffect(() => {
    if (photos.length === 0) {
      setCoverIndex(0);
      return;
    }

    if (coverIndex > photos.length - 1) {
      setCoverIndex(0);
    }
  }, [photos.length, coverIndex]);

  const canContinue = useMemo(() => {
    return (
      photos.length >= MIN_PHOTOS &&
      title.trim().length > 0 &&
      title.length <= MAX_TITLE &&
      titleId.trim().length > 0 &&
      titleId.length <= MAX_TITLE &&
      description.trim().length > 0 &&
      description.length <= MAX_DESC &&
      descriptionId.trim().length > 0 &&
      descriptionId.length <= MAX_DESC
    );
  }, [photos.length, title, titleId, description, descriptionId]);

  const primaryButtonLabel = shouldSubmitForApproval
    ? t.submitForApproval
    : t.saveAndContinue;

  const helperMessage = useMemo(() => {
    if (photos.length < MIN_PHOTOS) return t.minPhotos;
    if (title.trim().length === 0) return t.englishTitleRequired;
    if (title.length > MAX_TITLE) return t.titleLimit;
    if (titleId.trim().length === 0) return t.indonesianTitleRequired;
    if (titleId.length > MAX_TITLE) return t.titleLimit;
    if (description.trim().length === 0) return t.englishDescRequired;
    if (description.length > MAX_DESC) return t.descLimit;
    if (descriptionId.trim().length === 0) return t.indonesianDescRequired;
    if (descriptionId.length > MAX_DESC) return t.descLimit;
    return "";
  }, [photos.length, title, titleId, description, descriptionId, t]);

  function buildAiPayload() {
    const propertyType = getMappedDraftText(
      draft,
      [
        "propertyType",
        "property_type",
        "jenisProperti",
        "type",
        "category",
        "kategori",
      ],
      PROPERTY_TYPE_LABELS
    );

    const location = getDraftLocation(draft);

    const listingTypeRaw = getDraftText(draft, [
      "listingType",
      "listing_type",
      "transactionType",
      "listingPurpose",
      "purpose",
    ]);

    const salePriceForAi = getDraftText(draft, [
      "salePrice",
      "sale_price",
    ]);

    const rentPriceForAi = getDraftText(draft, [
      "rentPrice",
      "rent_price",
    ]);

    const price =
      listingTypeRaw === "dijual_disewa"
        ? joinUniqueText([
            salePriceForAi
              ? `Sale price: ${salePriceForAi}`
              : "",
            rentPriceForAi
              ? `Rent price: ${rentPriceForAi}`
              : "",
          ])
        : getDraftText(draft, [
            "price",
            "harga",
            "priceIdr",
            "hargaIdr",
            "salePrice",
            "rentPrice",
            "yearlyPrice",
            "monthlyPrice",
            "auctionPrice",
          ]);

    const bedrooms = getDraftText(draft, [
      "bedrooms",
      "bedroom",
      "kamarTidur",
      "kamar_tidur",
      "bedroomCount",
      "bedroom_count",
      "bed",
      "kt",
      "KT",
    ]);

    const bathrooms = getDraftText(draft, [
      "bathrooms",
      "bathroom",
      "kamarMandi",
      "kamar_mandi",
      "bathroomCount",
      "bathroom_count",
      "bath",
      "km",
      "KM",
    ]);

    const landSize = joinUniqueText([
      getDraftText(draft, [
        "landSize",
        "land_size",
        "luasTanah",
        "luas_tanah",
        "landArea",
        "lt",
        "LT",
      ]),
      getDraftText(draft, ["landUnit", "land_unit"]),
    ]);

    const buildingSize = getDraftText(draft, [
      "buildingSize",
      "building_size",
      "luasBangunan",
      "luas_bangunan",
      "buildingArea",
      "lb",
      "LB",
    ]);

    const furnishing = getMappedDraftText(
      draft,
      [
        "furnishing",
        "furnished",
        "furnish",
        "furniture",
        "perabot",
        "furnitureStatus",
      ],
      FURNISHING_LABELS
    );

    const features = getDraftFeatures(draft);

    const purpose = getMappedDraftText(
      draft,
      [
        "purpose",
        "listingType",
        "listing_type",
        "transactionType",
        "listingPurpose",
        "status",
      ],
      LISTING_TYPE_LABELS
    );

    const rentalType = getMappedDraftText(
      draft,
      ["rentalType", "rental_type", "rentType", "sewaType"],
      RENTAL_TYPE_LABELS
    );

    const ownershipTitle = joinUniqueText([
      getDraftText(draft, ["ownershipTitle", "ownership_title"]),
      getDraftText(draft, ["sertifikat", "certificate", "titleType"]),
      getDraftText(draft, ["jenisKepemilikan", "ownership_type"]),
      getDraftText(draft, ["jenisTanah", "land_type"]),
      getDraftText(draft, ["jenisZoning", "zoning_type"]),
    ]);

    const nearbyPlaces = getDraftNearbyPlaces(draft);

    return {
      source,
      propertyType,
      location,
      price,
      bedrooms,
      bathrooms,
      landSize,
      buildingSize,
      furnishing,
      features,
      purpose,
      rentalType,
      ownershipTitle,
      nearbyPlaces,
    };
  }

  async function generateWithAi() {
    if (generatingAi) return;

    if (aiGenerationCount >= MAX_AI_GENERATIONS) {
      alert(t.aiAlreadyGenerated);
      return;
    }

    const aiPayload = buildAiPayload();

    const hasBasicDetails =
      aiPayload.propertyType ||
      aiPayload.location ||
      aiPayload.price ||
      aiPayload.features ||
      aiPayload.bedrooms ||
      aiPayload.bathrooms ||
      aiPayload.landSize ||
      aiPayload.buildingSize ||
      aiPayload.nearbyPlaces;

    if (!hasBasicDetails) {
      alert(t.aiNeedDetails);
      return;
    }

    const hasExistingContent =
      title.trim() ||
      titleId.trim() ||
      description.trim() ||
      descriptionId.trim();

    if (hasExistingContent && !window.confirm(t.aiOverwriteConfirm)) {
      return;
    }

    try {
      setGeneratingAi(true);
      setAiError("");
      setCaptionCopied(false);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        alert(lang === "id" ? "Silakan login kembali." : "Please log in again.");
        setGeneratingAi(false);
        return;
      }

      const response = await fetch("/api/ai/property-description", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(aiPayload),
      });

      const result = (await response.json()) as AiPropertyResponse;

      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.detail || result.error || t.aiFailed);
      }

      const generated = result.data;

      const nextTitle = generated.englishTitle
        ? capitalizeFirstLetter(limitText(generated.englishTitle, MAX_TITLE))
        : title;

      const nextTitleId = generated.indonesianTitle
        ? capitalizeFirstLetter(limitText(generated.indonesianTitle, MAX_TITLE))
        : titleId;

      const nextDescription = generated.englishDescription
        ? capitalizeFirstLetter(
            limitText(generated.englishDescription, MAX_DESC)
          )
        : description;

      const nextDescriptionId = generated.indonesianDescription
        ? capitalizeFirstLetter(
            limitText(generated.indonesianDescription, MAX_DESC)
          )
        : descriptionId;

      const nextSeoTitle = generated.seoTitle || aiSeoTitle || "";
      const nextSeoMetaDescription =
        generated.seoMetaDescription || aiSeoMetaDescription || "";
      const nextSocialCaption =
        canUseSocialCaption && generated.socialCaption
          ? generated.socialCaption
          : socialCaption || "";
      const nextWhatsappInquiryMessage =
        generated.whatsappInquiryMessage || aiWhatsappInquiryMessage || "";

      setTitle(nextTitle);
      setTitleId(nextTitleId);
      setDescription(nextDescription);
      setDescriptionId(nextDescriptionId);
      setAiSeoTitle(nextSeoTitle);
      setAiSeoMetaDescription(nextSeoMetaDescription);
      setSocialCaption(nextSocialCaption);
      setAiWhatsappInquiryMessage(nextWhatsappInquiryMessage);

      const nextAiGenerationCount = Math.min(
        aiGenerationCount + 1,
        MAX_AI_GENERATIONS
      );

      setAiGenerationCount(nextAiGenerationCount);

      setDraft((p: any) => ({
        ...(p || {}),
        source,
        title: nextTitle,
        title_id: nextTitleId,
        description: nextDescription,
        description_id: nextDescriptionId,
        aiGeneratedOnce: true,
        aiGenerationCount: nextAiGenerationCount,
        ai_seo_title: nextSeoTitle,
        ai_seo_meta_description: nextSeoMetaDescription,
        ai_social_caption: nextSocialCaption,
        ai_whatsapp_inquiry_message: nextWhatsappInquiryMessage,
      }));
    } catch (error: any) {
      console.error("Generate AI listing content error:", error);
      const message = error?.message || t.aiFailed;
      setAiError(message);
      alert(message);
    } finally {
      setGeneratingAi(false);
    }
  }

  async function copySocialCaption() {
    if (!socialCaption.trim()) return;

    try {
      await navigator.clipboard.writeText(socialCaption);
      setCaptionCopied(true);

      window.setTimeout(() => {
        setCaptionCopied(false);
      }, 1800);
    } catch (error) {
      console.error("Copy social caption error:", error);
    }
  }

  async function ensureUserAndFolder() {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      throw new Error(t.loginFirst);
    }

    const folder = draft?.mediaFolder || crypto.randomUUID();

    if (!draft?.mediaFolder) {
      setDraft((p: any) => ({
        ...(p || {}),
        mediaFolder: folder,
      }));
    }

    return { user, folder };
  }

  async function onAddPhotos(files: FileList | null) {
    if (!files) return;

    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) {
      alert(t.maxPhotos);
      return;
    }

    const chosen = Array.from(files).slice(0, remaining);

    const validFiles = chosen.filter((file) => {
      if (!isAcceptedImageFile(file)) {
        alert(t.imageTypesOnly);
        return false;
      }

      if (file.size > MAX_IMAGE_SIZE) {
        alert(t.imageSizeLimit);
        return false;
      }

      return true;
    });

    if (validFiles.length === 0) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    try {
      setUploadingPhotos(true);

      const { user, folder } = await ensureUserAndFolder();
      const uploadedUrls: string[] = [];

      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        const extension = getSafeImageExtension(file);
        const baseName = file.name.includes(".")
          ? file.name.slice(0, file.name.lastIndexOf("."))
          : file.name;

        const safeName = `${sanitizeFileName(baseName || "photo")}.${extension}`;
        const path = `public/${user.id}/${folder}/images/${Date.now()}-${i}-${safeName}`;

        const { error: uploadError } = await supabase.storage
          .from("property-images")
          .upload(path, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          throw uploadError;
        }

        const { data: publicData } = supabase.storage
          .from("property-images")
          .getPublicUrl(path);

        uploadedUrls.push(publicData.publicUrl);
      }

      setPhotos((prev) => [...prev, ...uploadedUrls]);
    } catch (error: any) {
      console.error("Photo upload error:", error);
      alert(error?.message || t.photoUploadFailed);
    } finally {
      setUploadingPhotos(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function onAddVideo(files: FileList | null) {
    if (videoLocked || !files) return;

    const file = files[0];
    if (!file) return;

    if (!isAcceptedVideoFile(file)) {
      alert(t.videoMustBeVideo);
      return;
    }

    if (file.size > MAX_VIDEO_SIZE) {
      alert(t.videoSizeLimit);
      return;
    }

    try {
      setUploadingVideo(true);

      const { user, folder } = await ensureUserAndFolder();

      // Retain the previous video until the replacement has uploaded successfully.
      // Saved listing videos remain untouched by this Create upload path.
      const previousVideo = video;

      const extension = getSafeVideoExtension(file);
      const baseName = file.name.includes(".")
        ? file.name.slice(0, file.name.lastIndexOf("."))
        : file.name;

      const safeName = `${sanitizeFileName(baseName || "video")}.${extension}`;
      const path = `public/${user.id}/${folder}/video/${Date.now()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("property-videos")
        .upload(path, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicData } = supabase.storage
        .from("property-videos")
        .getPublicUrl(path);

      setVideo(publicData.publicUrl);
      setAiGeneratedVideoBlob(null);
      setAiGeneratedVideoPreview("");
      if (mode !== "edit" && previousVideo) {
        const oldPath = getPublicFilePathFromUrl(previousVideo, "property-videos");
        if (oldPath) {
          const { error: cleanupError } = await supabase.storage.from("property-videos").remove([oldPath]);
          if (cleanupError) console.warn("Previous draft video cleanup deferred:", cleanupError.message);
        }
      }
    } catch (error: any) {
      console.error("Video upload error:", error);
      alert(error?.message || t.videoUploadFailed);
    } finally {
      setUploadingVideo(false);
      if (videoInputRef.current) videoInputRef.current.value = "";
    }
  }

  async function removePhoto(idx: number) {
    const targetUrl = photos[idx];
    const path = getPublicFilePathFromUrl(targetUrl, "property-images");

    setPhotos((prev) => prev.filter((_, i) => i !== idx));

    if (!path) return;

    try {
      await supabase.storage.from("property-images").remove([path]);
    } catch (error) {
      console.error("Remove photo error:", error);
    }
  }

  async function clearAllPhotos() {
    const paths = photos
      .map((url) => getPublicFilePathFromUrl(url, "property-images"))
      .filter(Boolean) as string[];

    setPhotos([]);
    setCoverIndex(0);

    if (paths.length === 0) return;

    try {
      await supabase.storage.from("property-images").remove(paths);
    } catch (error) {
      console.error("Clear photos error:", error);
    }
  }

  async function clearVideo() {
    if (videoLocked) return;
    const path = getPublicFilePathFromUrl(video, "property-videos");
    setVideo("");

    // In Edit mode this is only a draft removal.
    // The old live storage object is cleaned up after successful Edit submit.
    if (mode === "edit" || !path) return;

    try {
      await supabase.storage.from("property-videos").remove([path]);
    } catch (error) {
      console.error("Clear video error:", error);
    }
  }

  async function onAddAiVideoMedia(files: FileList | null) {
    if (!files) return;

    const MAX_AI_IMAGE_SIZE = 10 * 1024 * 1024;
    const MAX_AI_VIDEO_SIZE = 100 * 1024 * 1024;
    const MAX_AI_VIDEO_DURATION_SECONDS = 90;

    const acceptedImageTypes = new Set([
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/heic",
      "image/heif",
    ]);

    const acceptedVideoTypes = new Set([
      "video/mp4",
      "video/quicktime",
      "video/webm",
    ]);

    function getVideoDuration(file: File): Promise<{ duration: number; width: number; height: number }> {
      return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const element = document.createElement("video");

        const cleanup = () => {
          URL.revokeObjectURL(url);
          element.removeAttribute("src");
          element.load();
        };

        element.preload = "metadata";

        element.onloadedmetadata = () => {
          const duration = element.duration;
          const width = element.videoWidth;
          const height = element.videoHeight;
          cleanup();

          if (!Number.isFinite(duration)) {
            reject(new Error("Could not read video duration."));
            return;
          }

          resolve({ duration, width, height });
        };

        element.onerror = () => {
          cleanup();
          reject(new Error("Could not read video metadata."));
        };

        element.src = url;
      });
    }

    function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
      return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const image = new Image();
        image.onload = () => { URL.revokeObjectURL(url); resolve({ width: image.naturalWidth, height: image.naturalHeight }); };
        image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Unable to read image dimensions.")); };
        image.src = url;
      });
    }

    const accepted: Array<{
      file: File;
      durationSeconds: number;
      width: number;
      height: number;
    }> = [];
    const rejected: string[] = [];

    let acceptedVideoDuration = aiVideoMedia.reduce(
      (total, item) =>
        total + (item.kind === "video" ? item.durationSeconds : 0),
      0
    );

    for (const file of Array.from(files)) {
      const extension = file.name.split(".").pop()?.toLowerCase() ?? "";

      const isImage =
        acceptedImageTypes.has(file.type) ||
        ["jpg", "jpeg", "png", "webp", "heic", "heif"].includes(extension);

      const isVideo =
        acceptedVideoTypes.has(file.type) ||
        ["mp4", "mov", "webm"].includes(extension);

      if (!isImage && !isVideo) {
        rejected.push(
          `${file.name}: ${
            lang === "id"
              ? "format file tidak didukung"
              : "unsupported file format"
          }`
        );
        continue;
      }

      if (isImage) {
        if (file.size > MAX_AI_IMAGE_SIZE) {
          rejected.push(
            `${file.name}: ${
              lang === "id"
                ? "foto melebihi batas 10 MB"
                : "photo exceeds the 10 MB limit"
            }`
          );
          continue;
        }

        try {
          const dimensions = await getImageDimensions(file);
          accepted.push({ file, durationSeconds: 0, ...dimensions });
        } catch {
          rejected.push(`${file.name}: ${lang === "id" ? "foto tidak dapat dibaca; gunakan JPG, PNG, atau WEBP" : "photo could not be read; use JPG, PNG or WEBP"}`);
        }
        continue;
      }

      if (file.size > MAX_AI_VIDEO_SIZE) {
        rejected.push(
          `${file.name}: ${
            lang === "id"
              ? "video melebihi batas 100 MB"
              : "video exceeds the 100 MB limit"
          }`
        );
        continue;
      }

      let duration: number;
      let width = 0;
      let height = 0;

      try {
        const metadata = await getVideoDuration(file);
        duration = metadata.duration;
        width = metadata.width;
        height = metadata.height;

        if (duration > MAX_AI_VIDEO_DURATION_SECONDS) {
          rejected.push(
            `${file.name}: ${
              lang === "id"
                ? "video harus maksimal 1:30"
                : "video must be 1:30 or shorter"
            }`
          );
          continue;
        }
      } catch {
        rejected.push(
          `${file.name}: ${
            lang === "id"
              ? "durasi video tidak dapat dibaca"
              : "video duration could not be read"
          }`
        );
        continue;
      }

      if (
        acceptedVideoDuration + duration >
        MAX_AI_VIDEO_DURATION_SECONDS
      ) {
        rejected.push(
          `${file.name}: ${
            lang === "id"
              ? "total durasi semua video tidak boleh melebihi 1:30"
              : "total duration of all video clips cannot exceed 1:30"
          }`
        );
        continue;
      }

      acceptedVideoDuration += duration;

      accepted.push({
        file,
        durationSeconds: duration,
        width,
        height,
      });
    }

    if (accepted.length > 0) {
      const stamp = Date.now();

      const items: AiVideoMediaItem[] = accepted.map(
        ({ file, durationSeconds, width, height }, index) => ({
          id: `${stamp}-${index}-${file.name}`,
          file,
          url: URL.createObjectURL(file),
          kind: file.type.startsWith("video/")
            ? "video"
            : ["mp4", "mov", "webm"].includes(
                  file.name.split(".").pop()?.toLowerCase() ?? ""
                )
              ? "video"
              : "image",
          durationSeconds,
          width,
          height,
        })
      );

      updateAiVideoMedia((current) => [...current, ...items]);
    }

    if (aiVideoInputRef.current) {
      aiVideoInputRef.current.value = "";
    }

    if (rejected.length > 0) {
      alert(
        `${
          lang === "id"
            ? "Beberapa media tidak dapat ditambahkan:"
            : "Some media could not be added:"
        }\n\n${rejected.join("\n")}`
      );
    }
  }

  function removeAiVideoMedia(id: string) {
    updateAiVideoMedia((current) => {
      const target = current.find((item) => item.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return current.filter((item) => item.id !== id);
    });
  }

  function moveAiVideoMedia(fromIndex: number, toIndex: number) {
    updateAiVideoMedia((current) => {
      if (
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= current.length ||
        toIndex >= current.length ||
        fromIndex === toIndex
      ) {
        return current;
      }

      const next = [...current];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }

  function dropAiVideoMedia(targetId: string) {
    if (!draggedAiMediaId || draggedAiMediaId === targetId) {
      setDraggedAiMediaId(null);
      return;
    }

    updateAiVideoMedia((current) => {
      const fromIndex = current.findIndex(
        (item) => item.id === draggedAiMediaId
      );
      const toIndex = current.findIndex((item) => item.id === targetId);

      if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
        return current;
      }

      const next = [...current];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });

    setDraggedAiMediaId(null);
  }

  const [aiGeneratedVideoPreview, setAiGeneratedVideoPreview] =
    useState<string>("");
  const [aiGeneratedVideoBlob, setAiGeneratedVideoBlob] =
    useState<Blob | null>(null);
  const [aiVideoApproving, setAiVideoApproving] = useState(false);
  const [aiPreviewSettingsChanged, setAiPreviewSettingsChanged] = useState(false);

  useEffect(() => {
    return () => {
      if (aiGeneratedVideoPreview) {
        URL.revokeObjectURL(aiGeneratedVideoPreview);
      }
    };
  }, [aiGeneratedVideoPreview]);

  useEffect(() => {
    if (aiGeneratedVideoPreview && (isAgent || source === "owner")) aiPreviewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [aiGeneratedVideoPreview, isAgent, source]);

  function updateAiVideoMedia(update: (current: AiVideoMediaItem[]) => AiVideoMediaItem[]) {
    if (aiVideoRequestRef.current || aiVideoApproving) return;
    setAiVideoMedia(update);
    if (aiGeneratedVideoPreview) setAiPreviewSettingsChanged(true);
  }

  function changeBackgroundMusic(next: BackgroundMusicChoice) {
    if (aiVideoRequestRef.current || aiVideoApproving) return;
    if (next.track === backgroundMusic.track && next.volume === backgroundMusic.volume && next.file === backgroundMusic.file && next.rightsConfirmed === backgroundMusic.rightsConfirmed) return;
    setBackgroundMusic(next);
    if (aiGeneratedVideoPreview) setAiPreviewSettingsChanged(true);
  }

  async function handleAiVideoGenerate() {
    if (videoLocked || aiVideoRequestRef.current || aiVideoPreparing || aiVideoApproving) return;

    if (aiVideoMedia.length === 0) {
      alert(
        lang === "id"
          ? "Tambahkan foto atau video properti terlebih dahulu."
          : "Add property photos or videos first."
      );
      return;
    }

    if (backgroundMusic.track === "upload" && (!backgroundMusic.file || !backgroundMusic.rightsConfirmed)) {
      alert(lang === "id" ? "Pilih file musik dan konfirmasikan izin penggunaannya." : "Choose a music file and confirm permission to use it.");
      return;
    }

    if (aiVideoMedia.some(item => item.width > 0 && item.height > 0 && Math.abs(item.width / item.height - 9 / 16) > 0.025)) {
      const proceed = window.confirm(lang === "id"
        ? "Sebagian foto atau klip Anda bukan format vertikal 9:16. Video hanya dibuat dalam format 9:16, maksimal 1:30. Media akan disesuaikan ke bingkai vertikal dan bagian tepi dapat terpotong. Lanjutkan?"
        : "Some photos or clips are not 9:16 portrait, including any landscape media. Videos are generated only in 9:16, up to 1:30. Your media will be fitted to the portrait frame and edges may be cropped. Continue?");
      if (!proceed) return;
    }

    const durableVideo = process.env.NODE_ENV === "production" || process.env.NEXT_PUBLIC_AI_VIDEO_DURABLE_ENABLED === "true";
    let projectId = "";
    const uploadedMediaIds: string[] = [];

    aiVideoRequestRef.current = true;
    setAiVideoStage("preparing");
    setAiVideoPreparing(true);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        alert(
          lang === "id"
            ? "Silakan login kembali untuk menggunakan Tetamo AI Video."
            : "Please log in again to use Tetamo AI Video."
        );
        return;
      }

      const token = session.access_token;
      const { folder } = await ensureUserAndFolder();

      const projectResponse = await fetch(
        "/api/agent/ai-property-video/project",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            mediaFolder: folder,
            propertyId: draft?.propertyId || null,
            language: lang === "en" ? "en" : "id",
            audioMode: "none",
            ownerPlan: source === "owner" ? draft?.plan : undefined,
          }),
        }
      );

      const projectResult = await projectResponse
        .json()
        .catch(() => ({}));

      if (projectResult?.code === "AI_VIDEO_SCHEMA_REQUIRED") throw new Error(lang === "id" ? "Pembuatan video belum siap: pembaruan database video diperlukan. Foto dan musik pilihan Anda tetap tersimpan di halaman ini." : "Video generation needs the database video upgrade. Your selected photos and music remain on this page.");

      if (projectResponse.status === 403 && projectResult?.code === "AI_VIDEO_PACKAGE_REQUIRED") throw new Error(lang === "id" ? "Fitur ini tersedia untuk paket Pemilik Priority / Featured, Agen Gold, dan Agent Pro." : "Video generation is available with Owner Priority / Featured, Agent Gold and Agent Pro.");

      if (!projectResponse.ok || !projectResult?.project?.id) {
        throw new Error(
          projectResult?.error ||
            (lang === "id"
              ? "Tidak dapat menyiapkan Tetamo AI Video."
              : "Unable to prepare Tetamo AI Video.")
        );
      }

      projectId = String(projectResult.project.id);
      setAiVideoCanResume(durableVideo && hasPendingRender(projectId));
      const used = Number(projectResult.project.successful_generation_count);
      if (Number.isInteger(used) && used >= 0) setAiVideoSuccessfulCount(used);
      const limit = Number(projectResult.generationLimit ?? projectResult.project.generation_limit);
      if (![1, 2, 3].includes(limit)) throw new Error("Unable to verify video generation allowance.");
      setAiVideoLimit(limit);
      if (used >= limit && !(durableVideo && hasPendingRender(projectId))) throw new Error(lang === "id" ? `Kuota ${limit} pembuatan video untuk listing ini telah digunakan.` : `All ${limit} video generations for this listing have been used.`);
      setAiVideoStage("uploading");

      if (!durableVideo) {
      const clearResponse = await fetch(
        "/api/agent/ai-property-video/source-media",
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            projectId,
          }),
        }
      );

      const clearResult = await clearResponse
        .json()
        .catch(() => ({}));

      if (!clearResponse.ok) {
        throw new Error(
          clearResult?.error ||
            (lang === "id"
              ? "Tidak dapat menyiapkan ulang media properti."
              : "Unable to reset property media.")
        );
      }

      for (let index = 0; index < aiVideoMedia.length; index += 1) {
        const item = aiVideoMedia[index];

        const formData = new FormData();
        formData.append("projectId", projectId);
        formData.append("file", item.file);
        formData.append("sortOrder", String(index));
        formData.append(
          "durationSeconds",
          String(item.kind === "video" ? item.durationSeconds : 0)
        );

        const uploadResponse = await fetch(
          "/api/agent/ai-property-video/source-media",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          }
        );

        const uploadResult = await uploadResponse
          .json()
          .catch(() => ({}));

        if (!uploadResponse.ok || !uploadResult?.media?.id) {
          throw new Error(
            uploadResult?.error ||
              (lang === "id"
                ? `Gagal mengunggah media ${index + 1}.`
                : `Failed to upload media ${index + 1}.`)
          );
        }

        uploadedMediaIds.push(String(uploadResult.media.id));
      }

      }
      const aiPayload = propertyVideoContext(draft || {}, buildAiPayload(), lang);

      const renderForm = new FormData();
      renderForm.append("payload", JSON.stringify({
            projectId,
            music: { track: backgroundMusic.track, volume: backgroundMusic.volume, rightsConfirmed: backgroundMusic.rightsConfirmed },
            language: lang === "en" ? "en" : "id",
            propertyContext: {
              propertyType: aiPayload.propertyType,
              location: `${isDemo ? "DEMO · " : ""}${getAiVideoLocation(draft)}`,
              price: aiPayload.price,
              rentPrice: aiPayload.rentPrice,
              bedrooms: aiPayload.bedrooms,
              bathrooms: aiPayload.bathrooms,
              landSize: aiPayload.landSize,
              buildingSize: aiPayload.buildingSize,
              furnishing: aiPayload.furnishing,
              purpose: aiPayload.purpose,
              rentalType: aiPayload.rentalType,
              ownershipTitle: aiPayload.ownershipTitle,
            },
          }));
      if (backgroundMusic.track === "upload" && backgroundMusic.file) {
        renderForm.append("musicFile", backgroundMusic.file);
      }
      setAiVideoStage("rendering");
      const renderResponse = durableVideo ? await renderDurable({
        token, projectId, media: aiVideoMedia, music: backgroundMusic,
        language: lang === "en" ? "en" : "id",
        propertyContext: JSON.parse(String(renderForm.get("payload"))).propertyContext,
      }) : await fetch("/api/agent/ai-property-video/generate-local", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: renderForm,
      });

      if (!renderResponse.ok) {
        const renderError = await renderResponse
          .json()
          .catch(() => ({}));

        throw new Error(
          renderError?.error ||
            (lang === "id"
              ? "Tetamo AI tidak dapat membuat video."
              : "Tetamo AI could not generate the video.")
        );
      }

      const completedCount = Number(renderResponse.headers.get("X-Tetamo-AI-Successful-Generation"));
      if (completedCount > 0 && Number.isInteger(completedCount)) setAiVideoSuccessfulCount(completedCount);
      const renderedBlob = await renderResponse.blob();

      if (!renderedBlob.size) {
        throw new Error(
          lang === "id"
            ? "Video berhasil diproses tetapi hasilnya kosong."
            : "The video was processed but the result was empty."
        );
      }

      setAiVideoCanResume(false);
      const previewUrl = URL.createObjectURL(renderedBlob);

      setAiGeneratedVideoBlob(renderedBlob);
      setAiPreviewSettingsChanged(false);
      setAiGeneratedVideoPreview((current) => {
        if (current) {
          URL.revokeObjectURL(current);
        }
        return previewUrl;
      });


    } catch (error) {
      if (projectId) setAiVideoCanResume(durableVideo && hasPendingRender(projectId));
      console.warn("Tetamo AI Video preparation failed:", error);

      if (!durableVideo && projectId && uploadedMediaIds.length > 0) {
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();

          if (session?.access_token) {
            const cleanupResponse = await fetch(
              "/api/agent/ai-property-video/source-media",
              {
                method: "DELETE",
                headers: {
                  Authorization: `Bearer ${session.access_token}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  projectId,
                  mediaIds: uploadedMediaIds,
                }),
              }
            );

            if (!cleanupResponse.ok) {
              console.error(
                "Tetamo AI Video batch cleanup failed:",
                await cleanupResponse.text()
              );
            }
          }
        } catch (cleanupError) {
          console.error(
            "Tetamo AI Video batch cleanup failed:",
            cleanupError
          );
        }
      }

      alert(
        error instanceof Error
          ? error.message
          : lang === "id"
            ? "Terjadi kesalahan saat menyiapkan Tetamo AI Video."
            : "Something went wrong while preparing Tetamo AI Video."
      );
    } finally {
      aiVideoRequestRef.current = false;
      setAiVideoPreparing(false);
    }
  }

  function handleNext() {
    if (isDemo) return;
    if (!canContinue || uploadingPhotos || uploadingVideo || generatingAi || aiVideoPreparing || aiVideoApproving) return;
    if (aiGeneratedVideoBlob && aiGeneratedVideoPreview) {
      alert(lang === "id" ? "Video masih berupa pratinjau. Klik Gunakan video ini sebelum melanjutkan, atau hapus pratinjau jika tidak ingin menggunakannya." : "Your generated video is still a preview. Click Use this video before continuing, or discard the preview if you do not want to use it.");
      aiPreviewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    onNext();
  }

  async function approveAiGeneratedVideo() {
    if (videoLocked || !aiGeneratedVideoBlob || aiVideoApprovalRef.current || aiVideoApproving || aiVideoRequestRef.current) return;
    aiVideoApprovalRef.current = true;

    try {
      setAiVideoApproving(true);

      const { user, folder } = await ensureUserAndFolder();

      const path =
        `public/${user.id}/${folder}/video/` +
        `${Date.now()}-tetamo-ai-video.mp4`;

      const generatedFile = new File(
        [aiGeneratedVideoBlob],
        "tetamo-ai-video.mp4",
        { type: "video/mp4" }
      );

      const { error: uploadError } = await supabase.storage
        .from("property-videos")
        .upload(path, generatedFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicData } = supabase.storage
        .from("property-videos")
        .getPublicUrl(path);

      if (!publicData?.publicUrl) {
        throw new Error("Unable to create the approved video URL.");
      }

      const previousVideo = video;

      // This is the approval boundary:
      // only now does the AI draft become the listing video.
      setVideo(publicData.publicUrl);
      setDraft((previous: any) => ({ ...(previous || {}), video: publicData.publicUrl }));

      setAiGeneratedVideoBlob(null);
      setAiGeneratedVideoPreview((current) => {
        if (current) {
          URL.revokeObjectURL(current);
        }
        return "";
      });

      // In Edit mode the previous video is still the live DB-backed video.
      // Keep it until the parent Edit submit succeeds.
      if (mode !== "edit" && previousVideo) {
        const previousPath = getPublicFilePathFromUrl(
          previousVideo,
          "property-videos"
        );

        if (previousPath && previousPath !== path) {
          try {
            await supabase.storage
              .from("property-videos")
              .remove([previousPath]);
          } catch (cleanupError) {
            console.error(
              "Previous listing video cleanup failed:",
              cleanupError
            );
          }
        }
      }

      alert(
        lang === "id"
          ? "Video ditambahkan ke draft listing. Simpan atau kirim listing untuk menyelesaikan."
          : "Video added to your listing draft. Save or submit the listing to finish."
      );
    } catch (error) {
      console.error("Tetamo AI Video approval failed:", error);

      alert(
        error instanceof Error
          ? error.message
          : lang === "id"
            ? "Video tidak dapat disetujui."
            : "Unable to approve the video."
      );
    } finally {
      aiVideoApprovalRef.current = false;
      setAiVideoApproving(false);
    }
  }

  const aiVideoTotalDurationSeconds = aiVideoMedia.reduce(
    (total, item) =>
      total + (item.kind === "video" ? item.durationSeconds : 0),
    0
  );

  async function loadNo4DemoMedia() {
    if (!isDemo || uploadingPhotos || aiVideoPreparing) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Silakan masuk kembali.");
      const headers = { Authorization: `Bearer ${session.access_token}` };
      const read = async (url: string) => { const response = await fetch(url, { headers }); if (!response.ok) { const result = await response.json().catch(() => ({})); throw new Error(`Media demo tidak dapat dibaca (${response.status}): ${result.error || url}`); } return response; };
      const info = await (await read("/api/dev/listing-demo")).json();
      const files = await Promise.all((info.photos as string[]).map(async (name, index) => new File([await (await read(`/api/dev/listing-demo?asset=photo&index=${index}`)).blob()], name, { type: "image/jpeg" })));
      const selected = new DataTransfer(); files.forEach(file => selected.items.add(file));
      await onAddPhotos(selected.files);
      await onAddAiVideoMedia(selected.files);
      const music = new File([await (await read("/api/dev/listing-demo?asset=music")).blob()], info.music, { type: "audio/mp4" });
      changeBackgroundMusic({ track: "upload", volume: 25, file: music, rightsConfirmed: false });
    } catch (error) { alert(error instanceof Error ? error.message : "Demo gagal dimuat."); }
  }

  const aiVideoDurationMinutes = Math.floor(
    aiVideoTotalDurationSeconds / 60
  );

  const aiVideoDurationRemainingSeconds = Math.floor(
    aiVideoTotalDurationSeconds % 60
  );

  const aiVideoDurationLabel = `${aiVideoDurationMinutes}:${String(
    aiVideoDurationRemainingSeconds
  ).padStart(2, "0")}`;

  return (
    <main className="min-h-screen bg-white text-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        <button
          onClick={onBack}
          disabled={aiVideoPreparing || aiVideoApproving}
          className="text-sm text-gray-700 hover:text-[#1C1C1E]"
          type="button"
        >
          ← {t.back}
        </button>

        <h1 className="mt-4 text-2xl font-bold leading-tight text-[#1C1C1E] sm:text-3xl">
          {t.pageTitle}
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600 sm:text-base">
          {t.pageSubtitle}
        </p>
        {isDemo ? <button type="button" onClick={loadNo4DemoMedia} disabled={uploadingPhotos || aiVideoPreparing || aiVideoMedia.length > 0} className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold disabled:opacity-50">Gunakan media properti No. 4 & musik pilihan Anda</button> : null}

        <div className="mt-6 rounded-3xl border border-gray-200 bg-white shadow-sm sm:mt-8">
          <div className="p-4 sm:p-5 md:p-6 lg:p-7">
            <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start xl:grid-cols-[minmax(0,1fr)_380px]">
              <section className="min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <label
                    htmlFor={photoInputId}
                    className={[
                      "inline-flex flex-1 items-center justify-center rounded-2xl bg-[#1C1C1E] px-4 py-3 text-sm font-semibold text-white",
                      uploadingPhotos
                        ? "cursor-not-allowed opacity-60"
                        : "cursor-pointer",
                    ].join(" ")}
                    onClick={(e) => {
                      if (uploadingPhotos) {
                        e.preventDefault();
                        return;
                      }

                      if (fileInputRef.current) {
                        fileInputRef.current.value = "";
                      }
                    }}
                  >
                    {uploadingPhotos ? t.uploading : t.addPhotos}
                  </label>

                  <button
                    onClick={clearAllPhotos}
                    className="inline-flex flex-1 items-center justify-center rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold"
                    type="button"
                    disabled={uploadingPhotos || photos.length === 0}
                  >
                    {t.removeAll}
                  </button>

                  <input
                    id={photoInputId}
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.jpg,.jpeg,.png,.webp,.heic,.heif"
                    multiple
                    className="absolute left-[-9999px] top-auto h-px w-px opacity-0"
                    onChange={(e) => onAddPhotos(e.target.files)}
                  />
                </div>

                <div className="mt-4 text-xs leading-5 text-gray-500">
                  {t.uploadPhotoHint}
                </div>

                <p className="mt-2 text-xs font-medium text-gray-700">
                  {t.photoRequirement}
                </p>

                <div className="mt-4 relative aspect-[16/9] w-full overflow-hidden rounded-2xl border border-gray-200 bg-gray-100">
                  {photos.length === 0 ? (
                    <div className="flex h-full items-center justify-center px-4 text-center text-sm text-gray-500">
                      {t.noPhotosYet}
                    </div>
                  ) : (
                    <>
                      <img
                        src={photos[coverIndex]}
                        className="h-full w-full object-cover"
                        alt="Property"
                      />
                      <div className="absolute right-3 top-3 rounded-full bg-black/70 px-3 py-1 text-[11px] text-white sm:text-xs">
                        TETAMO
                      </div>
                    </>
                  )}
                </div>

                {photos.length > 0 ? (
                  <p className="mt-3 text-xs leading-5 text-gray-500">
                    {t.coverNote}
                  </p>
                ) : null}

                <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 md:grid-cols-6">
                  {photos.map((src, idx) => (
                    <div key={idx} className="relative">
                      <button
                        onClick={() => setCoverIndex(idx)}
                        className={[
                          "aspect-square w-full overflow-hidden rounded-2xl border",
                          coverIndex === idx
                            ? "border-[#1C1C1E]"
                            : "border-gray-200",
                        ].join(" ")}
                        type="button"
                      >
                        <img
                          src={src}
                          className="h-full w-full object-cover"
                          alt={`Property ${idx + 1}`}
                        />
                      </button>

                      <button
                        onClick={() => removePhoto(idx)}
                        className="absolute -left-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-white text-xs"
                        type="button"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              <section id="listing-video-panel" ref={aiPreviewRef} className="min-w-0 scroll-mt-32">
                <div className="mb-3 text-sm font-semibold sm:text-base">
                  {t.videoOptional}
                </div>

                <div className="mx-auto w-full max-w-[320px] lg:max-w-[340px] xl:max-w-[380px]">
                  <div className="relative aspect-[9/16] w-full overflow-hidden rounded-2xl border border-gray-200 bg-gray-100">
                    {aiVideoPreparing ? (
                      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-[#1C1C1E]" />
                        <p className="mt-4 text-sm font-semibold text-[#1C1C1E]">
                          {lang === "id"
                            ? "Tetamo AI sedang membuat video..."
                            : "Tetamo AI is creating your video..."}
                        </p>
                        <p className="mt-2 text-xs leading-5 text-gray-500">
                          {lang === "id"
                            ? "Tetap di halaman ini sampai proses selesai."
                            : "Keep this page open until rendering is complete."}
                        </p>
                      </div>
                    ) : aiGeneratedVideoPreview ? (
                      <>
                        <video
                          src={aiGeneratedVideoPreview}
                          controls
                          playsInline
                          className="h-full w-full object-contain"
                        />
                      </>
                    ) : video ? (
                      <video
                        src={video}
                        controls
                        playsInline
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center px-4 text-center text-sm text-gray-500">
                        {t.noVideoYet}
                      </div>
                    )}
                  </div>

                  {aiGeneratedVideoPreview ? (
                    <div className="mt-3">
                      {aiPreviewSettingsChanged ? <p role="status" className="mb-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{lang === "id" ? "Foto atau musik telah diubah. Pratinjau ini tetap menampilkan hasil terakhir. Buat ulang untuk menerapkan perubahan, atau gunakan video terakhir ini." : "Photos or music have changed. This preview still shows your last rendered video. Generate again to apply changes, or use this last video."}</p> : null}
                      <p className="text-center text-xs leading-5 text-gray-500">
                        {lang === "id"
                          ? "Ini masih draft. Video listing Anda belum diganti sampai Anda menyetujuinya."
                          : "This is still a draft. Your listing video will not change until you approve it."}
                      </p>

                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => { setAiGeneratedVideoBlob(null); setAiGeneratedVideoPreview(""); aiStudioRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }}
                          disabled={aiVideoPreparing || aiVideoApproving}
                          className="inline-flex items-center justify-center rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-[#1C1C1E] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {lang === "id" ? "Ubah & buat lagi" : "Change and generate again"}
                        </button>

                        <button
                          type="button"
                          onClick={approveAiGeneratedVideo}
                          disabled={
                            !aiGeneratedVideoBlob ||
                            aiVideoPreparing ||
                            aiVideoApproving
                          }
                          className="inline-flex items-center justify-center rounded-2xl bg-[#D8B46A] px-4 py-3 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {aiVideoApproving
                            ? lang === "id"
                              ? "Mengunggah..."
                              : "Uploading..."
                            : lang === "id"
                              ? "✓ Gunakan video ini"
                              : "✓ Use this video"}
                        </button>
                      </div>
                    </div>
                  ) : null}

                  <p className="mt-2 text-center text-xs font-medium text-gray-500">{lang === "id" ? "9:16 vertikal · Maksimal 1:30" : "9:16 portrait · Maximum 1:30"}</p>
                  {videoLocked ? <p className="mt-3 rounded-xl bg-gray-50 p-3 text-xs leading-5 text-gray-600">{lang === "id" ? "Video dibuat saat membuat listing dan tidak dapat diubah setelah diposting. Anda tetap dapat mengedit detail listing lainnya." : "Videos are added when creating a listing and cannot be changed after posting. You can still edit the other listing details."}</p> : <div className="mt-4 flex items-center gap-2">
                    <label
                      htmlFor={videoInputId}
                      className={[
                        "inline-flex flex-1 items-center justify-center rounded-2xl border border-gray-200 bg-gray-100 px-4 py-3 text-center text-sm font-semibold",
                        uploadingVideo
                          ? "cursor-not-allowed opacity-60"
                          : "cursor-pointer",
                      ].join(" ")}
                      onClick={(e) => {
                        if (uploadingVideo || aiVideoPreparing || aiVideoApproving) {
                          e.preventDefault();
                          return;
                        }

                        if (videoInputRef.current) {
                          videoInputRef.current.value = "";
                        }
                      }}
                    >
                      {uploadingVideo ? t.uploading : t.uploadVideo}
                    </label>

                    {video ? (
                      <button
                        onClick={clearVideo}
                        disabled={aiVideoPreparing || aiVideoApproving}
                        className="inline-flex flex-1 items-center justify-center rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold"
                        type="button"
                      >
                        {t.removeVideo}
                      </button>
                    ) : null}
                  </div>}

                  <details className="mt-3 rounded-2xl border border-gray-200 px-3 py-2 text-xs text-gray-600"><summary className="cursor-pointer font-semibold">ⓘ {lang === "id" ? "Sudah punya video?" : "Already have a finished video?"}</summary><p className="mt-2 leading-5">{lang === "id" ? "Upload video siap pakai melalui tombol Upload Video. Video otomatis tampil di pratinjau setelah unggahan selesai. Tersedia untuk semua paket. Pembuatan video dari foto atau klip di bawah adalah fitur terpisah untuk Pemilik Priority / Featured, Agen Gold, dan Agent Pro." : "Upload your finished video with Upload Video. It appears in the preview once uploading completes. Available with every package. Generating a video from photos or clips below is a separate feature for Owner Priority / Featured, Agent Gold and Agent Pro."}</p></details>
                  <details className="mt-3 rounded-2xl border border-gray-200 px-3 py-2 text-xs text-gray-600">
                    <summary className="cursor-pointer font-semibold">{t.videoGuideTitle}</summary>
                    <ul className="mt-2 list-disc space-y-1 pl-5">
                      <li>{t.videoGuideMp4}</li>
                      <li>{t.videoGuideResolution}</li>
                      <li>{t.videoGuideCompressed}</li>
                      <li>{t.videoGuideRawPhone}</li>
                    </ul>
                  </details>
                </div>

                <input
                  id={videoInputId}
                  ref={videoInputRef}
                  type="file"
                  accept="video/*,.mp4,.mov,.webm"
                  className="absolute left-[-9999px] top-auto h-px w-px opacity-0"
                  disabled={videoLocked}
                  onChange={(e) => onAddVideo(e.target.files)}
                />
              </section>
            </div>


            {((isAgent && agentVideoEligible) || (source === "owner" && ["priority", "featured"].includes(String(draft?.plan)))) && !videoLocked ? (
              <div id="ai-video-steps" ref={aiStudioRef} className="mt-8 scroll-mt-32 overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-sm">
                <div className="bg-[#17191D] px-5 py-5 text-white sm:px-7">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#D8B46A]">TETAMO AI VIDEO</p>
                  <h3 className="mt-2 text-xl font-bold sm:text-2xl">{lang === "id" ? "Buat video properti Anda" : "Generate your property video"}</h3>
                  <p className="mt-2 text-sm text-gray-300">{lang === "id" ? "Tambah foto atau klip → pilih musik → buat video." : "Add photos or clips → choose music → generate video."}</p>
                  <p className="mt-3 text-xs font-semibold text-[#E8CB8B]">{lang === "id" ? "9:16 vertikal saja · Maksimal 1:30" : "9:16 portrait only · Maximum 1:30"}</p>
                </div>
                  <div className="space-y-5 p-5 sm:p-7">
                    <fieldset disabled={aiVideoPreparing || aiVideoApproving} className="rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 p-3 disabled:opacity-60">
                      <legend className="px-2 text-sm font-bold">{lang === "id" ? "1. Tambah foto atau klip" : "1. Add photos or clips"}</legend>
                      {aiVideoMedia.length === 0 ? (
                        <div className="py-3 text-center">
                          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">
                            +
                          </div>

                          <p className="mt-4 text-sm font-bold text-[#1C1C1E]">
                            {lang === "id"
                              ? "Foto dan klip properti Anda"
                              : "Your property photos and clips"}
                          </p>

                          <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-gray-500 sm:text-sm">
                            {lang === "id"
                              ? "Video vertikal 9:16 saja · maksimal 1:30. Tambahkan foto atau klip properti Anda."
                              : "9:16 portrait only · maximum 1:30. Add your property photos or clips."}
                          </p>

                          <button
                            type="button"
                            onClick={() => aiVideoInputRef.current?.click()}
                            className="mt-5 inline-flex items-center justify-center rounded-2xl bg-[#1C1C1E] px-6 py-3 text-sm font-semibold text-white hover:bg-black"
                          >
                            + {lang === "id" ? "Tambah foto atau video" : "Add photos or videos"}
                          </button>
                        </div>
                      ) : (
                        <div>
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="text-sm font-bold text-[#1C1C1E]">
                                {lang === "id"
                                  ? "Media Properti"
                                  : "Property Media"}
                              </p>
                              <p className="mt-1 text-xs text-gray-500">
                                {aiVideoMedia.length}{" "}
                                {lang === "id" ? "media dipilih" : "media selected"}
                                {" · "}
                                {lang === "id" ? "Durasi video" : "Video footage"}:{" "}
                                {aiVideoDurationLabel} / 1:30
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => aiVideoInputRef.current?.click()}
                              className="inline-flex w-fit items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-[#1C1C1E] hover:bg-gray-50"
                            >
                              + {lang === "id" ? "Tambah Media" : "Add More"}
                            </button>
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                            {aiVideoMedia.map((item, index) => (
                              <div
                                key={item.id}
                                draggable={!aiVideoPreparing && !aiVideoApproving}
                                onDragStart={() => setDraggedAiMediaId(item.id)}
                                onDragEnd={() => setDraggedAiMediaId(null)}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  dropAiVideoMedia(item.id);
                                }}
                                className={[
                                  "group relative aspect-square overflow-hidden rounded-2xl border bg-black transition",
                                  draggedAiMediaId === item.id
                                    ? "border-[#1C1C1E] opacity-50"
                                    : "border-gray-200",
                                ].join(" ")}
                              >
                                {item.kind === "video" ? (
                                  <video
                                    src={item.url}
                                    className="h-full w-full object-cover"
                                    controls
                                    playsInline
                                  />
                                ) : (
                                  <img
                                    src={item.url}
                                    alt={item.file.name}
                                    className="h-full w-full object-cover"
                                  />
                                )}

                                <div className="absolute left-2 top-2 z-10 flex items-center gap-1">
                                  <span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-black/70 px-2 text-[11px] font-bold text-white shadow-sm">
                                    {index + 1}
                                  </span>

                                  <span
                                    title={
                                      lang === "id"
                                        ? "Tarik untuk mengatur urutan"
                                        : "Drag to reorder"
                                    }
                                    className="hidden h-8 cursor-grab items-center justify-center rounded-full bg-black/70 px-2 text-sm font-bold text-white shadow-sm active:cursor-grabbing sm:flex"
                                  >
                                    ⋮⋮
                                  </span>
                                </div>

                                <div className="absolute bottom-8 left-2 z-20 flex gap-1">
                                  <button
                                    type="button"
                                    disabled={index === 0}
                                    onClick={() =>
                                      moveAiVideoMedia(index, index - 1)
                                    }
                                    aria-label={
                                      lang === "id"
                                        ? "Pindah ke kiri"
                                        : "Move left"
                                    }
                                    className="flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-sm font-bold text-white shadow-sm disabled:opacity-30"
                                  >
                                    ←
                                  </button>

                                  <button
                                    type="button"
                                    disabled={index === aiVideoMedia.length - 1}
                                    onClick={() =>
                                      moveAiVideoMedia(index, index + 1)
                                    }
                                    aria-label={
                                      lang === "id"
                                        ? "Pindah ke kanan"
                                        : "Move right"
                                    }
                                    className="flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-sm font-bold text-white shadow-sm disabled:opacity-30"
                                  >
                                    →
                                  </button>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => removeAiVideoMedia(item.id)}
                                  aria-label={
                                    lang === "id" ? "Hapus media" : "Remove media"
                                  }
                                  className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-sm font-bold text-white shadow-sm hover:bg-black"
                                >
                                  ×
                                </button>

                                <div className="pointer-events-none absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/75 to-transparent px-2 pb-2 pt-8">
                                  <p className="truncate text-[10px] font-medium text-white">
                                    {item.file.name}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <input
                        ref={aiVideoInputRef}
                        type="file"
                        accept="image/*,video/*,.jpg,.jpeg,.png,.webp,.heic,.heif,.mp4,.mov,.webm"
                        multiple
                        className="absolute left-[-9999px] top-auto h-px w-px opacity-0"
                        onChange={(e) => onAddAiVideoMedia(e.target.files)}
                      />
                    </fieldset>

                    {aiVideoMedia.some(item => item.width > 0 && item.height > 0 && Math.abs(item.width / item.height - 9 / 16) > 0.025) && <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">{lang === "id" ? "⚠ Ada foto atau klip yang bukan 9:16 vertikal. Hasil video tetap 9:16; bagian tepi dapat terpotong. Periksa preview sebelum menggunakan video." : "⚠ Some photos or clips are not 9:16 portrait. Your finished video will be 9:16; edges may be cropped. Check the preview before using it."}</p>}

                    <BackgroundMusic lang={lang} value={backgroundMusic} onChange={changeBackgroundMusic} disabled={aiVideoPreparing || aiVideoApproving} />

                    <div className="space-y-3 border-t border-gray-100 pt-5">
                      <h4 className="text-sm font-bold">{lang === "id" ? "3. Buat video Anda" : "3. Generate your video"}</h4>
                      <p className="text-xs text-gray-500">{aiVideoLimit === null || aiVideoSuccessfulCount === null ? (lang === "id" ? "Kuota per listing: Priority / Featured 1 · Gold 2 · Agent Pro 3. Diperiksa sebelum pembuatan video." : "Per listing: Priority / Featured 1 · Gold 2 · Agent Pro 3. Allowance is verified before generation.") : (lang === "id" ? `${Math.max(0, aiVideoLimit - aiVideoSuccessfulCount)} dari ${aiVideoLimit} pembuatan tersisa` : `${Math.max(0, aiVideoLimit - aiVideoSuccessfulCount)} of ${aiVideoLimit} generations remaining`)}</p>
                      {aiVideoPreparing && <p role="status" aria-live="polite" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{lang === "id" ? (aiVideoStage === 'preparing' ? 'Menyiapkan video…' : aiVideoStage === 'uploading' ? 'Mengunggah foto dan klip…' : 'Membuat video dan menambahkan musik… Tetap buka halaman ini.') : (aiVideoStage === 'preparing' ? 'Preparing your video…' : aiVideoStage === 'uploading' ? 'Uploading photos and clips…' : 'Creating your video and adding music… Keep this page open.')}</p>}
                      <button
                        type="button"
                        onClick={handleAiVideoGenerate}
                        disabled={aiVideoMedia.length === 0 || aiVideoPreparing || aiVideoApproving || (aiVideoLimit !== null && aiVideoSuccessfulCount !== null && aiVideoSuccessfulCount >= aiVideoLimit && !aiVideoCanResume)}
                        className={[
                          "inline-flex w-full items-center justify-center rounded-2xl bg-[#D8B46A] px-6 py-3.5 text-sm font-bold text-black transition sm:w-auto",
                          aiVideoMedia.length === 0 || aiVideoPreparing
                            ? "cursor-not-allowed opacity-40"
                            : "hover:brightness-95",
                        ].join(" ")}
                      >
                        {aiVideoPreparing
                          ? lang === "id"
                            ? "Membuat video…"
                            : "Creating your video…"
                          : `✨ ${lang === "id" ? "Buat video" : "Generate Video"}`}
                      </button>
                    </div>
                  </div>
              </div>
            ) : null}

            <div className="mt-8 border-t border-gray-100 pt-8 sm:mt-10 sm:pt-10">
              <div className="mb-6 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 sm:px-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#1C1C1E] sm:text-base">
                      {t.aiBoxTitle}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-gray-600 sm:text-sm">
                      {t.aiBoxSubtitle}
                    </p>
                    {canUseSocialCaption ? (
                      <p className="mt-1 text-xs leading-5 text-gray-600">
                        {t.aiSocialNote}
                      </p>
                    ) : null}
                    <p className="mt-1 text-xs leading-5 text-gray-500">
                      {t.aiNote}
                    </p>
                  </div>

                  <button
                    onClick={generateWithAi}
                    disabled={
                      generatingAi ||
                      aiGenerationCount >= MAX_AI_GENERATIONS
                    }
                    className={[
                      "inline-flex shrink-0 items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold transition",
                      generatingAi ||
                      aiGenerationCount >= MAX_AI_GENERATIONS
                        ? "cursor-not-allowed bg-gray-200 text-gray-500"
                        : "bg-[#1C1C1E] text-white hover:opacity-90",
                    ].join(" ")}
                    type="button"
                  >
                    {aiGenerationCount >= MAX_AI_GENERATIONS
                      ? t.aiUsedShort
                      : generatingAi
                      ? t.aiGenerating
                      : t.aiButton}
                  </button>
                </div>

                {aiError ? (
                  <p className="mt-3 text-xs leading-5 text-red-600">
                    {aiError}
                  </p>
                ) : null}
              </div>

              {canUseSocialCaption && socialCaption.trim() ? (
                <div className="mb-6 rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-sm sm:px-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-[#1C1C1E] sm:text-base">
                        {t.socialCaptionTitle}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-gray-600 sm:text-sm">
                        {t.socialCaptionSubtitle}
                      </p>
                    </div>

                    <button
                      onClick={copySocialCaption}
                      type="button"
                      className="inline-flex shrink-0 items-center justify-center rounded-2xl border border-gray-200 px-4 py-2.5 text-xs font-semibold text-[#1C1C1E] hover:bg-gray-50 sm:text-sm"
                    >
                      {captionCopied ? t.copiedCaption : t.copyCaption}
                    </button>
                  </div>

                  <div className="mt-4 whitespace-pre-line rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm leading-6 text-gray-700">
                    {socialCaption}
                  </div>
                </div>
              ) : null}

              <div className="flex items-center justify-between gap-3 text-sm">
                <label className="font-semibold">{t.englishTitle} *</label>
                <span className="shrink-0 text-gray-500">
                  {title.length}/{MAX_TITLE}
                </span>
              </div>

              <input
                value={title}
                onChange={(e) => {
                  const nextValue = capitalizeFirstLetter(e.target.value);
                  if (nextValue.length <= MAX_TITLE) {
                    setTitle(nextValue);
                  }
                }}
                className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#1C1C1E] focus:ring-0"
                maxLength={MAX_TITLE}
              />

              <div className="mt-5 flex items-center justify-between gap-3 text-sm">
                <label className="font-semibold">{t.indonesianTitle} *</label>
                <span className="shrink-0 text-gray-500">
                  {titleId.length}/{MAX_TITLE}
                </span>
              </div>

              <input
                value={titleId}
                onChange={(e) => {
                  const nextValue = capitalizeFirstLetter(e.target.value);
                  if (nextValue.length <= MAX_TITLE) {
                    setTitleId(nextValue);
                  }
                }}
                className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#1C1C1E] focus:ring-0"
                maxLength={MAX_TITLE}
              />

              <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <ul className="list-disc space-y-1 pl-5">
                  <li>{t.titleGuide1}</li>
                  <li>{t.titleGuide2}</li>
                  <li>{t.titleGuide3}</li>
                </ul>
              </div>

              <div className="mt-6 flex items-center justify-between gap-3 text-sm">
                <label className="font-semibold">
                  {t.englishDescription} *
                </label>
                <span className="shrink-0 text-gray-500">
                  {description.length}/{MAX_DESC}
                </span>
              </div>

              <textarea
                value={description}
                onChange={(e) => {
                  if (e.target.value.length <= MAX_DESC) {
                    setDescription(capitalizeFirstLetter(e.target.value));
                  }
                }}
                className="mt-2 min-h-[220px] w-full resize-y rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#1C1C1E] focus:ring-0 sm:min-h-[240px]"
                maxLength={MAX_DESC}
              />

              <div className="mt-6 flex items-center justify-between gap-3 text-sm">
                <label className="font-semibold">
                  {t.indonesianDescription} *
                </label>
                <span className="shrink-0 text-gray-500">
                  {descriptionId.length}/{MAX_DESC}
                </span>
              </div>

              <textarea
                value={descriptionId}
                onChange={(e) => {
                  if (e.target.value.length <= MAX_DESC) {
                    setDescriptionId(capitalizeFirstLetter(e.target.value));
                  }
                }}
                className="mt-2 min-h-[220px] w-full resize-y rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#1C1C1E] focus:ring-0 sm:min-h-[240px]"
                maxLength={MAX_DESC}
              />

              <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <ul className="list-disc space-y-1 pl-5">
                  <li>{t.descGuide1}</li>
                  <li>{t.descGuide2}</li>
                  <li>{t.descGuide3}</li>
                </ul>
              </div>

              {!canContinue ? (
                <p className="mt-3 text-xs leading-5 text-gray-500">
                  {helperMessage}
                </p>
              ) : null}

              <button
                onClick={handleNext}
                disabled={
                  isDemo || !canContinue || aiVideoPreparing || aiVideoApproving ||
                  uploadingPhotos ||
                  uploadingVideo ||
                  generatingAi
                }
                className={[
                  "mt-6 w-full rounded-2xl py-3.5 text-sm font-semibold transition sm:mt-8 sm:py-4 sm:text-base",
                  canContinue &&
                  !uploadingPhotos &&
                  !uploadingVideo &&
                  !generatingAi
                    ? "bg-[#1C1C1E] text-white hover:opacity-90"
                    : "cursor-not-allowed bg-gray-200 text-gray-500",
                ].join(" ")}
                type="button"
              >
                {isDemo ? "Demo berhenti di pratinjau—tidak dipublikasikan" : primaryButtonLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
