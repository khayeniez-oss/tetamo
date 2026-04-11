"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Eye,
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
  });

  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingBlog, setLoadingBlog] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [previewMode, setPreviewMode] = useState(false);
  const [previewLang, setPreviewLang] = useState<PreviewLang>("en");
  const [savingDraft, setSavingDraft] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [unpublishing, setUnpublishing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingBodyImage, setUploadingBodyImage] = useState(false);

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

      const [blogRes, categoriesRes] = await Promise.all([
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
          .order("sort_order", { ascending: true })
          .order("name", { ascending: true }),
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

      const data = blogRes.data;

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
      });

      setCreatedAt(data.created_at ?? null);
      setUpdatedAt(data.updated_at ?? null);
      setPublishedAt(data.published_at ?? null);
      setViewCount(Number(data.view_count ?? 0));
      setLoadingBlog(false);
    }

    loadPageData();

    return () => {
      ignore = true;
    };
  }, [blogId]);

  const publicUrlPreview = useMemo(() => {
    return form.slug ? `/blog/${form.slug}` : "/blog/[slug]";
  }, [form.slug]);

  const previewTitle = previewLang === "id" ? form.title_id : form.title;
  const previewExcerpt = previewLang === "id" ? form.excerpt_id : form.excerpt;
  const previewContent = previewLang === "id" ? form.content_id : form.content;

  function updateField<K extends keyof BlogForm>(key: K, value: BlogForm[K]) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function uploadImageToStorage(file: File, folder: "cover" | "body") {
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const cleanSlug = form.slug || slugify(form.title) || "blog";
    const path = `${folder}/${cleanSlug}-${Date.now()}.${ext}`;

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

  async function handleCoverUpload(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
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

  async function handleBodyImageUpload(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
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

  async function saveBlog(nextStatus: BlogStatus) {
    const cleanTitle = form.title.trim();
    const cleanTitleId = form.title_id.trim();
    const cleanSlug = slugify(form.slug || form.title);
    const cleanExcerpt = form.excerpt.trim();
    const cleanExcerptId = form.excerpt_id.trim();
    const cleanContent = form.content.trim();
    const cleanContentId = form.content_id.trim();
    const cleanCategory = form.category.trim();
    const cleanAuthor = form.author_name.trim() || "Tetamo Editorial";

    if (!cleanTitle) {
      alert("English title is required.");
      return;
    }

    if (!cleanTitleId) {
      alert("Indonesian title is required.");
      return;
    }

    if (!cleanSlug) {
      alert("Slug is required.");
      return;
    }

    if (!stripHtml(cleanContent)) {
      alert("English content is required.");
      return;
    }

    if (!stripHtml(cleanContentId)) {
      alert("Indonesian content is required.");
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
          ? publishedAt || new Date().toISOString()
          : null;

      const { data, error } = await supabase
        .from("blogs")
        .update({
          title: cleanTitle,
          title_id: cleanTitleId,
          slug: cleanSlug,
          excerpt: cleanExcerpt || null,
          excerpt_id: cleanExcerptId || null,
          content: cleanContent,
          content_id: cleanContentId,
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

      setForm((prev) => ({
        ...prev,
        slug: cleanSlug,
        status: nextStatus,
        content: cleanContent,
        content_id: cleanContentId,
      }));
      setUpdatedAt(data?.updated_at ?? new Date().toISOString());
      setPublishedAt(data?.published_at ?? nextPublishedAt);

      if (nextStatus === "published") {
        alert("Blog published successfully.");
      } else if (form.status === "published") {
        alert("Blog moved back to draft.");
      } else {
        alert("Draft saved successfully.");
      }
    } catch (error: any) {
      console.error("Failed to save blog:", error);
      alert(error?.message || "Failed to save blog.");
    } finally {
      setSavingDraft(false);
      setPublishing(false);
      setUnpublishing(false);
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      "Are you sure you want to delete this blog?"
    );
    if (!confirmed) return;

    setDeleting(true);

    try {
      const { error } = await supabase.from("blogs").delete().eq("id", blogId);
      if (error) throw error;

      alert("Blog deleted successfully.");
      router.push("/admindashboard/blogs");
    } catch (error: any) {
      console.error("Failed to delete blog:", error);
      alert(error?.message || "Failed to delete blog.");
    } finally {
      setDeleting(false);
    }
  }

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
      <span>{form.access_type === "paid_agent" ? "Paid Agent Only" : "Public"}</span>
    </div>
  );

  if (loadingBlog) {
    return (
      <div className="rounded-3xl border border-gray-200 bg-white p-6 text-sm text-gray-500 shadow-sm">
        Loading blog...
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-[#1C1C1E]">Blog not found</h1>
        <p className="mt-2 text-sm text-gray-500">
          The blog you are trying to edit does not exist or cannot be loaded.
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
                Edit Blog
              </h1>
              <p className="text-xs text-gray-500 sm:text-sm">
                Update English and Indonesian blog content for Tetamo.
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
              {form.status === "published"
                ? publishing
                  ? "Updating..."
                  : "Update Published"
                : publishing
                  ? "Publishing..."
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
                <h2 className="text-lg font-bold text-[#1C1C1E]">English Version</h2>

                <div className="mt-4">
                  <FieldLabel required>English Title</FieldLabel>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => {
                      updateField("title", e.target.value);
                      updateField("slug", slugify(e.target.value));
                    }}
                    placeholder="Edit English title"
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
                  <FieldLabel required>English Content</FieldLabel>
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
                  Indonesian Version
                </h2>

                <div className="mt-4">
                  <FieldLabel required>Indonesian Title</FieldLabel>
                  <InputBase
                    type="text"
                    value={form.title_id}
                    onChange={(e) => updateField("title_id", e.target.value)}
                    placeholder="Ubah judul Bahasa Indonesia"
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
                  <FieldLabel required>Indonesian Content</FieldLabel>
                  <TiptapBlogEditor
                    content={form.content_id}
                    onChange={(html) => updateField("content_id", html)}
                    placeholder="Mulai tulis blog Bahasa Indonesia di sini..."
                    onUploadImage={() => bodyImageInputRef.current?.click()}
                  />
                </div>
              </div>
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
                    {previewTitle || "Untitled blog"}
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
                        "<p style='color:#9ca3af;'>No content yet.</p>",
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <aside className="space-y-6">
          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-bold text-[#1C1C1E]">Publish Settings</h2>

            <div className="mt-5 space-y-5">
              <div>
                <FieldLabel required>Slug</FieldLabel>
                <InputBase
                  type="text"
                  value={form.slug}
                  onChange={(e) => updateField("slug", slugify(e.target.value))}
                  placeholder="blog-slug"
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
                <FieldLabel required>Category</FieldLabel>
                <SelectBase
                  value={form.category}
                  onChange={(e) => updateField("category", e.target.value)}
                  disabled={loadingCategories}
                >
                  <option value="">
                    {loadingCategories ? "Loading categories..." : "Select category"}
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

              <div className="rounded-2xl border border-gray-200 bg-[#FAFAF8] p-4 text-sm text-gray-600">
                <div className="flex items-center justify-between gap-3">
                  <span>Status</span>
                  <span className="font-semibold text-[#1C1C1E]">
                    {form.status === "published" ? "Published" : "Draft"}
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <span>Created</span>
                  <span className="text-right">{formatDateTime(createdAt)}</span>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <span>Updated</span>
                  <span className="text-right">{formatDateTime(updatedAt)}</span>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <span>Published</span>
                  <span className="text-right">{formatDateTime(publishedAt)}</span>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <span>Views</span>
                  <span className="font-semibold text-[#1C1C1E]">{viewCount}</span>
                </div>
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