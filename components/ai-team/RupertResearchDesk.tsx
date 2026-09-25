"use client";

import {
  useState,
} from "react";

import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Search,
} from "lucide-react";

import {
  supabase,
} from "@/lib/supabase";

type ResearchFinding = {
  statement: string;
  sourceUrls: string[];
  confidence:
    | "high"
    | "medium"
    | "low";
};

type ResearchSource = {
  url: string;
  title: string;
  domain: string;
};

type ResearchReport = {
  id: string;
  title: string;
  summary: string;
  findings: ResearchFinding[];
  recommendations: string[];
  warnings: string[];
  sources: ResearchSource[];
  researchedAt: string;
};

type ResearchResponse = {
  ok: boolean;
  report?: ResearchReport;
  error?: string;
};

type BlogDraftResult = {
  id: string;
  title: string;
  titleId: string;
  slug: string;
  status: string;
  accessType: string;
  contentHash: string;
  updatedAt: string;
};

type BlogDraftResponse = {
  ok: boolean;

  blog?: BlogDraftResult;

  approval?: {
    id: string;
    status: string;
    executionStatus: string;
  };

  existing?: {
    approvalId: string;
    status: string;
    blogId: string | null;
  };

  error?: string;
};

function confidenceClasses(
  confidence: ResearchFinding["confidence"]
) {
  switch (confidence) {
    case "high":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "medium":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "low":
      return "border-red-200 bg-red-50 text-red-700";
  }
}

export function RupertResearchDesk() {
  const [
    topic,
    setTopic,
  ] = useState("");

  const [
    context,
    setContext,
  ] = useState("");

  const [
    researching,
    setResearching,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    report,
    setReport,
  ] =
    useState<ResearchReport | null>(
      null
    );

  const [
    creatingDraft,
    setCreatingDraft,
  ] = useState(false);

  const [
    draftError,
    setDraftError,
  ] = useState("");

  const [
    draftResult,
    setDraftResult,
  ] =
    useState<BlogDraftResult | null>(
      null
    );

  async function runResearch() {
    const cleanTopic =
      topic.trim();

    if (!cleanTopic) {
      setError(
        "Enter a research topic first."
      );

      return;
    }

    try {
      setResearching(true);
      setError("");
      setReport(null);
      setDraftError("");
      setDraftResult(null);

      const {
        data: {
          session,
        },
        error:
          sessionError,
      } =
        await supabase.auth
          .getSession();

      if (sessionError) {
        throw sessionError;
      }

      if (
        !session?.access_token
      ) {
        throw new Error(
          "Admin session not found. Please log in again."
        );
      }

      const response =
        await fetch(
          "/api/admin/ai-team/rupert/research",
          {
            method: "POST",

            headers: {
              Authorization:
                `Bearer ${session.access_token}`,

              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                topic:
                  cleanTopic,

                context:
                  context.trim() ||
                  null,
              }),
          }
        );

      const payload =
        (await response.json()) as ResearchResponse;

      if (
        !response.ok ||
        !payload.ok ||
        !payload.report
      ) {
        throw new Error(
          payload.error ||
          "Rupert's research failed."
        );
      }

      setReport(
        payload.report
      );
    } catch (err) {
      console.error(
        "Rupert Research Desk failed:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Rupert's research failed."
      );
    } finally {
      setResearching(false);
    }
  }

  async function createBlogDraft() {
    if (!report?.id) {
      setDraftError(
        "A saved Rupert research report is required first."
      );

      return;
    }

    try {
      setCreatingDraft(true);
      setDraftError("");

      const {
        data: {
          session,
        },
        error:
          sessionError,
      } =
        await supabase.auth
          .getSession();

      if (sessionError) {
        throw sessionError;
      }

      if (
        !session?.access_token
      ) {
        throw new Error(
          "Admin session not found. Please log in again."
        );
      }

      const response =
        await fetch(
          "/api/admin/ai-team/rupert/blog-draft",
          {
            method: "POST",

            headers: {
              Authorization:
                `Bearer ${session.access_token}`,

              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                reportId:
                  report.id,
              }),
          }
        );

      const payload =
        (await response.json()) as BlogDraftResponse;

      /*
       * If Rupert already created a
       * draft from this exact research
       * report, do not create another.
       * Surface the existing draft.
       */
      if (
        response.status === 409 &&
        payload.existing?.blogId
      ) {
        setDraftResult({
          id:
            payload.existing.blogId,

          title:
            "Existing Rupert blog draft",

          titleId:
            "",

          slug:
            "",

          status:
            "draft",

          accessType:
            "public",

          contentHash:
            "",

          updatedAt:
            "",
        });

        setDraftError(
          "Rupert already created a blog draft from this research report."
        );

        return;
      }

      if (
        !response.ok ||
        !payload.ok ||
        !payload.blog
      ) {
        throw new Error(
          payload.error ||
          "Rupert could not create the blog draft."
        );
      }

      setDraftResult(
        payload.blog
      );
    } catch (err) {
      console.error(
        "Rupert blog draft creation failed:",
        err
      );

      setDraftError(
        err instanceof Error
          ? err.message
          : "Rupert could not create the blog draft."
      );
    } finally {
      setCreatingDraft(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100">
            <BookOpen className="h-5 w-5 text-[#1C1C1E]" />
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">
              Rupert Workspace
            </p>

            <h2 className="mt-1 text-xl font-semibold text-[#1C1C1E]">
              Research Desk
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500">
              Rupert researches the live public web,
              checks source quality, separates facts from
              recommendations and saves the research into
              Tetamo&apos;s internal AI reports.
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="rupert-research-topic"
              className="text-xs font-semibold text-gray-700"
            >
              Research topic
            </label>

            <textarea
              id="rupert-research-topic"
              value={topic}
              onChange={(event) =>
                setTopic(
                  event.target.value
                )
              }
              rows={3}
              placeholder="Example: What questions are property owners in Indonesia asking about listing their property online?"
              className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-sm text-[#1C1C1E] outline-none transition focus:border-gray-400"
            />
          </div>

          <div>
            <label
              htmlFor="rupert-research-context"
              className="text-xs font-semibold text-gray-700"
            >
              Additional Tetamo context
              <span className="ml-1 font-normal text-gray-400">
                optional
              </span>
            </label>

            <textarea
              id="rupert-research-context"
              value={context}
              onChange={(event) =>
                setContext(
                  event.target.value
                )
              }
              rows={3}
              placeholder="Audience, geography, campaign goal, content idea or anything Rupert should consider."
              className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-sm text-[#1C1C1E] outline-none transition focus:border-gray-400"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() =>
                void runResearch()
              }
              disabled={
                researching ||
                !topic.trim()
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1C1C1E] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              {researching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}

              {researching
                ? "Rupert is researching..."
                : "Research Web"}
            </button>

            <p className="text-xs text-gray-400">
              Research only — nothing is published.
            </p>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

            <div>
              <p className="font-semibold text-red-800">
                Rupert could not complete this research
              </p>

              <p className="mt-1 text-sm leading-6 text-red-700">
                {error}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {report ? (
        <>
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">
                  Research Report
                </p>

                <h3 className="mt-1 text-lg font-semibold text-[#1C1C1E]">
                  {report.title}
                </h3>
              </div>

              <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Saved
              </div>
            </div>

            <p className="mt-4 text-sm leading-7 text-gray-600">
              {report.summary}
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-5">
              <button
                type="button"
                onClick={() =>
                  void createBlogDraft()
                }
                disabled={
                  creatingDraft ||
                  Boolean(draftResult)
                }
                className="inline-flex items-center gap-2 rounded-xl bg-[#1C1C1E] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                {creatingDraft ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <BookOpen className="h-4 w-4" />
                )}

                {creatingDraft
                  ? "Rupert is drafting..."
                  : draftResult
                    ? "Blog Draft Created"
                    : "Create Blog Draft"}
              </button>

              <p className="text-xs text-gray-400">
                EN/ID draft only — nothing is published.
              </p>
            </div>
          </div>

          {draftError ? (
            <div
              className={`rounded-2xl border p-5 ${
                draftResult
                  ? "border-amber-200 bg-amber-50"
                  : "border-red-200 bg-red-50"
              }`}
            >
              <div className="flex items-start gap-3">
                <AlertTriangle
                  className={`mt-0.5 h-5 w-5 shrink-0 ${
                    draftResult
                      ? "text-amber-700"
                      : "text-red-600"
                  }`}
                />

                <p
                  className={`text-sm leading-6 ${
                    draftResult
                      ? "text-amber-800"
                      : "text-red-700"
                  }`}
                >
                  {draftError}
                </p>
              </div>
            </div>
          ) : null}

          {draftResult ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-700" />

                    <p className="font-semibold text-emerald-900">
                      Blog draft created
                    </p>
                  </div>

                  <p className="mt-2 text-sm font-medium text-emerald-900">
                    {draftResult.title}
                  </p>

                  <p className="mt-1 text-xs text-emerald-700">
                    Draft only · Awaiting your approval
                  </p>
                </div>

                <a
                  href={`/admindashboard/blogs/${draftResult.id}/edit`}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100"
                >
                  Open in Blog Manager

                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          ) : null}

          {report.warnings?.length ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />

                <div>
                  <p className="font-semibold text-amber-900">
                    Research warnings
                  </p>

                  <div className="mt-2 space-y-2">
                    {report.warnings.map(
                      (
                        warning,
                        index
                      ) => (
                        <p
                          key={`${warning}-${index}`}
                          className="text-sm leading-6 text-amber-800"
                        >
                          {warning}
                        </p>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-semibold text-[#1C1C1E]">
              Findings
            </h3>

            <div className="mt-4 space-y-4">
              {report.findings.length ? (
                report.findings.map(
                  (
                    finding,
                    index
                  ) => (
                    <div
                      key={`${finding.statement}-${index}`}
                      className="rounded-xl border border-gray-100 bg-gray-50 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <p className="max-w-3xl text-sm leading-6 text-gray-700">
                          {finding.statement}
                        </p>

                        <span
                          className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold capitalize ${confidenceClasses(
                            finding.confidence
                          )}`}
                        >
                          {finding.confidence}
                        </span>
                      </div>
                    </div>
                  )
                )
              ) : (
                <p className="text-sm text-gray-500">
                  Rupert did not retain any sufficiently
                  sourced factual findings.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-semibold text-[#1C1C1E]">
              Rupert&apos;s recommendations
            </h3>

            <div className="mt-4 space-y-3">
              {report.recommendations.length ? (
                report.recommendations.map(
                  (
                    recommendation,
                    index
                  ) => (
                    <div
                      key={`${recommendation}-${index}`}
                      className="flex gap-3 text-sm leading-6 text-gray-600"
                    >
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-400" />

                      <p>
                        {recommendation}
                      </p>
                    </div>
                  )
                )
              ) : (
                <p className="text-sm text-gray-500">
                  No recommendations were produced.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-semibold text-[#1C1C1E]">
              Sources
            </h3>

            <p className="mt-1 text-xs text-gray-500">
              Sources consulted during this research run.
            </p>

            <div className="mt-4 space-y-3">
              {report.sources.map(
                (
                  source,
                  index
                ) => (
                  <a
                    key={`${source.url}-${index}`}
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-start justify-between gap-4 rounded-xl border border-gray-100 p-3 transition hover:bg-gray-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[#1C1C1E]">
                        {source.title}
                      </p>

                      <p className="mt-1 truncate text-xs text-gray-400">
                        {source.domain}
                      </p>
                    </div>

                    <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                  </a>
                )
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
