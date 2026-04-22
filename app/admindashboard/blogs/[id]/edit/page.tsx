"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  Eye,
  Image as ImageIcon,
  Plus,
  Save,
  Send,
  Trash2,
  Upload,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import TiptapBlogEditor from "@/components/blog/TiptapBlogEditor";

type BlogAccessType = "public" | "paid_agent";
type BlogStatus = "draft" | "published";
type PreviewLang = "en" | "id";
type ContentMode = "blog" | "tutorial";

type BlogBlockType =
  | "heading"
  | "paragraph"
  | "image"
  | "gallery"
  | "quote"
  | "step"
  | "button";

type BlogCategory = {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
};

type BlogForm = {
  title: string;
  title_id: string;
  slug: string;
  excerpt: string;
  excerpt_id: string;
  content: string;
  content_id: string;
  category: string;
  author_name: string;
  access_type: BlogAccessType;
  cover_image_url: string;
  status: BlogStatus;
  publish_at: string;
};

type BlogContentBlockDraft = {
  id: string;
  block_type: BlogBlockType;
  step_number: number;
  heading: string;
  heading_id: string;
  content: string;
  content_id: string;
  image_url: string;
  image_alt: string;
  image_alt_id: string;
  caption: string;
  caption_id: string;
  button_label: string;
  button_label_id: string;
  button_url: string;
  sort_order: number;
};

type BlogContentBlockRow = {
  id: string;
  blog_id: string;
  block_type: string | null;
  step_number: number | null;
  heading: string | null;
  heading_id: string | null;
  content: string | null;
  content_id: string | null;
  image_url: string | null;
  image_alt: string | null;
  image_alt_id: string | null;
  caption: string | null;
  caption_id: string | null;
  button_label: string | null;
  button_label_id: string | null;
  button_url: string | null;
  sort_order: number | null;
  is_active: boolean | null;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

function cleanText(value?: string | null) {
  return String(value || "").trim();
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

function toDatetimeLocalValue(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function toIsoFromDatetimeLocal(value: string) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date.toISOString();
}

function createDraftId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `block-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function createBlock(stepNumber: number): BlogContentBlockDraft {
  return {
    id: createDraftId(),
    block_type: "step",
    step_number: stepNumber,
    heading: "",
    heading_id: "",
    content: "",
    content_id: "",
    image_url: "",
    image_alt: "",
    image_alt_id: "",
    caption: "",
    caption_id: "",
    button_label: "",
    button_label_id: "",
    button_url: "",
    sort_order: stepNumber - 1,
  };
}

function normalizeBlockType(value?: string | null): BlogBlockType {
  const allowed: BlogBlockType[] = [
    "heading",
    "paragraph",
    "image",
    "gallery",
    "quote",
    "step",
    "button",
  ];

  return allowed.includes(value as BlogBlockType)
    ? (value as BlogBlockType)
    : "step";
}

function mapRowToDraftBlock(
  row: BlogContentBlockRow,
  index: number
): BlogContentBlockDraft {
  return {
    id: row.id || createDraftId(),
    block_type: normalizeBlockType(row.block_type),
    step_number: row.step_number ?? index + 1,
    heading: row.heading ?? "",
    heading_id: row.heading_id ?? "",
    content: row.content ?? "",
    content_id: row.content_id ?? "",
    image_url: row.image_url ?? "",
    image_alt: row.image_alt ?? "",
    image_alt_id: row.image_alt_id ?? "",
    caption: row.caption ?? "",
    caption_id: row.caption_id ?? "",
    button_label: row.button_label ?? "",
    button_label_id: row.button_label_id ?? "",
    button_url: row.button_url ?? "",
    sort_order: row.sort_order ?? index,
  };
}

function hasBlockContent(block: BlogContentBlockDraft) {
  return Boolean(
    cleanText(block.heading) ||
      cleanText(block.heading_id) ||
      cleanText(block.content) ||
      cleanText(block.content_id) ||
      cleanText(block.image_url) ||
      cleanText(block.caption) ||
      cleanText(block.caption_id)
  );
}

function getFirstActiveBlock(blocks: BlogContentBlockDraft[]) {
  return blocks.find((block) => hasBlockContent(block)) || null;
}

function getSlugSource(
  mode: ContentMode,
  form: BlogForm,
  blocks: BlogContentBlockDraft[]
) {
  const firstBlock = getFirstActiveBlock(blocks);

  if (mode === "tutorial") {
    return cleanText(firstBlock?.heading);
  }

  return cleanText(form.title);
}

function getPreviewTitle(
  mode: ContentMode,
  lang: PreviewLang,
  form: BlogForm,
  blocks: BlogContentBlockDraft[]
) {
  const firstBlock = getFirstActiveBlock(blocks);

  if (mode === "tutorial") {
    if (lang === "id") {
      return (
        cleanText(firstBlock?.heading_id) ||
        cleanText(firstBlock?.heading) ||
        "Untitled tutorial"
      );
    }

    return (
      cleanText(firstBlock?.heading) ||
      cleanText(firstBlock?.heading_id) ||
      "Untitled tutorial"
    );
  }

  if (lang === "id") {
    return cleanText(form.title_id) || cleanText(form.title) || "Untitled blog";
  }

  return cleanText(form.title) || cleanText(form.title_id) || "Untitled blog";
}

function inferMode(
  blogCategory: string | null | undefined,
  content: string | null | undefined,
  contentId: string | null | undefined,
  blocks: BlogContentBlockRow[]
): ContentMode {
  const category = cleanText(blogCategory).toLowerCase();
  const hasBlocks = blocks.length > 0;
  const hasMainContent = Boolean(stripHtml(content || ""));
  const hasMainContentId = Boolean(stripHtml(contentId || ""));

  if (category === "tutorial") return "tutorial";
  if (hasBlocks && !hasMainContent && !hasMainContentId) return "tutorial";

  return "blog";
}

function InputBase(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none placeholder-gray-400 focus:border-[#1C1C1E] ${
        props.className ?? ""
      }`}
    />
  );
}

function SelectBase(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        {...props}
        className={`w-full appearance-none rounded-2xl border border-gray-300 bg-white px-4 py-3 pr-12 text-sm outline-none focus:border-[#1C1C1E] ${
          props.className ?? ""
        }`}
      />
      <ChevronDown
        size={18}
        className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-500"
      />
    </div>
  );
}

function TextareaBase(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none placeholder-gray-400 focus:border-[#1C1C1E] ${
        props.className ?? ""
      }`}
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

export default function AdminEditBlogPage() {
  const router = useRouter();
  const params = useParams();

  const blogId =
    typeof params?.id === "string"
      ? params.id
      : Array.isArray(params?.id)
        ? params.id[0]
        : "";

  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const bodyImageInputRef = useRef<HTMLInputElement | null>(null);
  const blockImageInputRef = useRef<HTMLInputElement | null>(null);

  const [mode, setMode] = useState<ContentMode>("blog");

  const [form, setForm] = useState<BlogForm>({
    title: "",
    title_id: "",
    slug: "",
    excerpt: "",
    excerpt_id: "",
    content: "",
    content_id: "",
    category: "",
    author_name: "Tetamo Editorial",
    access_type: "public",
    cover_image_url: "",
    status: "draft",
    publish_at: "",
  });

  const [blocks, setBlocks] = useState<BlogContentBlockDraft[]>([
    createBlock(1),
  ]);

  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingBlog, setLoadingBlog] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [slugTouched, setSlugTouched] = useState(false);
  const [categoryTouched, setCategoryTouched] = useState(false);

  const [previewMode, setPreviewMode] = useState(false);
  const [previewLang, setPreviewLang] = useState<PreviewLang>("en");

  const [savingDraft, setSavingDraft] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [unpublishing, setUnpublishing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingBodyImage, setUploadingBodyImage] = useState(false);
  const [uploadingBlockImageId, setUploadingBlockImageId] = useState<
    string | null
  >(null);
  const [targetBlockImageId, setTargetBlockImageId] = useState<string | null>(
    null
  );

  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [viewCount, setViewCount] = useState<number>(0);

  useEffect(() => {
    let ignore = false;

    async function loadPageData() {
      if (!blogId) {
        setNotFound(true);
        setLoadingBlog(false);
        setLoadingCategories(false);
        return;
      }

      setLoadingBlog(true);
      setLoadingCategories(true);

      const [blogRes, categoriesRes, blocksRes] = await Promise.all([
        supabase
          .from("blogs")
          .select(`
            id,
            title,
            title_id,
            slug,
            excerpt,
            excerpt_id,
            content,
            content_id,
            category,
            author_name,
            access_type,
            cover_image_url,
            status,
            created_at,
            updated_at,
            published_at,
            view_count
          `)
          .eq("id", blogId)
          .single(),
        supabase
          .from("blog_categories")
          .select("id, name, slug, sort_order")
          .eq("is_active", true)
          .order("name", { ascending: true }),
        supabase
          .from("blog_content_blocks")
          .select(`
            id,
            blog_id,
            block_type,
            step_number,
            heading,
            heading_id,
            content,
            content_id,
            image_url,
            image_alt,
            image_alt_id,
            caption,
            caption_id,
            button_label,
            button_label_id,
            button_url,
            sort_order,
            is_active
          `)
          .eq("blog_id", blogId)
          .order("sort_order", { ascending: true }),
      ]);

      if (ignore) return;

      if (categoriesRes.error) {
        console.error("Failed to load blog categories:", categoriesRes.error);
      } else {
        setCategories((categoriesRes.data ?? []) as BlogCategory[]);
      }

      setLoadingCategories(false);

      if (blogRes.error || !blogRes.data) {
        console.error("Failed to load blog:", blogRes.error);
        setNotFound(true);
        setLoadingBlog(false);
        return;
      }

      const data = blogRes.data as any;
      const blockRows = (blocksRes.data ?? []) as BlogContentBlockRow[];
      const detectedMode = inferMode(
        data.category,
        data.content,
        data.content_id,
        blockRows
      );

      setMode(detectedMode);

      setForm({
        title: data.title ?? "",
        title_id: data.title_id ?? "",
        slug: data.slug ?? "",
        excerpt: data.excerpt ?? "",
        excerpt_id: data.excerpt_id ?? "",
        content: data.content ?? "",
        content_id: data.content_id ?? "",
        category: data.category ?? "",
        author_name: data.author_name ?? "Tetamo Editorial",
        access_type: (data.access_type as BlogAccessType) ?? "public",
        cover_image_url: data.cover_image_url ?? "",
        status: (data.status as BlogStatus) ?? "draft",
        publish_at: toDatetimeLocalValue(data.published_at),
      });

      setSlugTouched(Boolean(data.slug));
      setCategoryTouched(Boolean(data.category));

      setCreatedAt(data.created_at ?? null);
      setUpdatedAt(data.updated_at ?? null);
      setPublishedAt(data.published_at ?? null);
      setViewCount(Number(data.view_count ?? 0));

      if (blocksRes.error) {
        console.error("Failed to load blog content blocks:", blocksRes.error);
        setBlocks([createBlock(1)]);
      } else if (blockRows.length > 0) {
        setBlocks(blockRows.map((row, index) => mapRowToDraftBlock(row, index)));
      } else {
        setBlocks([createBlock(1)]);
      }

      setLoadingBlog(false);
    }

    loadPageData();

    return () => {
      ignore = true;
    };
  }, [blogId]);

  useEffect(() => {
    if (slugTouched) return;

    const source = getSlugSource(mode, form, blocks);
    const nextSlug = slugify(source);

    setForm((prev) => {
      if (prev.slug === nextSlug) return prev;

      return {
        ...prev,
        slug: nextSlug,
      };
    });
  }, [mode, form.title, blocks, slugTouched]);

  useEffect(() => {
    if (categoryTouched) return;
    if (mode !== "tutorial") return;

    const tutorialCategory = categories.find(
      (category) =>
        category.slug.toLowerCase() === "tutorial" ||
        category.name.toLowerCase() === "tutorial"
    );

    if (!tutorialCategory) return;

    setForm((prev) => {
      if (prev.category === tutorialCategory.name) return prev;

      return {
        ...prev,
        category: tutorialCategory.name,
      };
    });
  }, [mode, categories, categoryTouched]);

  const activeBlocks = useMemo(
    () => blocks.filter((block) => hasBlockContent(block)),
    [blocks]
  );

  const publicUrlPreview = useMemo(() => {
    return form.slug ? `/blog/${form.slug}` : "/blog/[slug]";
  }, [form.slug]);

  const previewTitle = getPreviewTitle(mode, previewLang, form, blocks);
  const previewExcerpt = previewLang === "id" ? form.excerpt_id : form.excerpt;
  const previewContent = previewLang === "id" ? form.content_id : form.content;

  const publishAtIso = useMemo(() => {
    return toIsoFromDatetimeLocal(form.publish_at);
  }, [form.publish_at]);

  const isScheduled = useMemo(() => {
    if (!publishAtIso) return false;
    return new Date(publishAtIso).getTime() > Date.now();
  }, [publishAtIso]);

  const effectiveStatusLabel = useMemo(() => {
    if (form.status !== "published") return "Draft";
    if (publishedAt && new Date(publishedAt).getTime() > Date.now()) {
      return "Scheduled";
    }
    return "Published";
  }, [form.status, publishedAt]);

  const articleMeta = (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500">
      <span>{form.author_name || "Tetamo Editorial"}</span>
      {form.category && (
        <>
          <span>•</span>
          <span>{form.category}</span>
        </>
      )}
      <span>•</span>
      <span>
        {form.access_type === "paid_agent" ? "Paid Agent Only" : "Public"}
      </span>
    </div>
  );

  function updateField<K extends keyof BlogForm>(key: K, value: BlogForm[K]) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function updateBlock<K extends keyof BlogContentBlockDraft>(
    blockId: string,
    key: K,
    value: BlogContentBlockDraft[K]
  ) {
    setBlocks((prev) =>
      prev.map((block) =>
        block.id === blockId
          ? {
              ...block,
              [key]: value,
            }
          : block
      )
    );
  }

  function handleModeChange(nextMode: ContentMode) {
    setMode(nextMode);
    setSlugTouched(false);

    if (nextMode === "tutorial") {
      setForm((prev) => ({
        ...prev,
        content: "",
        content_id: "",
      }));
    }
  }

  function addBlock() {
    setBlocks((prev) => [...prev, createBlock(prev.length + 1)]);
  }

  function removeBlock(blockId: string) {
    setBlocks((prev) => {
      const next = prev.filter((block) => block.id !== blockId);

      if (next.length === 0) {
        return [createBlock(1)];
      }

      return next.map((block, index) => ({
        ...block,
        step_number: index + 1,
        sort_order: index,
      }));
    });
  }

  function moveBlock(blockId: string, direction: "up" | "down") {
    setBlocks((prev) => {
      const currentIndex = prev.findIndex((block) => block.id === blockId);
      if (currentIndex < 0) return prev;

      const nextIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
      if (nextIndex < 0 || nextIndex >= prev.length) return prev;

      const next = [...prev];
      const [item] = next.splice(currentIndex, 1);
      next.splice(nextIndex, 0, item);

      return next.map((block, index) => ({
        ...block,
        step_number: index + 1,
        sort_order: index,
      }));
    });
  }

  async function uploadImageToStorage(file: File, folder: "cover" | "body") {
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const cleanSlug =
      form.slug || slugify(getSlugSource(mode, form, blocks)) || "tetamo-blog";

    const path = `${folder}/${cleanSlug}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("blog-images")
      .upload(path, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from("blog-images").getPublicUrl(path);
    return data.publicUrl;
  }

  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingCover(true);
      const publicUrl = await uploadImageToStorage(file, "cover");

      setForm((prev) => ({
        ...prev,
        cover_image_url: publicUrl,
      }));
    } catch (error: any) {
      console.error("Failed to upload cover image:", error);
      alert(error?.message || "Failed to upload cover image.");
    } finally {
      setUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = "";
    }
  }

  async function handleBodyImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingBodyImage(true);
      const publicUrl = await uploadImageToStorage(file, "body");

      setForm((prev) => ({
        ...prev,
        content: `${prev.content}<p><img src="${publicUrl}" alt="Blog image" /></p>`,
        content_id: `${prev.content_id}<p><img src="${publicUrl}" alt="Blog image" /></p>`,
      }));
    } catch (error: any) {
      console.error("Failed to upload body image:", error);
      alert(error?.message || "Failed to upload body image.");
    } finally {
      setUploadingBodyImage(false);
      if (bodyImageInputRef.current) bodyImageInputRef.current.value = "";
    }
  }

  function openBlockImageUpload(blockId: string) {
    setTargetBlockImageId(blockId);
    blockImageInputRef.current?.click();
  }

  async function handleBlockImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !targetBlockImageId) return;

    try {
      setUploadingBlockImageId(targetBlockImageId);
      const publicUrl = await uploadImageToStorage(file, "body");

      setBlocks((prev) =>
        prev.map((block) =>
          block.id === targetBlockImageId
            ? {
                ...block,
                image_url: publicUrl,
                image_alt:
                  block.image_alt ||
                  block.heading ||
                  `Step ${block.step_number} image`,
                image_alt_id:
                  block.image_alt_id ||
                  block.heading_id ||
                  `Gambar langkah ${block.step_number}`,
              }
            : block
        )
      );
    } catch (error: any) {
      console.error("Failed to upload tutorial image:", error);
      alert(error?.message || "Failed to upload tutorial image.");
    } finally {
      setUploadingBlockImageId(null);
      setTargetBlockImageId(null);
      if (blockImageInputRef.current) blockImageInputRef.current.value = "";
    }
  }

  async function saveBlog(nextStatus: BlogStatus) {
    const cleanBlocks = blocks.filter((block) => hasBlockContent(block));

    const cleanCategory = form.category.trim();
    const cleanAuthor = form.author_name.trim() || "Tetamo Editorial";
    const cleanExcerpt = form.excerpt.trim();
    const cleanExcerptId = form.excerpt_id.trim();
    const cleanContent = form.content.trim();
    const cleanContentId = form.content_id.trim();

    let finalTitle = "";
    let finalTitleId = "";
    let finalSlug = "";
    let finalContent: string | null = null;
    let finalContentId: string | null = null;

    if (mode === "blog") {
      finalTitle = cleanText(form.title);
      finalTitleId = cleanText(form.title_id);
      finalSlug = slugify(form.slug || form.title);
      finalContent = cleanContent || null;
      finalContentId = cleanContentId || null;

      if (!finalTitle) {
        alert("English blog title is required for Blog mode.");
        return;
      }

      if (!finalTitleId) {
        alert("Indonesian blog title is required for Blog mode.");
        return;
      }

      if (!finalSlug) {
        alert("Slug is required. Add a blog title first.");
        return;
      }

      if (!stripHtml(cleanContent)) {
        alert("English main content is required for Blog mode.");
        return;
      }

      if (!stripHtml(cleanContentId)) {
        alert("Indonesian main content is required for Blog mode.");
        return;
      }
    }

    if (mode === "tutorial") {
      const firstBlock = cleanBlocks[0];

      finalTitle = cleanText(firstBlock?.heading);
      finalTitleId = cleanText(firstBlock?.heading_id);
      finalSlug = slugify(form.slug || finalTitle);
      finalContent = null;
      finalContentId = null;

      if (!firstBlock) {
        alert("Add at least one tutorial step.");
        return;
      }

      if (!finalTitle) {
        alert("English Step 1 heading is required for Tutorial mode.");
        return;
      }

      if (!finalTitleId) {
        alert("Indonesian Step 1 heading is required for Tutorial mode.");
        return;
      }

      if (!finalSlug) {
        alert("Slug is required. Add English Step 1 heading first.");
        return;
      }

      const hasEnglishTutorialContent = cleanBlocks.some(
        (block) =>
          cleanText(block.heading) ||
          cleanText(block.content) ||
          cleanText(block.image_url)
      );

      const hasIndonesianTutorialContent = cleanBlocks.some(
        (block) =>
          cleanText(block.heading_id) ||
          cleanText(block.content_id) ||
          cleanText(block.image_url)
      );

      if (!hasEnglishTutorialContent) {
        alert("Add English tutorial heading, description, or image.");
        return;
      }

      if (!hasIndonesianTutorialContent) {
        alert("Add Indonesian tutorial heading, description, or image.");
        return;
      }
    }

    if (nextStatus === "published" && form.publish_at && !publishAtIso) {
      alert("Publish date is invalid.");
      return;
    }

    if (nextStatus === "draft") setSavingDraft(true);
    if (nextStatus === "published" && form.status === "draft") setPublishing(true);
    if (nextStatus === "draft" && form.status === "published") setUnpublishing(true);
    if (nextStatus === "published" && form.status === "published") setPublishing(true);

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

      const nextPublishedAt =
        nextStatus === "published"
          ? publishAtIso || new Date().toISOString()
          : null;

      const { data, error } = await supabase
        .from("blogs")
        .update({
          title: finalTitle,
          title_id: finalTitleId,
          slug: finalSlug,
          excerpt: cleanExcerpt || null,
          excerpt_id: cleanExcerptId || null,
          content: finalContent,
          content_id: finalContentId,
          category: cleanCategory || null,
          author_name: cleanAuthor,
          access_type: form.access_type,
          cover_image_url: form.cover_image_url || null,
          status: nextStatus,
          published_at: nextPublishedAt,
          updated_by: user.id,
        })
        .eq("id", blogId)
        .select("updated_at, published_at, status")
        .single();

      if (error) throw error;

      const { error: deleteBlocksError } = await supabase
        .from("blog_content_blocks")
        .delete()
        .eq("blog_id", blogId);

      if (deleteBlocksError) throw deleteBlocksError;

      if (mode === "tutorial" && cleanBlocks.length > 0) {
        const blockRows = cleanBlocks.map((block, index) => ({
          blog_id: blogId,
          block_type: "step",
          step_number: index + 1,
          heading: cleanText(block.heading) || null,
          heading_id: cleanText(block.heading_id) || null,
          content: cleanText(block.content) || null,
          content_id: cleanText(block.content_id) || null,
          image_url: cleanText(block.image_url) || null,
          image_alt: cleanText(block.image_alt) || null,
          image_alt_id: cleanText(block.image_alt_id) || null,
          caption: cleanText(block.caption) || null,
          caption_id: cleanText(block.caption_id) || null,
          gallery_urls: [],
          button_label: null,
          button_label_id: null,
          button_url: null,
          sort_order: index,
          is_active: true,
        }));

        const { error: insertBlocksError } = await supabase
          .from("blog_content_blocks")
          .insert(blockRows);

        if (insertBlocksError) throw insertBlocksError;
      }

      setForm((prev) => ({
        ...prev,
        title: finalTitle,
        title_id: finalTitleId,
        slug: finalSlug,
        status: nextStatus,
        content: finalContent || "",
        content_id: finalContentId || "",
        publish_at: toDatetimeLocalValue(nextPublishedAt),
      }));

      setUpdatedAt(data?.updated_at ?? new Date().toISOString());
      setPublishedAt(data?.published_at ?? nextPublishedAt);

      if (nextStatus === "published") {
        const resolved = data?.published_at ?? nextPublishedAt;
        const future = resolved
          ? new Date(resolved).getTime() > Date.now()
          : false;

        alert(
          future
            ? `Content scheduled for ${formatDateTime(resolved)}.`
            : "Content published successfully."
        );
      } else if (form.status === "published") {
        alert("Content moved back to draft.");
      } else {
        alert("Draft saved successfully.");
      }
    } catch (error: any) {
      console.error("Failed to save content:", error);
      alert(error?.message || "Failed to save content.");
    } finally {
      setSavingDraft(false);
      setPublishing(false);
      setUnpublishing(false);
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      "Are you sure you want to delete this content?"
    );

    if (!confirmed) return;

    setDeleting(true);

    try {
      const { error } = await supabase.from("blogs").delete().eq("id", blogId);

      if (error) throw error;

      alert("Content deleted successfully.");
      router.push("/admindashboard/blogs");
    } catch (error: any) {
      console.error("Failed to delete content:", error);
      alert(error?.message || "Failed to delete content.");
    } finally {
      setDeleting(false);
    }
  }

  if (loadingBlog) {
    return (
      <div className="rounded-3xl border border-gray-200 bg-white p-6 text-sm text-gray-500 shadow-sm">
        Loading content...
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-[#1C1C1E]">Content not found</h1>
        <p className="mt-2 text-sm text-gray-500">
          The blog/tutorial you are trying to edit does not exist or cannot be
          loaded.
        </p>

        <Link
          href="/admindashboard/blogs"
          className="mt-4 inline-flex rounded-xl bg-[#1C1C1E] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
        >
          Back to Blog Manager
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F6F3]">
      <input
        ref={coverInputRef}
        type="file"
        accept="image/*"
        onChange={handleCoverUpload}
        className="hidden"
      />

      <input
        ref={bodyImageInputRef}
        type="file"
        accept="image/*"
        onChange={handleBodyImageUpload}
        className="hidden"
      />

      <input
        ref={blockImageInputRef}
        type="file"
        accept="image/*"
        onChange={handleBlockImageUpload}
        className="hidden"
      />

      <div className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/admindashboard/blogs"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-[#1C1C1E] hover:bg-gray-50"
            >
              <ArrowLeft size={16} />
              Back
            </Link>

            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold text-[#1C1C1E] sm:text-2xl">
                Edit Blog / Tutorial
              </h1>
              <p className="text-xs text-gray-500 sm:text-sm">
                Blog slug comes from Blog Title. Tutorial slug comes from Step 1
                Heading.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setPreviewMode((prev) => !prev)}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-[#1C1C1E] hover:bg-gray-50"
            >
              <Eye size={16} />
              {previewMode ? "Hide Preview" : "Preview"}
            </button>

            <Link
              href={publicUrlPreview}
              target="_blank"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-[#1C1C1E] hover:bg-gray-50"
            >
              <Eye size={16} />
              View Public
            </Link>

            <button
              type="button"
              onClick={() => saveBlog("draft")}
              disabled={savingDraft || publishing || unpublishing || deleting}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-[#1C1C1E] hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save size={16} />
              {form.status === "published"
                ? unpublishing
                  ? "Unpublishing..."
                  : "Move to Draft"
                : savingDraft
                  ? "Saving..."
                  : "Save Draft"}
            </button>

            <button
              type="button"
              onClick={() => saveBlog("published")}
              disabled={savingDraft || publishing || unpublishing || deleting}
              className="inline-flex items-center gap-2 rounded-xl bg-[#1C1C1E] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send size={16} />
              {publishing
                ? isScheduled
                  ? "Scheduling..."
                  : form.status === "published"
                    ? "Updating..."
                    : "Publishing..."
                : isScheduled
                  ? form.status === "published"
                    ? "Update Schedule"
                    : "Schedule"
                  : form.status === "published"
                    ? "Update Published"
                    : "Publish"}
            </button>

            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting || savingDraft || publishing || unpublishing}
              className="inline-flex items-center gap-2 rounded-xl border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Trash2 size={16} />
              {deleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:px-8">
        <div className="space-y-6">
          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-bold text-[#1C1C1E]">Content Type</h2>
            <p className="mt-1 text-sm text-gray-500">
              Select Blog or Tutorial. This controls where the slug comes from.
            </p>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => handleModeChange("blog")}
                className={`rounded-2xl border px-5 py-4 text-left transition ${
                  mode === "blog"
                    ? "border-[#1C1C1E] bg-[#1C1C1E] text-white"
                    : "border-gray-200 bg-white text-[#1C1C1E] hover:bg-gray-50"
                }`}
              >
                <div className="text-sm font-bold">Blog</div>
                <div
                  className={`mt-1 text-xs leading-5 ${
                    mode === "blog" ? "text-white/75" : "text-gray-500"
                  }`}
                >
                  Slug comes from the English Blog Title.
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleModeChange("tutorial")}
                className={`rounded-2xl border px-5 py-4 text-left transition ${
                  mode === "tutorial"
                    ? "border-[#1C1C1E] bg-[#1C1C1E] text-white"
                    : "border-gray-200 bg-white text-[#1C1C1E] hover:bg-gray-50"
                }`}
              >
                <div className="text-sm font-bold">Tutorial</div>
                <div
                  className={`mt-1 text-xs leading-5 ${
                    mode === "tutorial" ? "text-white/75" : "text-gray-500"
                  }`}
                >
                  Slug comes from English Step 1 Heading.
                </div>
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-6 flex flex-wrap items-center gap-2">
              <LangPill
                active={previewLang === "en"}
                onClick={() => setPreviewLang("en")}
              >
                English Preview
              </LangPill>

              <LangPill
                active={previewLang === "id"}
                onClick={() => setPreviewLang("id")}
              >
                Indonesian Preview
              </LangPill>
            </div>

            {mode === "blog" ? (
              <div className="space-y-6">
                <div className="rounded-3xl border border-gray-200 bg-[#FAFAF8] p-4 sm:p-5">
                  <h2 className="text-lg font-bold text-[#1C1C1E]">
                    English Blog
                  </h2>

                  <div className="mt-4">
                    <FieldLabel required>English Blog Title</FieldLabel>
                    <input
                      type="text"
                      value={form.title}
                      onChange={(e) => updateField("title", e.target.value)}
                      placeholder="Enter English blog title"
                      className="w-full border-0 bg-transparent p-0 text-3xl font-bold text-[#1C1C1E] outline-none placeholder:text-gray-300 sm:text-4xl"
                    />
                  </div>

                  <div className="mt-4">{articleMeta}</div>

                  <div className="mt-6">
                    <FieldLabel>English Excerpt</FieldLabel>
                    <TextareaBase
                      rows={3}
                      value={form.excerpt}
                      onChange={(e) => updateField("excerpt", e.target.value)}
                      placeholder="Write English short summary..."
                      className="resize-none border-gray-200 bg-white"
                    />
                  </div>

                  <div className="mt-6">
                    <FieldLabel required>English Main Content</FieldLabel>
                    <TiptapBlogEditor
                      content={form.content}
                      onChange={(html) => updateField("content", html)}
                      placeholder="Start writing your English blog here..."
                      onUploadImage={() => bodyImageInputRef.current?.click()}
                    />
                  </div>
                </div>

                <div className="rounded-3xl border border-gray-200 bg-[#FAFAF8] p-4 sm:p-5">
                  <h2 className="text-lg font-bold text-[#1C1C1E]">
                    Indonesian Blog
                  </h2>

                  <div className="mt-4">
                    <FieldLabel required>Indonesian Blog Title</FieldLabel>
                    <InputBase
                      type="text"
                      value={form.title_id}
                      onChange={(e) => updateField("title_id", e.target.value)}
                      placeholder="Masukkan judul blog Bahasa Indonesia"
                    />
                  </div>

                  <div className="mt-6">
                    <FieldLabel>Indonesian Excerpt</FieldLabel>
                    <TextareaBase
                      rows={3}
                      value={form.excerpt_id}
                      onChange={(e) => updateField("excerpt_id", e.target.value)}
                      placeholder="Tulis ringkasan singkat Bahasa Indonesia..."
                      className="resize-none border-gray-200 bg-white"
                    />
                  </div>

                  <div className="mt-6">
                    <FieldLabel required>Indonesian Main Content</FieldLabel>
                    <TiptapBlogEditor
                      content={form.content_id}
                      onChange={(html) => updateField("content_id", html)}
                      placeholder="Mulai tulis blog Bahasa Indonesia di sini..."
                      onUploadImage={() => bodyImageInputRef.current?.click()}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-3xl border border-gray-200 bg-[#FAFAF8] p-4 sm:p-5">
                <h2 className="text-lg font-bold text-[#1C1C1E]">
                  Tutorial Mode
                </h2>
                <p className="mt-1 text-sm leading-6 text-gray-500">
                  Blog title is not needed here. The public title and slug will
                  come from Step 1 Heading.
                </p>

                <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div>
                    <FieldLabel>English Excerpt</FieldLabel>
                    <TextareaBase
                      rows={3}
                      value={form.excerpt}
                      onChange={(e) => updateField("excerpt", e.target.value)}
                      placeholder="Optional short tutorial summary..."
                      className="resize-none border-gray-200 bg-white"
                    />
                  </div>

                  <div>
                    <FieldLabel>Indonesian Excerpt</FieldLabel>
                    <TextareaBase
                      rows={3}
                      value={form.excerpt_id}
                      onChange={(e) => updateField("excerpt_id", e.target.value)}
                      placeholder="Ringkasan tutorial opsional..."
                      className="resize-none border-gray-200 bg-white"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {mode === "tutorial" && (
            <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-[#1C1C1E]">
                    Tutorial Steps
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-gray-500">
                    Step 1 heading becomes the tutorial title and slug.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={addBlock}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1C1C1E] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                >
                  <Plus size={16} />
                  Add Step
                </button>
              </div>

              <div className="mt-6 space-y-5">
                {blocks.map((block, index) => (
                  <div
                    key={block.id}
                    className="rounded-3xl border border-gray-200 bg-[#FAFAF8] p-4 sm:p-5"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="text-base font-bold text-[#1C1C1E]">
                          Step {index + 1}
                        </h3>
                        <p className="text-xs text-gray-500">
                          {index === 0
                            ? "This heading controls tutorial title and slug."
                            : "Heading + description + optional image/caption."}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => moveBlock(block.id, "up")}
                          disabled={index === 0}
                          className="rounded-xl border border-gray-300 px-3 py-2 text-xs font-semibold text-[#1C1C1E] hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Up
                        </button>

                        <button
                          type="button"
                          onClick={() => moveBlock(block.id, "down")}
                          disabled={index === blocks.length - 1}
                          className="rounded-xl border border-gray-300 px-3 py-2 text-xs font-semibold text-[#1C1C1E] hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Down
                        </button>

                        <button
                          type="button"
                          onClick={() => removeBlock(block.id)}
                          className="inline-flex items-center gap-1 rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                        >
                          <Trash2 size={14} />
                          Remove
                        </button>
                      </div>
                    </div>

                    <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
                      <div>
                        <FieldLabel required={index === 0}>
                          English Step Heading
                        </FieldLabel>
                        <InputBase
                          value={block.heading}
                          onChange={(e) =>
                            updateBlock(block.id, "heading", e.target.value)
                          }
                          placeholder={
                            index === 0
                              ? "Required: English tutorial title"
                              : `Step ${index + 1}: English heading`
                          }
                        />
                      </div>

                      <div>
                        <FieldLabel required={index === 0}>
                          Indonesian Step Heading
                        </FieldLabel>
                        <InputBase
                          value={block.heading_id}
                          onChange={(e) =>
                            updateBlock(block.id, "heading_id", e.target.value)
                          }
                          placeholder={
                            index === 0
                              ? "Wajib: Judul tutorial Bahasa Indonesia"
                              : `Langkah ${index + 1}: Judul Bahasa Indonesia`
                          }
                        />
                      </div>

                      <div>
                        <FieldLabel>English Description</FieldLabel>
                        <TextareaBase
                          rows={5}
                          value={block.content}
                          onChange={(e) =>
                            updateBlock(block.id, "content", e.target.value)
                          }
                          placeholder="Explain this step in English..."
                          className="resize-none"
                        />
                      </div>

                      <div>
                        <FieldLabel>Indonesian Description</FieldLabel>
                        <TextareaBase
                          rows={5}
                          value={block.content_id}
                          onChange={(e) =>
                            updateBlock(block.id, "content_id", e.target.value)
                          }
                          placeholder="Jelaskan langkah ini dalam Bahasa Indonesia..."
                          className="resize-none"
                        />
                      </div>
                    </div>

                    <div className="mt-5 rounded-3xl border border-gray-200 bg-white p-4">
                      <div className="flex flex-col gap-4 lg:flex-row">
                        <div className="w-full lg:w-[280px]">
                          {block.image_url ? (
                            <img
                              src={block.image_url}
                              alt={
                                previewLang === "id"
                                  ? block.image_alt_id || block.heading_id
                                  : block.image_alt || block.heading
                              }
                              className="h-[180px] w-full rounded-2xl object-cover"
                            />
                          ) : (
                            <div className="flex h-[180px] w-full items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-[#FAFAF8] text-center text-sm text-gray-500">
                              No tutorial image
                            </div>
                          )}

                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => openBlockImageUpload(block.id)}
                              disabled={uploadingBlockImageId === block.id}
                              className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-3 py-2 text-xs font-semibold text-[#1C1C1E] hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <ImageIcon size={14} />
                              {uploadingBlockImageId === block.id
                                ? "Uploading..."
                                : "Upload Image"}
                            </button>

                            {block.image_url && (
                              <button
                                type="button"
                                onClick={() => {
                                  updateBlock(block.id, "image_url", "");
                                  updateBlock(block.id, "image_alt", "");
                                  updateBlock(block.id, "image_alt_id", "");
                                }}
                                className="rounded-xl border border-gray-300 px-3 py-2 text-xs font-semibold text-[#1C1C1E] hover:bg-gray-50"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="grid min-w-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-2">
                          <div>
                            <FieldLabel>English Image Alt Text</FieldLabel>
                            <InputBase
                              value={block.image_alt}
                              onChange={(e) =>
                                updateBlock(
                                  block.id,
                                  "image_alt",
                                  e.target.value
                                )
                              }
                              placeholder="Describe the image for SEO"
                            />
                          </div>

                          <div>
                            <FieldLabel>Indonesian Image Alt Text</FieldLabel>
                            <InputBase
                              value={block.image_alt_id}
                              onChange={(e) =>
                                updateBlock(
                                  block.id,
                                  "image_alt_id",
                                  e.target.value
                                )
                              }
                              placeholder="Deskripsi gambar untuk SEO"
                            />
                          </div>

                          <div>
                            <FieldLabel>English Caption</FieldLabel>
                            <InputBase
                              value={block.caption}
                              onChange={(e) =>
                                updateBlock(
                                  block.id,
                                  "caption",
                                  e.target.value
                                )
                              }
                              placeholder="Optional image caption"
                            />
                          </div>

                          <div>
                            <FieldLabel>Indonesian Caption</FieldLabel>
                            <InputBase
                              value={block.caption_id}
                              onChange={(e) =>
                                updateBlock(
                                  block.id,
                                  "caption_id",
                                  e.target.value
                                )
                              }
                              placeholder="Caption gambar opsional"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {previewMode && (
            <div className="rounded-3xl border border-gray-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-5 py-4 sm:px-6">
                <h2 className="text-lg font-bold text-[#1C1C1E]">Preview</h2>

                <div className="flex flex-wrap items-center gap-2">
                  <LangPill
                    active={previewLang === "en"}
                    onClick={() => setPreviewLang("en")}
                  >
                    EN
                  </LangPill>

                  <LangPill
                    active={previewLang === "id"}
                    onClick={() => setPreviewLang("id")}
                  >
                    ID
                  </LangPill>
                </div>
              </div>

              <div className="p-5 sm:p-6">
                {form.cover_image_url ? (
                  <img
                    src={form.cover_image_url}
                    alt={previewTitle || "Blog cover"}
                    className="h-[260px] w-full rounded-3xl object-cover sm:h-[360px]"
                  />
                ) : (
                  <div className="flex h-[220px] items-center justify-center rounded-3xl bg-[#1C1C1E] text-white">
                    No cover image yet
                  </div>
                )}

                <div className="mt-6">
                  {form.category && (
                    <div className="mb-4 inline-flex rounded-full border border-gray-200 bg-gray-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-gray-600">
                      {form.category}
                    </div>
                  )}

                  <h2 className="text-3xl font-bold leading-tight text-[#1C1C1E]">
                    {previewTitle || "Untitled"}
                  </h2>

                  <div className="mt-4">{articleMeta}</div>

                  {previewExcerpt && (
                    <p className="mt-6 text-base leading-8 text-gray-600">
                      {previewExcerpt}
                    </p>
                  )}

                  {mode === "blog" ? (
                    <div
                      className="prose prose-sm mt-8 max-w-none text-gray-700 sm:prose-base prose-headings:text-[#1C1C1E] prose-p:leading-8 prose-li:leading-8 prose-blockquote:border-l-4 prose-blockquote:border-gray-300 prose-blockquote:pl-4"
                      dangerouslySetInnerHTML={{
                        __html:
                          previewContent ||
                          "<p style='color:#9ca3af;'>No main content yet.</p>",
                      }}
                    />
                  ) : (
                    activeBlocks.length > 0 && (
                      <div className="mt-10 space-y-6">
                        <h3 className="text-xl font-bold text-[#1C1C1E]">
                          {previewLang === "id"
                            ? "Panduan Langkah demi Langkah"
                            : "Step-by-Step Guide"}
                        </h3>

                        {activeBlocks.map((block, index) => {
                          const blockHeading =
                            previewLang === "id"
                              ? block.heading_id || block.heading
                              : block.heading || block.heading_id;

                          const blockContent =
                            previewLang === "id"
                              ? block.content_id || block.content
                              : block.content || block.content_id;

                          const blockCaption =
                            previewLang === "id"
                              ? block.caption_id || block.caption
                              : block.caption || block.caption_id;

                          const blockAlt =
                            previewLang === "id"
                              ? block.image_alt_id || blockHeading
                              : block.image_alt || blockHeading;

                          return (
                            <div
                              key={block.id}
                              className="rounded-3xl border border-gray-200 bg-[#FAFAF8] p-4 sm:p-5"
                            >
                              <div className="inline-flex rounded-full bg-[#1C1C1E] px-3 py-1 text-xs font-semibold text-white">
                                Step {index + 1}
                              </div>

                              {blockHeading && (
                                <h4 className="mt-4 text-lg font-bold text-[#1C1C1E]">
                                  {blockHeading}
                                </h4>
                              )}

                              {blockContent && (
                                <p className="mt-3 whitespace-pre-line text-sm leading-7 text-gray-700">
                                  {blockContent}
                                </p>
                              )}

                              {block.image_url && (
                                <div className="mt-4">
                                  <img
                                    src={block.image_url}
                                    alt={blockAlt || `Step ${index + 1}`}
                                    className="w-full rounded-3xl border border-gray-200 object-cover"
                                  />

                                  {blockCaption && (
                                    <p className="mt-2 text-center text-xs text-gray-500">
                                      {blockCaption}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <aside className="space-y-6">
          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-bold text-[#1C1C1E]">
              Publish Settings
            </h2>

            <div className="mt-5 space-y-5">
              <div>
                <FieldLabel>Slug</FieldLabel>
                <InputBase
                  type="text"
                  value={form.slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    updateField("slug", slugify(e.target.value));
                  }}
                  placeholder={
                    mode === "tutorial"
                      ? "Auto from English Step 1 Heading"
                      : "Auto from English Blog Title"
                  }
                />
                <p className="mt-2 text-xs text-gray-500">
                  Public URL:{" "}
                  <span className="font-medium text-gray-700">
                    {publicUrlPreview}
                  </span>
                </p>
              </div>

              <div>
                <FieldLabel required>Writer</FieldLabel>
                <InputBase
                  type="text"
                  value={form.author_name}
                  onChange={(e) => updateField("author_name", e.target.value)}
                  placeholder="Writer name"
                />
              </div>

              <div>
                <FieldLabel>Category</FieldLabel>
                <SelectBase
                  value={form.category}
                  onChange={(e) => {
                    setCategoryTouched(true);
                    updateField("category", e.target.value);
                  }}
                  disabled={loadingCategories}
                >
                  <option value="">
                    {loadingCategories
                      ? "Loading categories..."
                      : "Select category"}
                  </option>

                  {categories.map((category) => (
                    <option key={category.id} value={category.name}>
                      {category.name}
                    </option>
                  ))}
                </SelectBase>
              </div>

              <div>
                <FieldLabel>Access Type</FieldLabel>
                <SelectBase
                  value={form.access_type}
                  onChange={(e) =>
                    updateField("access_type", e.target.value as BlogAccessType)
                  }
                >
                  <option value="public">Public</option>
                  <option value="paid_agent">Paid Agent Only</option>
                </SelectBase>
              </div>

              <div>
                <FieldLabel>Publish Date</FieldLabel>
                <InputBase
                  type="datetime-local"
                  value={form.publish_at}
                  onChange={(e) => updateField("publish_at", e.target.value)}
                  className="appearance-none"
                />
                <p className="mt-2 text-xs text-gray-500">
                  Leave blank to publish immediately. Set a future date to
                  schedule this content.
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-[#FAFAF8] p-4 text-sm text-gray-600">
                <div className="flex items-start gap-3">
                  <CalendarDays
                    size={18}
                    className="mt-0.5 shrink-0 text-[#1C1C1E]"
                  />

                  <div className="w-full">
                    <div className="flex items-center justify-between gap-3">
                      <span>Status</span>
                      <span className="font-semibold text-[#1C1C1E]">
                        {effectiveStatusLabel}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3">
                      <span>Created</span>
                      <span className="text-right">
                        {formatDateTime(createdAt)}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3">
                      <span>Updated</span>
                      <span className="text-right">
                        {formatDateTime(updatedAt)}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3">
                      <span>Published</span>
                      <span className="text-right">
                        {formatDateTime(publishedAt)}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3">
                      <span>Views</span>
                      <span className="font-semibold text-[#1C1C1E]">
                        {viewCount}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {mode === "tutorial" && (
                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
                  <p className="font-semibold">Tutorial Steps</p>
                  <p className="mt-1 leading-6">
                    Active steps ready to save: {activeBlocks.length}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-bold text-[#1C1C1E]">Cover Image</h2>

            <div className="mt-5">
              {form.cover_image_url ? (
                <img
                  src={form.cover_image_url}
                  alt="Cover preview"
                  className="h-52 w-full rounded-3xl object-cover"
                />
              ) : (
                <div className="flex h-52 items-center justify-center rounded-3xl border border-dashed border-gray-300 bg-[#FAFAF8] text-sm text-gray-500">
                  No cover image yet
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  disabled={uploadingCover}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-[#1C1C1E] hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Upload size={16} />
                  {uploadingCover ? "Uploading..." : "Upload Cover"}
                </button>

                {form.cover_image_url && (
                  <button
                    type="button"
                    onClick={() => updateField("cover_image_url", "")}
                    className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-[#1C1C1E] hover:bg-gray-50"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}