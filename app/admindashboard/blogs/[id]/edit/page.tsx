"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

/* =========================
TYPES
========================= */

type BlogStatus = "draft" | "published";
type BlogAccessType = "public" | "paid_agent";

type BlogForm = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  author_name: string;
  cover_image_url: string;
  status: BlogStatus;
  access_type: BlogAccessType;
};

/* =========================
HELPERS
========================= */

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
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
    <select
      {...props}
      className={`w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-[#1C1C1E] ${
        props.className ?? ""
      }`}
    />
  );
}

function TextareaBase(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>
) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none placeholder-gray-400 focus:border-[#1C1C1E] ${
        props.className ?? ""
      }`}
    />
  );
}

/* =========================
PAGE
========================= */

export default function AdminEditBlogPage() {
  const router = useRouter();
  const params = useParams();

  const blogId =
    typeof params?.id === "string"
      ? params.id
      : Array.isArray(params?.id)
        ? params.id[0]
        : "";

  const [form, setForm] = useState<BlogForm>({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    category: "",
    author_name: "Tetamo Editorial",
    cover_image_url: "",
    status: "draft",
    access_type: "public",
  });

  const [slugTouched, setSlugTouched] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function loadBlog() {
      if (!blogId) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setLoading(true);

      const { data, error } = await supabase
        .from("blogs")
        .select(`
          id,
          title,
          slug,
          excerpt,
          content,
          category,
          author_name,
          cover_image_url,
          status,
          access_type
        `)
        .eq("id", blogId)
        .single();

      if (ignore) return;

      if (error || !data) {
        console.error("Failed to load blog:", error);
        setNotFound(true);
        setLoading(false);
        return;
      }

      setForm({
        title: data.title ?? "",
        slug: data.slug ?? "",
        excerpt: data.excerpt ?? "",
        content: data.content ?? "",
        category: data.category ?? "",
        author_name: data.author_name ?? "Tetamo Editorial",
        cover_image_url: data.cover_image_url ?? "",
        status: (data.status as BlogStatus) ?? "draft",
        access_type: (data.access_type as BlogAccessType) ?? "public",
      });

      setLoading(false);
    }

    loadBlog();

    return () => {
      ignore = true;
    };
  }, [blogId]);

  useEffect(() => {
    if (!slugTouched) {
      setForm((prev) => ({
        ...prev,
        slug: slugify(prev.title),
      }));
    }
  }, [form.title, slugTouched]);

  const blogUrlPreview = useMemo(() => {
    if (!form.slug) return "/blog/[slug]";
    return `/blog/${form.slug}`;
  }, [form.slug]);

  function updateField<K extends keyof BlogForm>(key: K, value: BlogForm[K]) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    const cleanTitle = form.title.trim();
    const cleanSlug = slugify(form.slug || form.title);
    const cleanExcerpt = form.excerpt.trim();
    const cleanContent = form.content.trim();
    const cleanCategory = form.category.trim();
    const cleanAuthor = form.author_name.trim() || "Tetamo Editorial";
    const cleanCover = form.cover_image_url.trim();

    if (!cleanTitle) {
      alert("Title is required.");
      return;
    }

    if (!cleanSlug) {
      alert("Slug is required.");
      return;
    }

    if (!cleanContent) {
      alert("Content is required.");
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user?.id) {
        alert("Please log in first.");
        setSaving(false);
        return;
      }

      const publishedAt =
        form.status === "published" ? new Date().toISOString() : null;

      const { error } = await supabase
        .from("blogs")
        .update({
          title: cleanTitle,
          slug: cleanSlug,
          excerpt: cleanExcerpt || null,
          content: cleanContent,
          category: cleanCategory || null,
          author_name: cleanAuthor,
          cover_image_url: cleanCover || null,
          status: form.status,
          access_type: form.access_type,
          published_at: publishedAt,
          updated_by: user.id,
        })
        .eq("id", blogId);

      if (error) throw error;

      alert("Blog updated successfully.");

      setForm((prev) => ({
        ...prev,
        slug: cleanSlug,
      }));
    } catch (error: any) {
      console.error("Failed to update blog:", error);
      alert(error?.message || "Failed to update blog.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!blogId) return;

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

  if (loading) {
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
    <div>
      {/* Header */}

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1C1C1E]">Edit Blog</h1>
          <p className="text-sm text-gray-500">
            Update blog public atau paid agent Tetamo.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/admindashboard/blogs"
            className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-semibold text-[#1C1C1E] hover:bg-gray-50"
          >
            Back
          </Link>

          <Link
            href={blogUrlPreview}
            target="_blank"
            className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-semibold text-[#1C1C1E] hover:bg-gray-50"
          >
            View Public
          </Link>

          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting || saving}
            className="rounded-xl border border-red-300 px-5 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>

          <button
            type="submit"
            form="edit-blog-form"
            disabled={saving || deleting}
            className="rounded-xl bg-[#1C1C1E] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Form */}

      <form id="edit-blog-form" onSubmit={handleSave} className="space-y-6">
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div className="lg:col-span-2">
              <FieldLabel required>Title</FieldLabel>
              <InputBase
                type="text"
                value={form.title}
                onChange={(e) => updateField("title", e.target.value)}
                placeholder="Enter blog title"
              />
            </div>

            <div>
              <FieldLabel required>Slug</FieldLabel>
              <InputBase
                type="text"
                value={form.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  updateField("slug", slugify(e.target.value));
                }}
                placeholder="blog-slug"
              />
              <p className="mt-2 text-xs text-gray-500">
                Public URL:{" "}
                <span className="font-medium text-gray-700">{blogUrlPreview}</span>
              </p>
            </div>

            <div>
              <FieldLabel>Category</FieldLabel>
              <InputBase
                type="text"
                value={form.category}
                onChange={(e) => updateField("category", e.target.value)}
                placeholder="Investment, Tips, Market Insight..."
              />
            </div>

            <div>
              <FieldLabel>Author</FieldLabel>
              <InputBase
                type="text"
                value={form.author_name}
                onChange={(e) => updateField("author_name", e.target.value)}
                placeholder="Tetamo Editorial"
              />
            </div>

            <div>
              <FieldLabel>Status</FieldLabel>
              <SelectBase
                value={form.status}
                onChange={(e) =>
                  updateField("status", e.target.value as BlogStatus)
                }
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
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

            <div className="lg:col-span-2">
              <FieldLabel>Cover Image URL</FieldLabel>
              <InputBase
                type="text"
                value={form.cover_image_url}
                onChange={(e) =>
                  updateField("cover_image_url", e.target.value)
                }
                placeholder="https://..."
              />
            </div>

            <div className="lg:col-span-2">
              <FieldLabel>Excerpt</FieldLabel>
              <TextareaBase
                rows={4}
                value={form.excerpt}
                onChange={(e) => updateField("excerpt", e.target.value)}
                placeholder="Short summary for blog card / preview..."
              />
            </div>

            <div className="lg:col-span-2">
              <FieldLabel required>Content</FieldLabel>
              <TextareaBase
                rows={16}
                value={form.content}
                onChange={(e) => updateField("content", e.target.value)}
                placeholder="Write the full blog content here..."
              />
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}