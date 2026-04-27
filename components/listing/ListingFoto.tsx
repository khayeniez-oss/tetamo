"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/app/context/LanguageContext";

type Props = {
  draft: any;
  setDraft: (fn: any) => void;
  onNext: () => void;
  onBack: () => void;
};

type DraftMedia = {
  photos?: string[];
  coverIndex?: number;
  video?: string;
  title?: string;
  title_id?: string;
  description?: string;
  description_id?: string;
  mediaFolder?: string;
  mode?: "create" | "edit";
  source?: "owner" | "agent";
  aiGeneratedOnce?: boolean;
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
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE = 100 * 1024 * 1024;

const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];

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

function getDraftLocation(draft: any) {
  const directLocation = getDraftText(draft, [
    "location",
    "address",
    "alamat",
    "propertyLocation",
    "fullLocation",
  ]);

  if (directLocation) return directLocation;

  const area = getDraftText(draft, [
    "area",
    "district",
    "kecamatan",
    "neighborhood",
    "subdistrict",
  ]);

  const city = getDraftText(draft, ["city", "kota", "regency", "kabupaten"]);
  const province = getDraftText(draft, ["province", "provinsi"]);

  return [area, city, province].filter(Boolean).join(", ");
}

function getDraftFeatures(draft: any) {
  const values = [
    getDraftText(draft, ["features", "facilities", "amenities"]),
    getDraftText(draft, ["otherFacilities", "additionalFacilities"]),
    getDraftText(draft, ["propertyFeatures", "highlights"]),
  ].filter(Boolean);

  return Array.from(new Set(values)).join(", ");
}

function limitText(value: string, limit: number) {
  return value.trim().slice(0, limit);
}

export default function ListingFoto({
  draft,
  setDraft,
  onNext,
  onBack,
}: Props) {
  const { lang } = useLanguage();
  const initial = (draft || {}) as DraftMedia;

  const mode: "create" | "edit" =
    initial.mode === "edit" ? "edit" : "create";
  const source: "owner" | "agent" =
    initial.source === "agent" ? "agent" : "owner";

  const isEdit = mode === "edit";
  const isAgent = source === "agent";
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
            "AI akan menggunakan detail properti yang sudah Anda isi sebelumnya.",
          aiButton: "✨ Generate dengan AI",
          aiGenerating: "Membuat...",
          aiUsedShort: "AI Sudah Digunakan",
          aiNote:
            "AI hanya dapat digunakan satu kali per listing untuk penggunaan yang adil.",
          aiNeedDetails:
            "Lengkapi detail properti terlebih dahulu sebelum menggunakan AI.",
          aiFailed: "AI gagal membuat deskripsi. Silakan coba lagi.",
          aiOverwriteConfirm:
            "Konten judul/deskripsi yang sudah ada akan diganti oleh hasil AI. Lanjutkan?",
          aiAlreadyGenerated: "AI sudah digunakan 1x untuk listing ini.",
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
            "AI will use the property details you filled earlier.",
          aiButton: "✨ Generate with AI",
          aiGenerating: "Generating...",
          aiUsedShort: "AI Used",
          aiNote:
            "AI can only be used once per listing to control fair usage.",
          aiNeedDetails:
            "Please complete the property details first before using AI.",
          aiFailed: "AI failed to generate the description. Please try again.",
          aiOverwriteConfirm:
            "Existing title/description content will be replaced by the AI result. Continue?",
          aiAlreadyGenerated: "AI has already been used 1x for this listing.",
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
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiGeneratedOnce, setAiGeneratedOnce] = useState<boolean>(
    Boolean(initial.aiGeneratedOnce)
  );

  const hydratedRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);

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
    setAiGeneratedOnce(Boolean((draft as any)?.aiGeneratedOnce));

    hydratedRef.current = true;
  }, [draft]);

  useEffect(() => {
    if (!hydratedRef.current) return;

    setDraft((p: any) => ({
      ...(p || {}),
      photos,
      coverIndex,
      video,
      title,
      title_id: titleId,
      description,
      description_id: descriptionId,
      aiGeneratedOnce,
    }));
  }, [
    photos,
    coverIndex,
    video,
    title,
    titleId,
    description,
    descriptionId,
    aiGeneratedOnce,
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
    const propertyType = getDraftText(draft, [
      "propertyType",
      "property_type",
      "jenisProperti",
      "type",
      "category",
      "kategori",
    ]);

    const location = getDraftLocation(draft);

    const price = getDraftText(draft, [
      "price",
      "priceIdr",
      "harga",
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
      "bedroomCount",
    ]);

    const bathrooms = getDraftText(draft, [
      "bathrooms",
      "bathroom",
      "kamarMandi",
      "bathroomCount",
    ]);

    const landSize = getDraftText(draft, [
      "landSize",
      "land_size",
      "luasTanah",
      "landArea",
    ]);

    const buildingSize = getDraftText(draft, [
      "buildingSize",
      "building_size",
      "luasBangunan",
      "buildingArea",
    ]);

    const furnishing = getDraftText(draft, [
      "furnishing",
      "furnished",
      "furnish",
      "furniture",
    ]);

    const features = getDraftFeatures(draft);

    const purpose = getDraftText(draft, [
      "purpose",
      "listingType",
      "transactionType",
      "listingPurpose",
      "status",
    ]);

    const rentalType = getDraftText(draft, [
      "rentalType",
      "rental_type",
      "rentType",
      "sewaType",
    ]);

    const ownershipTitle = getDraftText(draft, [
      "ownershipTitle",
      "ownership_title",
      "certificate",
      "sertifikat",
      "titleType",
    ]);

    const nearbyPlaces = getDraftText(draft, [
      "nearbyPlaces",
      "nearby",
      "nearbyLocation",
      "surroundings",
    ]);

    return {
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

    if (aiGeneratedOnce) {
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
      aiPayload.buildingSize;

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

      const response = await fetch("/api/ai/property-description", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
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

      setTitle(nextTitle);
      setTitleId(nextTitleId);
      setDescription(nextDescription);
      setDescriptionId(nextDescriptionId);
      setAiGeneratedOnce(true);

      setDraft((p: any) => ({
        ...(p || {}),
        title: nextTitle,
        title_id: nextTitleId,
        description: nextDescription,
        description_id: nextDescriptionId,
        aiGeneratedOnce: true,
        ai_seo_title: generated.seoTitle || p?.ai_seo_title || "",
        ai_seo_meta_description:
          generated.seoMetaDescription || p?.ai_seo_meta_description || "",
        ai_social_caption: generated.socialCaption || p?.ai_social_caption || "",
        ai_whatsapp_inquiry_message:
          generated.whatsappInquiryMessage ||
          p?.ai_whatsapp_inquiry_message ||
          "",
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

  async function ensureUserAndFolder() {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      throw new Error(t.loginFirst);
    }

    const folder = draft?.mediaFolder || draft?.kode || crypto.randomUUID();

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
    if (!files) return;

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

      if (video) {
        const oldPath = getPublicFilePathFromUrl(video, "property-videos");
        if (oldPath) {
          await supabase.storage.from("property-videos").remove([oldPath]);
        }
      }

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
    const path = getPublicFilePathFromUrl(video, "property-videos");
    setVideo("");

    if (!path) return;

    try {
      await supabase.storage.from("property-videos").remove([path]);
    } catch (error) {
      console.error("Clear video error:", error);
    }
  }

  function handleNext() {
    if (!canContinue || uploadingPhotos || uploadingVideo || generatingAi) return;
    onNext();
  }

  return (
    <main className="min-h-screen bg-white text-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        <button
          onClick={onBack}
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

              <section className="min-w-0">
                <div className="mb-3 text-sm font-semibold sm:text-base">
                  {t.videoOptional}
                </div>

                <div className="mx-auto w-full max-w-[320px] lg:max-w-[340px] xl:max-w-[380px]">
                  <div className="relative aspect-[9/16] w-full overflow-hidden rounded-2xl border border-gray-200 bg-gray-100">
                    {video ? (
                      <video
                        src={video}
                        controls
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center px-4 text-center text-sm text-gray-500">
                        {t.noVideoYet}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    <label
                      htmlFor={videoInputId}
                      className={[
                        "inline-flex flex-1 items-center justify-center rounded-2xl border border-gray-200 bg-gray-100 px-4 py-3 text-center text-sm font-semibold",
                        uploadingVideo
                          ? "cursor-not-allowed opacity-60"
                          : "cursor-pointer",
                      ].join(" ")}
                      onClick={(e) => {
                        if (uploadingVideo) {
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
                        className="inline-flex flex-1 items-center justify-center rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold"
                        type="button"
                      >
                        {t.removeVideo}
                      </button>
                    ) : null}
                  </div>

                  <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    <p className="font-semibold">{t.videoGuideTitle}</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5">
                      <li>{t.videoGuideMp4}</li>
                      <li>{t.videoGuideResolution}</li>
                      <li>{t.videoGuideCompressed}</li>
                      <li>{t.videoGuideRawPhone}</li>
                    </ul>
                  </div>
                </div>

                <input
                  id={videoInputId}
                  ref={videoInputRef}
                  type="file"
                  accept="video/*,.mp4,.mov,.webm"
                  className="absolute left-[-9999px] top-auto h-px w-px opacity-0"
                  onChange={(e) => onAddVideo(e.target.files)}
                />
              </section>
            </div>

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
                  </div>

                  <button
                    onClick={generateWithAi}
                    disabled={generatingAi || aiGeneratedOnce}
                    className={[
                      "inline-flex shrink-0 items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold transition",
                      generatingAi || aiGeneratedOnce
                        ? "cursor-not-allowed bg-gray-200 text-gray-500"
                        : "bg-[#1C1C1E] text-white hover:opacity-90",
                    ].join(" ")}
                    type="button"
                  >
                    {aiGeneratedOnce
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
                  !canContinue ||
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
                {primaryButtonLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}