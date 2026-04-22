"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
type PreviewLang = "en" | "id";
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

function hasBlockContent(block: BlogContentBlockDraft) {
  return Boolean(
    cleanText(block.heading) ||
      cleanText(block.heading_id) ||
      cleanText(block.content) ||
      cleanText(block.content_id) ||
      cleanText(block.image_url) ||
      cleanText(block.caption) ||
      cleanText(block.caption_id) ||
      cleanText(block.button_label) ||
      cleanText(block.button_label_id) ||
      cleanText(block.button_url)
  );
}

function getFirstActiveBlock(blocks: BlogContentBlockDraft[]) {
  return blocks.find((block) => hasBlockContent(block)) || null;
}

function getEnglishFallbackTitle(form: BlogForm, blocks: BlogContentBlockDraft[]) {
  const firstBlock = getFirstActiveBlock(blocks);

  return (
    cleanText(form.title) ||
    cleanText(firstBlock?.heading) ||
    cleanText(firstBlock?.heading_id) ||
    cleanText(form.title_id)
  );
}

function getIndonesianFallbackTitle(
  form: BlogForm,
  blocks: BlogContentBlockDraft[]
) {
  const firstBlock = getFirstActiveBlock(blocks);

  return (
    cleanText(form.title_id) ||
    cleanText(firstBlock?.heading_id) ||
    cleanText(firstBlock?.heading) ||
    cleanText(form.title)
  );
}

function getSlugSource(form: BlogForm, blocks: BlogContentBlockDraft[]) {
  const firstBlock = getFirstActiveBlock(blocks);

  return (
    cleanText(form.title) ||
    cleanText(form.title_id) ||
    cleanText(firstBlock?.heading) ||
    cleanText(firstBlock?.heading_id)
  );
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

export default function AdminNewBlogPage() {
  const router = useRouter();

  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const bodyImageInputRef = useRef<HTMLInputElement | null>(null);
  const blockImageInputRef = useRef<HTMLInputElement | null>(null);

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
    publish_at: "",
  });

  const [blocks, setBlocks] = useState<BlogContentBlockDraft[]>([
    createBlock(1),
  ]);

  const [slugTouched, setSlugTouched] = useState(false);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  const [previewMode, setPreviewMode] = useState(false);
  const [previewLang, setPreviewLang] = useState<PreviewLang>("en");

  const [savingDraft, setSavingDraft] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingBodyImage, setUploadingBodyImage] = useState(false);
  const [uploadingBlockImageId, setUploadingBlockImageId] = useState<
    string | null
  >(null);
  const [targetBlockImageId, setTargetBlockImageId] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (slugTouched) return;

    const source = getSlugSource(form, blocks);
    const nextSlug = slugify(source);

    setForm((prev) => {
      if (prev.slug === nextSlug) return prev;

      return {
        ...prev,
        slug: nextSlug,
      };
    });
  }, [form.title, form.title_id, blocks, slugTouched]);

  useEffect(() => {
    let ignore = false;

    async function loadInitialData() {
      setLoadingCategories(true);

      const [{ data: authData }, categoriesRes, profileRes] = await Promise.all([
        supabase.auth.getUser(),
        supabase
          .from("blog_categories")
          .select("id, name, slug, sort_order")
          .eq("is_active", true)
          .order("name", { ascending: true }),
        supabase.auth.getUser().then(async ({ data }) => {
          const userId = data.user?.id;
          if (!userId) return { data: null, error: null };

          return supabase
            .from("profiles")
            .select("full_name")
            .eq("id", userId)
            .maybeSingle();
        }),
      ]);

      if (ignore) return;

      if (!categoriesRes.error) {
        setCategories((categoriesRes.data ?? []) as BlogCategory[]);
      } else {
        console.error("Failed to load blog categories:", categoriesRes.error);
      }

      const fallbackName =
        profileRes?.data?.full_name ||
        authData?.user?.user_metadata?.full_name ||
        "Tetamo Editorial";

      setForm((prev) => ({
        ...prev,
        author_name: fallbackName,
      }));

      setLoadingCategories(false);
    }

    loadInitialData();

    return () => {
      ignore = true;
    };
  }, []);

  const activeBlocks = useMemo(
    () => blocks.filter((block) => hasBlockContent(block)),
    [blocks]
  );

  const publicUrlPreview = useMemo(() => {
    return form.slug ? `/blog/${form.slug}` : "/blog/[slug]";
  }, [form.slug]);

  const previewTitle =
    previewLang === "id"
      ? getIndonesianFallbackTitle(form, blocks)
      : getEnglishFallbackTitle(form, blocks);

  const previewExcerpt = previewLang === "id" ? form.excerpt_id : form.excerpt;
  const previewContent = previewLang === "id" ? form.content_id : form.content;

  const publishAtIso = useMemo(() => {
    return toIsoFromDatetimeLocal(form.publish_at);
  }, [form.publish_at]);

  const isScheduled = useMemo(() => {
    if (!publishAtIso) return false;
    return new Date(publishAtIso).getTime() > Date.now();
  }, [publishAtIso]);

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
    const cleanSlug = form.slug || slugify(getSlugSource(form, blocks)) || "blog";
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

  async function saveBlog(status: "draft" | "published") {
    const cleanBlocks = blocks.filter((block) => hasBlockContent(block));

    const finalTitle = getEnglishFallbackTitle(form, cleanBlocks);
    const finalTitleId = getIndonesianFallbackTitle(form, cleanBlocks);
    const finalSlug = slugify(form.slug || getSlugSource(form, cleanBlocks));

    const cleanExcerpt = form.excerpt.trim();
    const cleanExcerptId = form.excerpt_id.trim();
    const cleanContent = form.content.trim();
    const cleanContentId = form.content_id.trim();
    const cleanCategory = form.category.trim();
    const cleanAuthor = form.author_name.trim() || "Tetamo Editorial";

    const hasEnglishContent =
      Boolean(stripHtml(cleanContent)) ||
      cleanBlocks.some(
        (block) =>
          cleanText(block.heading) ||
          cleanText(block.content) ||
          cleanText(block.image_url)
      );

    const hasIndonesianContent =
      Boolean(stripHtml(cleanContentId)) ||
      cleanBlocks.some(
        (block) =>
          cleanText(block.heading_id) ||
          cleanText(block.content_id) ||
          cleanText(block.image_url)
      );

    if (!finalTitle) {
      alert("Add an English blog title or the first English tutorial heading.");
      return;
    }

    if (!finalTitleId) {
      alert(
        "Add an Indonesian blog title or the first Indonesian tutorial heading."
      );
      return;
    }

    if (!finalSlug) {
      alert("Slug is required. Add a blog title or tutorial heading first.");
      return;
    }

    if (!hasEnglishContent) {
      alert(
        "Add English main content or at least one English tutorial step with heading, description, or image."
      );
      return;
    }

    if (!hasIndonesianContent) {
      alert(
        "Add Indonesian main content or at least one Indonesian tutorial step with heading, description, or image."
      );
      return;
    }

    const resolvedPublishedAt =
      status === "published"
        ? publishAtIso || new Date().toISOString()
        : null;

    if (status === "published" && form.publish_at && !publishAtIso) {
      alert("Publish date is invalid.");
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
        .from("blogs")
        .insert({
          title: finalTitle,
          title_id: finalTitleId,
          slug: finalSlug,
          excerpt: cleanExcerpt || null,
          excerpt_id: cleanExcerptId || null,
          content: cleanContent || null,
          content_id: cleanContentId || null,
          category: cleanCategory || null,
          author_name: cleanAuthor,
          cover_image_url: form.cover_image_url || null,
          status,
          access_type: form.access_type,
          published_at: resolvedPublishedAt,
          created_by: user.id,
          updated_by: user.id,
        })
        .select("id")
        .single();

      if (error) throw error;

      if (data?.id && cleanBlocks.length > 0) {
        const blockRows = cleanBlocks.map((block, index) => ({
          blog_id: data.id,
          block_type: block.block_type,
          step_number:
            block.block_type === "step" ? index + 1 : block.step_number || null,
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
          button_label: cleanText(block.button_label) || null,
          button_label_id: cleanText(block.button_label_id) || null,
          button_url: cleanText(block.button_url) || null,
          sort_order: index,
          is_active: true,
        }));

        const { error: blocksError } = await supabase
          .from("blog_content_blocks")
          .insert(blockRows);

        if (blocksError) throw blocksError;
      }

      if (status === "published") {
        alert(
          isScheduled && resolvedPublishedAt
            ? `Blog scheduled for ${formatDateTime(resolvedPublishedAt)}.`
            : "Blog published successfully."
        );
      } else {
        alert("Draft saved successfully.");
      }

      if (data?.id) {
        router.push(`/admindashboard/blogs/${data.id}/edit`);
      } else {
        router.push("/admindashboard/blogs");
      }
    } catch (error: any) {
      console.error("Failed to save blog:", error);
      alert(error?.message || "Failed to save blog.");
    } finally {
      setSavingDraft(false);
      setPublishing(false);
    }
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
                New Blog / Tutorial
              </h1>
              <p className="text-xs text-gray-500 sm:text-sm">
                Create a normal blog or a step-by-step tutorial for Tetamo.
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

            <button
              type="button"
              onClick={() => saveBlog("draft")}
              disabled={savingDraft || publishing}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-[#1C1C1E] hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save size={16} />
              {savingDraft ? "Saving..." : "Save Draft"}
            </button>

            <button
              type="button"
              onClick={() => saveBlog("published")}
              disabled={savingDraft || publishing}
              className="inline-flex items-center gap-2 rounded-xl bg-[#1C1C1E] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send size={16} />
              {publishing
                ? isScheduled
                  ? "Scheduling..."
                  : "Publishing..."
                : isScheduled
                  ? "Schedule"
                  : "Publish"}
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
                English Preview
              </LangPill>

              <LangPill
                active={previewLang === "id"}
                onClick={() => setPreviewLang("id")}
              >
                Indonesian Preview
              </LangPill>
            </div>

            <div className="space-y-6">
              <div className="rounded-3xl border border-gray-200 bg-[#FAFAF8] p-4 sm:p-5">
                <h2 className="text-lg font-bold text-[#1C1C1E]">
                  English Version
                </h2>

                <div className="mt-4">
                  <FieldLabel>English Blog Title</FieldLabel>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => updateField("title", e.target.value)}
                    placeholder="Optional if this is a tutorial. First tutorial heading can become the title."
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
                  <FieldLabel>English Main Content</FieldLabel>
                  <TiptapBlogEditor
                    content={form.content}
                    onChange={(html) => updateField("content", html)}
                    placeholder="Use this for normal blog content. For tutorial-only, you can leave this empty and use the tutorial steps below."
                    onUploadImage={() => bodyImageInputRef.current?.click()}
                  />
                </div>
              </div>

              <div className="rounded-3xl border border-gray-200 bg-[#FAFAF8] p-4 sm:p-5">
                <h2 className="text-lg font-bold text-[#1C1C1E]">
                  Indonesian Version
                </h2>

                <div className="mt-4">
                  <FieldLabel>Indonesian Blog Title</FieldLabel>
                  <InputBase
                    type="text"
                    value={form.title_id}
                    onChange={(e) => updateField("title_id", e.target.value)}
                    placeholder="Opsional jika ini tutorial. Judul langkah pertama bisa menjadi judul."
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
                  <FieldLabel>Indonesian Main Content</FieldLabel>
                  <TiptapBlogEditor
                    content={form.content_id}
                    onChange={(html) => updateField("content_id", html)}
                    placeholder="Untuk blog biasa. Untuk tutorial saja, boleh kosong dan gunakan langkah tutorial di bawah."
                    onUploadImage={() => bodyImageInputRef.current?.click()}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-[#1C1C1E]">
                  Tutorial / Body Blocks
                </h2>
                <p className="mt-1 text-sm leading-6 text-gray-500">
                  For tutorial-only posts, the first step heading can become the
                  blog title and slug automatically.
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
                        Heading + description + optional image/caption.
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
                      <FieldLabel>English Step Heading</FieldLabel>
                      <InputBase
                        value={block.heading}
                        onChange={(e) =>
                          updateBlock(block.id, "heading", e.target.value)
                        }
                        placeholder={`Step ${index + 1}: English heading`}
                      />
                    </div>

                    <div>
                      <FieldLabel>Indonesian Step Heading</FieldLabel>
                      <InputBase
                        value={block.heading_id}
                        onChange={(e) =>
                          updateBlock(block.id, "heading_id", e.target.value)
                        }
                        placeholder={`Langkah ${index + 1}: Judul Bahasa Indonesia`}
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
                              updateBlock(block.id, "image_alt", e.target.value)
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
                              updateBlock(block.id, "caption", e.target.value)
                            }
                            placeholder="Optional image caption"
                          />
                        </div>

                        <div>
                          <FieldLabel>Indonesian Caption</FieldLabel>
                          <InputBase
                            value={block.caption_id}
                            onChange={(e) =>
                              updateBlock(block.id, "caption_id", e.target.value)
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
                    {previewTitle || "Untitled blog / tutorial"}
                  </h2>

                  <div className="mt-4">{articleMeta}</div>

                  {previewExcerpt && (
                    <p className="mt-6 text-base leading-8 text-gray-600">
                      {previewExcerpt}
                    </p>
                  )}

                  <div
                    className="prose prose-sm mt-8 max-w-none text-gray-700 sm:prose-base prose-headings:text-[#1C1C1E] prose-p:leading-8 prose-li:leading-8 prose-blockquote:border-l-4 prose-blockquote:border-gray-300 prose-blockquote:pl-4"
                    dangerouslySetInnerHTML={{
                      __html:
                        previewContent ||
                        "<p style='color:#9ca3af;'>No main content yet.</p>",
                    }}
                  />

                  {activeBlocks.length > 0 && (
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
                  placeholder="Auto from blog title or tutorial heading"
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
                  onChange={(e) => updateField("category", e.target.value)}
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
                  schedule this blog.
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-[#FAFAF8] p-4 text-sm text-gray-600">
                <div className="flex items-start gap-3">
                  <CalendarDays
                    size={18}
                    className="mt-0.5 shrink-0 text-[#1C1C1E]"
                  />

                  <div>
                    <p className="font-semibold text-[#1C1C1E]">
                      {form.publish_at
                        ? isScheduled
                          ? "Scheduled publish"
                          : "Immediate publish"
                        : "Immediate publish"}
                    </p>

                    <p className="mt-1 leading-6">
                      {form.publish_at
                        ? publishAtIso
                          ? isScheduled
                            ? `This blog will go live on ${formatDateTime(
                                publishAtIso
                              )}.`
                            : `This blog will publish immediately using ${formatDateTime(
                                publishAtIso
                              )}.`
                          : "The selected publish date is invalid."
                        : "No publish date selected. This blog will go live as soon as you click Publish."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
                <p className="font-semibold">Tutorial Blocks</p>
                <p className="mt-1 leading-6">
                  Active blocks ready to save: {activeBlocks.length}
                </p>
              </div>
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
  );
}