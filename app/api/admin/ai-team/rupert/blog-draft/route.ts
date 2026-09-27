import {
  createHash,
  randomUUID,
} from "node:crypto";

import {
  aiTeamSupabaseAdmin,
  requireTetamoAdminOrCron,
} from "@/lib/ai-team/core/admin-auth";

import {
  draftBlogWithRupert,
  type RupertBlogSource,
} from "@/lib/ai-team/agents/rupert-blog";

import {
  generateRupertEditorialImage,
} from "@/lib/ai-team/agents/rupert-images";

import {
  requireAgentPermission,
} from "@/lib/ai-team/permissions/agent-permissions";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

export const maxDuration =
  300;

type RequestBody = {
  reportId?: unknown;
};

function cleanString(
  value: unknown
) {
  return typeof value ===
    "string"
    ? value.trim()
    : "";
}

function asRecord(
  value: unknown
): Record<string, unknown> {
  return value &&
    typeof value ===
      "object" &&
    !Array.isArray(value)
    ? value as Record<
        string,
        unknown
      >
    : {};
}

function slugify(
  value: string
) {
  /*
   * Exact same slug logic as
   * Tetamo Blog Manager.
   */
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(
      /[^a-z0-9]+/g,
      "-"
    )
    .replace(
      /^-+|-+$/g,
      ""
    );
}

function isUuid(
  value: string
) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function normalizeSources(
  value: unknown
): RupertBlogSource[] {
  if (
    !Array.isArray(value)
  ) {
    return [];
  }

  const sources:
    RupertBlogSource[] =
      [];

  for (
    const item of value
  ) {
    const row =
      asRecord(item);

    const url =
      cleanString(
        row.url
      );

    if (!url) {
      continue;
    }

    sources.push({
      url,

      title:
        cleanString(
          row.title
        ) ||
        cleanString(
          row.domain
        ) ||
        url,

      domain:
        cleanString(
          row.domain
        ),
    });
  }

  return sources;
}

function escapeHtmlAttribute(
  value: string
) {
  return value
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    );
}

function replaceImageMarker(
  html: string,
  marker: string,
  url: string,
  alt: string
) {
  const token =
    `<!--${marker}-->`;

  if (
    !html.includes(token)
  ) {
    throw new Error(
      `Body image marker ${marker} is missing.`
    );
  }

  return html.replace(
    token,
    `<figure><img src="${escapeHtmlAttribute(
      url
    )}" alt="${escapeHtmlAttribute(
      alt
    )}" /></figure>`
  );
}

function nextMorningWita() {
  /*
   * Deterministic fallback:
   * next calendar day at
   * 10:00 WITA (UTC+8).
   */
  const now =
    new Date();

  const local =
    new Date(
      now.getTime() +
      8 * 60 * 60 * 1000
    );

  local.setUTCDate(
    local.getUTCDate() + 1
  );

  local.setUTCHours(
    10,
    0,
    0,
    0
  );

  return new Date(
    local.getTime() -
    8 * 60 * 60 * 1000
  ).toISOString();
}

function resolveProposedPublishAt(
  candidate: string
) {
  const date =
    new Date(candidate);

  if (
    Number.isNaN(
      date.getTime()
    ) ||
    date.getTime() <=
      Date.now()
  ) {
    return nextMorningWita();
  }

  return date.toISOString();
}

async function getAvailableSlug(
  title: string
) {
  const base =
    slugify(title) ||
    "tetamo-blog";

  for (
    let number = 1;
    number <= 100;
    number += 1
  ) {
    const candidate =
      number === 1
        ? base
        : `${base}-${number}`;

    const {
      data,
      error,
    } =
      await aiTeamSupabaseAdmin
        .from("blogs")
        .select("id")
        .eq(
          "slug",
          candidate
        )
        .limit(1)
        .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return candidate;
    }
  }

  throw new Error(
    "Unable to create a unique blog slug."
  );
}

function createContentHash(
  value: unknown
) {
  return createHash("sha256")
    .update(
      JSON.stringify(value)
    )
    .digest("hex");
}

export async function POST(
  req: Request
) {
  const auth =
    await requireTetamoAdminOrCron(
      req
    );

  if (
    !auth.authorized
  ) {
    return auth.response;
  }

  let body:
    RequestBody;

  try {
    body =
      await req.json();
  } catch {
    return Response.json(
      {
        ok: false,
        error:
          "Invalid request body.",
      },
      {
        status: 400,
      }
    );
  }

  const reportId =
    cleanString(
      body.reportId
    );

  if (!reportId) {
    return Response.json(
      {
        ok: false,
        error:
          "Research report ID is required.",
      },
      {
        status: 400,
      }
    );
  }

  if (
    !isUuid(reportId)
  ) {
    return Response.json(
      {
        ok: false,
        error:
          "Research report ID is invalid.",
      },
      {
        status: 400,
      }
    );
  }

  try {
    requireAgentPermission(
      "rupert",
      "draft_content"
    );

    requireAgentPermission(
      "rupert",
      "request_approval"
    );
  } catch (error) {
    return Response.json(
      {
        ok: false,

        error:
          error instanceof Error
            ? error.message
            : "Rupert permission denied.",
      },
      {
        status: 403,
      }
    );
  }

  const {
    data: rupert,
    error:
      rupertError,
  } =
    await aiTeamSupabaseAdmin
      .from("ai_agents")
      .select(
        "id, agent_key, display_name, role_title"
      )
      .eq(
        "agent_key",
        "rupert"
      )
      .maybeSingle();

  if (
    rupertError ||
    !rupert
  ) {
    console.error(
      "Rupert blog agent lookup failed:",
      rupertError
    );

    return Response.json(
      {
        ok: false,
        error:
          "Unable to load Rupert's AI Team profile.",
      },
      {
        status: 500,
      }
    );
  }

  const {
    data:
      existingApproval,
    error:
      existingApprovalError,
  } =
    await aiTeamSupabaseAdmin
      .from("ai_approvals")
      .select(
        "id, status, requested_payload"
      )
      .eq(
        "requested_by_agent_id",
        rupert.id
      )
      .in(
        "status",
        [
          "pending",
          "approved",
        ]
      )
      .contains(
        "requested_payload",
        {
          content_type:
            "blog",

          research_report_id:
            reportId,
        }
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      )
      .limit(1)
      .maybeSingle();

  if (
    existingApprovalError
  ) {
    console.error(
      "Rupert duplicate draft check failed:",
      existingApprovalError
    );

    return Response.json(
      {
        ok: false,

        error:
          "Unable to verify existing Rupert drafts.",
      },
      {
        status: 500,
      }
    );
  }

  if (
    existingApproval
  ) {
    const payload =
      asRecord(
        existingApproval
          .requested_payload
      );

    return Response.json(
      {
        ok: false,

        error:
          "Rupert already has an active blog approval for this research report.",

        existing: {
          approvalId:
            existingApproval.id,

          status:
            existingApproval.status,

          blogId:
            cleanString(
              payload.blog_id
            ) ||
            null,
        },
      },
      {
        status: 409,
      }
    );
  }

  const {
    data: report,
    error:
      reportError,
  } =
    await aiTeamSupabaseAdmin
      .from("ai_reports")
      .select(
        "id, agent_id, report_type, title, summary, findings, recommendations, source_data, created_at"
      )
      .eq(
        "id",
        reportId
      )
      .maybeSingle();

  if (
    reportError
  ) {
    console.error(
      "Rupert research report lookup failed:",
      reportError
    );

    return Response.json(
      {
        ok: false,
        error:
          "Unable to load Rupert's research report.",
      },
      {
        status: 500,
      }
    );
  }

  if (!report) {
    return Response.json(
      {
        ok: false,
        error:
          "Research report not found.",
      },
      {
        status: 404,
      }
    );
  }

  if (
    report.agent_id !==
      rupert.id ||
    report.report_type !==
      "content"
  ) {
    return Response.json(
      {
        ok: false,

        error:
          "This report is not a Rupert content research report.",
      },
      {
        status: 409,
      }
    );
  }

  const sourceData =
    asRecord(
      report.source_data
    );

  if (
    cleanString(
      sourceData
        .research_kind
    ) !==
    "public_web"
  ) {
    return Response.json(
      {
        ok: false,

        error:
          "This report is not a public-web research report.",
      },
      {
        status: 409,
      }
    );
  }

  /*
   * Historical research reports may be preserved for audit
   * while being explicitly barred from content production.
   *
   * Never draft from a report that later failed a stronger
   * evidence or quality review.
   */
  if (
    sourceData
      .content_eligible ===
      false ||
    sourceData
      .superseded_for_content ===
      true
  ) {
    return Response.json(
      {
        ok: false,

        error:
          "This research report is preserved for audit but is not eligible for content production.",
      },
      {
        status: 409,
      }
    );
  }

  const topic =
    cleanString(
      sourceData.topic
    ) ||
    report.title;

  const warnings =
    Array.isArray(
      sourceData.warnings
    )
      ? sourceData
          .warnings
          .map(
            cleanString
          )
          .filter(Boolean)
      : [];

  const sources =
    normalizeSources(
      sourceData.sources
    );

  if (
    sources.length === 0
  ) {
    return Response.json(
      {
        ok: false,

        error:
          "Rupert's research report has no retained sources.",
      },
      {
        status: 409,
      }
    );
  }

  const taskId =
    cleanString(
      sourceData.task_id
    );

  const bindingConstraints:
    string[] = [];

  /*
   * Protected Lola -> Rupert inquiry content must prove that
   * this exact research report is the task's CURRENT eligible
   * report before any blog draft is generated.
   *
   * This does not change Rupert's existing general research
   * workflow. It applies only when the linked task itself is a
   * rupert_lola_handoff task.
   */
  if (
    taskId &&
    isUuid(taskId)
  ) {
    const {
      data:
        linkedTask,
      error:
        linkedTaskError,
    } =
      await aiTeamSupabaseAdmin
        .from(
          "ai_tasks"
        )
        .select(
          [
            "id",
            "status",
            "source_type",
            "assigned_to_agent_id",
            "metadata",
          ].join(",")
        )
        .eq(
          "id",
          taskId
        )
        .maybeSingle();

    if (linkedTaskError) {
      console.error(
        "Rupert protected draft task verification failed:",
        linkedTaskError
      );

      return Response.json(
        {
          ok: false,
          error:
            "Unable to verify Rupert's linked research task.",
        },
        {
          status: 500,
        }
      );
    }

    if (!linkedTask) {
      return Response.json(
        {
          ok: false,
          error:
            "The research report's linked task no longer exists.",
        },
        {
          status: 409,
        }
      );
    }

    const verifiedLinkedTask =
      linkedTask as unknown as {
        id: string;
        status: string;
        source_type: string | null;
        assigned_to_agent_id:
          string | null;
        metadata:
          Record<string, unknown> |
          null;
      };

    if (
      verifiedLinkedTask
        .assigned_to_agent_id !==
        rupert.id
    ) {
      return Response.json(
        {
          ok: false,
          error:
            "This research report is not linked to a task assigned to Rupert.",
        },
        {
          status: 409,
        }
      );
    }

    const linkedTaskMetadata =
      asRecord(
        verifiedLinkedTask.metadata
      );

    /*
     * Founder rejection feedback from a previous draft is a
     * binding redraft instruction for every Rupert task type.
     *
     * This lets ordinary weekly blogs and protected inquiry
     * content use the same correction mechanism.
     */
    const founderRedraftFeedback =
      cleanString(
        linkedTaskMetadata
          .last_content_rejection_reason
      );

    if (
      founderRedraftFeedback
    ) {
      bindingConstraints.push(
        `Founder redraft feedback: ${founderRedraftFeedback}`
      );
    }

    if (
      verifiedLinkedTask.source_type ===
        "rupert_lola_handoff"
    ) {
      const founderClarificationText =
        cleanString(
          linkedTaskMetadata
            .founder_clarification_text
        );

      if (
        founderClarificationText
      ) {
        bindingConstraints.push(
          founderClarificationText
        );
      }

      const protectedReportValid =
        sourceData
          .protected_inquiry_research ===
          true &&
        sourceData
          .content_eligible ===
          true &&
        sourceData
          .founder_clarification_verified ===
          true &&
        cleanString(
          sourceData
            .customer_intent_scope
        ).toLowerCase() ===
          "founder_clarified" &&
        cleanString(
          sourceData
            .quality_review_state
        ) ===
          "passed" &&
        cleanString(
          sourceData
            .post_research_disposition
        ) ===
          "content_may_proceed";

      const protectedTaskValid =
        verifiedLinkedTask.status ===
          "in_progress" &&
        cleanString(
          linkedTaskMetadata
            .customer_intent_scope
        ).toLowerCase() ===
          "founder_clarified" &&
        linkedTaskMetadata
          .content_eligible ===
          true &&
        cleanString(
          linkedTaskMetadata
            .current_research_report_id
        ) ===
          report.id &&
        cleanString(
          linkedTaskMetadata
            .quality_review_state
        ) ===
          "passed" &&
        cleanString(
          linkedTaskMetadata
            .post_research_disposition
        ) ===
          "content_may_proceed";

      if (
        !protectedReportValid ||
        !protectedTaskValid
      ) {
        return Response.json(
          {
            ok: false,
            error:
              "This protected inquiry research report is not the current verified draft-eligible report for its Rupert task.",
          },
          {
            status: 409,
          }
        );
      }
    }
  }

  const {
    data:
      categoryRows,
    error:
      categoryError,
  } =
    await aiTeamSupabaseAdmin
      .from(
        "blog_categories"
      )
      .select(
        "name, slug"
      )
      .eq(
        "is_active",
        true
      )
      .order(
        "name",
        {
          ascending: true,
        }
      );

  if (
    categoryError
  ) {
    console.error(
      "Rupert category lookup failed:",
      categoryError
    );

    return Response.json(
      {
        ok: false,

        error:
          "Unable to load Tetamo blog categories.",
      },
      {
        status: 500,
      }
    );
  }

  const uploadedPaths:
    string[] = [];

  let createdBlogId:
    string | null =
      null;

  try {
    const generated =
      await draftBlogWithRupert(
        {
          reportId:
            report.id,

          topic,

          summary:
            report.summary,

          findings:
            Array.isArray(
              report.findings
            )
              ? report.findings
              : [],

          recommendations:
            Array.isArray(
              report.recommendations
            )
              ? report
                  .recommendations
              : [],

          warnings,

          sources,

          bindingConstraints,
        },
        {
          categories:
            (
              categoryRows ??
              []
            ).map(
              (category) => ({
                name:
                  category.name,

                slug:
                  category.slug,
              })
            ),

          nowIso:
            new Date()
              .toISOString(),

          timeZone:
            "Asia/Makassar",
        }
      );

    const slug =
      await getAvailableSlug(
        generated.title
      );

    const proposedPublishAt =
      resolveProposedPublishAt(
        generated
          .proposedPublishAt
      );

    /*
     * Generate cover + body
     * assets concurrently so the
     * drafting request does not
     * serialize several slow image
     * generations.
     */
    const [
      coverGenerated,
      ...bodyGenerated
    ] =
      await Promise.all([
        generateRupertEditorialImage({
          kind:
            "cover",

          prompt:
            generated
              .coverImage
              .prompt,

          articleTitle:
            generated.title,
        }),

        ...generated
          .bodyImages
          .map(
            (image) =>
              generateRupertEditorialImage(
                {
                  kind:
                    "body",

                  prompt:
                    image.prompt,

                  articleTitle:
                    generated.title,
                }
              )
          ),
      ]);

    async function uploadAsset(
      input: {
        folder:
          "cover" |
          "body";

        bytes:
          Buffer;

        contentType:
          string;

        extension:
          string;

        label:
          string;
      }
    ) {
      const path =
        `${input.folder}/${slug}-${input.label}-${randomUUID()}.${input.extension}`;

      const {
        error:
          uploadError,
      } =
        await aiTeamSupabaseAdmin
          .storage
          .from(
            "blog-images"
          )
          .upload(
            path,
            input.bytes,
            {
              cacheControl:
                "3600",

              contentType:
                input.contentType,

              upsert:
                false,
            }
          );

      if (
        uploadError
      ) {
        throw uploadError;
      }

      uploadedPaths.push(
        path
      );

      const {
        data,
      } =
        aiTeamSupabaseAdmin
          .storage
          .from(
            "blog-images"
          )
          .getPublicUrl(
            path
          );

      if (
        !data.publicUrl
      ) {
        throw new Error(
          `Unable to create public URL for ${path}.`
        );
      }

      return data.publicUrl;
    }

    const coverUrl =
      await uploadAsset({
        folder:
          "cover",

        bytes:
          coverGenerated
            .bytes,

        contentType:
          coverGenerated
            .contentType,

        extension:
          coverGenerated
            .extension,

        label:
          "rupert-cover",
      });

    const bodyAssets:
      Array<{
        marker: string;
        url: string;
        alt: string;
        altId: string;
        width: number;
        height: number;
      }> = [];

    for (
      let index = 0;
      index <
      bodyGenerated.length;
      index += 1
    ) {
      const generatedImage =
        bodyGenerated[index];

      const plan =
        generated
          .bodyImages[index];

      const url =
        await uploadAsset({
          folder:
            "body",

          bytes:
            generatedImage
              .bytes,

          contentType:
            generatedImage
              .contentType,

          extension:
            generatedImage
              .extension,

          label:
            `rupert-body-${index + 1}`,
        });

      bodyAssets.push({
        marker:
          plan.marker,

        url,

        alt:
          plan.alt,

        altId:
          plan.altId,

        width:
          generatedImage
            .width,

        height:
          generatedImage
            .height,
      });
    }

    let finalContent =
      generated
        .contentHtml;

    let finalContentId =
      generated
        .contentIdHtml;

    for (
      const asset of
        bodyAssets
    ) {
      finalContent =
        replaceImageMarker(
          finalContent,
          asset.marker,
          asset.url,
          asset.alt
        );

      finalContentId =
        replaceImageMarker(
          finalContentId,
          asset.marker,
          asset.url,
          asset.altId
        );
    }

    if (
      finalContent.includes(
        "RUPERT_BODY_IMAGE_"
      ) ||
      finalContentId.includes(
        "RUPERT_BODY_IMAGE_"
      )
    ) {
      throw new Error(
        "Rupert's final article still contains unresolved image markers."
      );
    }

    /*
     * Complete Blog Manager
     * publishing package.
     *
     * IMPORTANT:
     * status stays DRAFT.
     *
     * published_at stores Rupert's
     * proposed date so the existing
     * Publish Date control is already
     * populated for Kai to review.
     *
     * Public routes still require
     * status='published'.
     */
    const exactDraft = {
      title:
        generated.title,

      title_id:
        generated.titleId,

      slug,

      excerpt:
        generated.excerpt ||
        null,

      excerpt_id:
        generated.excerptId ||
        null,

      content:
        finalContent,

      content_id:
        finalContentId,

      category:
        generated.category ||
        null,

      author_name:
        "Rupert",

      access_type:
        generated
          .accessType,

      cover_image_url:
        coverUrl,

      published_at:
        proposedPublishAt,

      status:
        "draft" as const,
    };

    const contentHash =
      createContentHash(
        exactDraft
      );

    const {
      data: blog,
      error:
        blogError,
    } =
      await aiTeamSupabaseAdmin
        .from("blogs")
        .insert({
          ...exactDraft,

          created_by:
            auth.admin.userId,

          updated_by:
            auth.admin.userId,
        })
        .select(
          "id, title, title_id, slug, category, author_name, status, access_type, cover_image_url, published_at, updated_at, created_at"
        )
        .single();

    if (
      blogError ||
      !blog
    ) {
      throw (
        blogError ??
        new Error(
          "Rupert's complete blog draft was not saved."
        )
      );
    }

    createdBlogId =
      blog.id;

    const {
      data:
        approval,
      error:
        approvalError,
    } =
      await aiTeamSupabaseAdmin
        .from(
          "ai_approvals"
        )
        .insert({
          requested_by_agent_id:
            rupert.id,

          task_id:
            taskId &&
            isUuid(taskId)
              ? taskId
              : null,

          action_type:
            "publish_content",

          action_summary:
            `Review Rupert's complete blog package: ${blog.title}`,

          risk_level:
            "normal",

          status:
            "pending",

          requested_payload: {
            content_type:
              "blog",

            publish_action:
              "publish_blog",

            blog_id:
              blog.id,

            research_report_id:
              report.id,

            draft_updated_at:
              blog.updated_at,

            content_hash:
              contentHash,

            slug:
              blog.slug,

            title:
              blog.title,

            title_id:
              blog.title_id,

            writer:
              "Rupert",

            category:
              blog.category,

            access_type:
              blog.access_type,

            proposed_publish_at:
              blog.published_at,

            cover_image_url:
              blog
                .cover_image_url,

            cover_image: {
              url:
                coverUrl,

              alt:
                generated
                  .coverImage
                  .alt,

              alt_id:
                generated
                  .coverImage
                  .altId,

              width:
                coverGenerated
                  .width,

              height:
                coverGenerated
                  .height,

              model:
                coverGenerated
                  .model,
            },

            body_images:
              bodyAssets,

            research_topic:
              topic,

            source_count:
              sources.length,

            warning_count:
              warnings.length,
          },

          execution_status:
            "not_started",
        })
        .select(
          "id, status, execution_status, created_at"
        )
        .single();

    if (
      approvalError ||
      !approval
    ) {
      throw (
        approvalError ??
        new Error(
          "Rupert's approval request was not saved."
        )
      );
    }

    const {
      error:
        activityError,
    } =
      await aiTeamSupabaseAdmin
        .from(
          "ai_activity"
        )
        .insert({
          agent_id:
            rupert.id,

          actor_user_id:
            auth.admin.userId,

          event_type:
            "content",

          action:
            "created_complete_blog_draft_from_research",

          entity_type:
            "blog",

          entity_id:
            blog.id,

          task_id:
            taskId &&
            isUuid(taskId)
              ? taskId
              : null,

          severity:
            "info",

          details: {
            blog_id:
              blog.id,

            approval_id:
              approval.id,

            research_report_id:
              report.id,

            content_hash:
              contentHash,

            slug:
              blog.slug,

            status:
              "draft",

            writer:
              "Rupert",

            category:
              blog.category,

            access_type:
              blog.access_type,

            proposed_publish_at:
              blog.published_at,

            cover_generated:
              true,

            body_image_count:
              bodyAssets.length,

            image_model:
              "gpt-image-2",
          },
        });

    if (
      activityError
    ) {
      console.error(
        "Rupert complete blog activity log failed:",
        activityError
      );
    }

    if (
      taskId &&
      isUuid(taskId)
    ) {
      const {
        error:
          taskUpdateError,
      } =
        await aiTeamSupabaseAdmin
          .from(
            "ai_tasks"
          )
          .update({
            status:
              "awaiting_approval",

            requires_approval:
              true,

            result_summary:
              `Rupert prepared complete bilingual blog draft ${blog.id} with editorial images and publish settings; awaiting Founder approval.`,
          })
          .eq(
            "id",
            taskId
          )
          .eq(
            "assigned_to_agent_id",
            rupert.id
          );

      if (
        taskUpdateError
      ) {
        console.error(
          "Rupert task awaiting-approval update failed:",
          taskUpdateError
        );
      }
    }

    return Response.json({
      ok: true,

      blog: {
        id:
          blog.id,

        title:
          blog.title,

        titleId:
          blog.title_id,

        slug:
          blog.slug,

        status:
          blog.status,

        accessType:
          blog.access_type,

        category:
          blog.category,

        writer:
          blog.author_name,

        coverImageUrl:
          blog
            .cover_image_url,

        bodyImageCount:
          bodyAssets.length,

        proposedPublishAt:
          blog.published_at,

        contentHash,

        updatedAt:
          blog.updated_at,
      },

      approval: {
        id:
          approval.id,

        status:
          approval.status,

        executionStatus:
          approval
            .execution_status,
      },

      researchReportId:
        report.id,
    });
  } catch (error) {
    console.error(
      "Rupert complete blog draft creation failed:",
      error
    );

    /*
     * If a partial draft was created,
     * remove only this request's draft.
     */
    if (
      createdBlogId
    ) {
      const {
        error:
          cleanupBlogError,
      } =
        await aiTeamSupabaseAdmin
          .from(
            "blogs"
          )
          .delete()
          .eq(
            "id",
            createdBlogId
          );

      if (
        cleanupBlogError
      ) {
        console.error(
          "Rupert failed blog cleanup:",
          cleanupBlogError
        );
      }
    }

    /*
     * Remove only images uploaded by
     * this failed request.
     */
    if (
      uploadedPaths.length
    ) {
      const {
        error:
          cleanupImagesError,
      } =
        await aiTeamSupabaseAdmin
          .storage
          .from(
            "blog-images"
          )
          .remove(
            uploadedPaths
          );

      if (
        cleanupImagesError
      ) {
        console.error(
          "Rupert failed image cleanup:",
          cleanupImagesError
        );
      }
    }

    const errorMessage =
      error instanceof Error
        ? error.message
        : "Rupert could not prepare the complete blog package.";

    const isBindingSafetyFailure =
      errorMessage.startsWith(
        "Rupert final draft failed binding research safety validation:"
      );

    /*
     * A deterministic editorial-safety rejection is not a
     * transient infrastructure failure.
     *
     * Fail closed and stop autonomous retries. Preserve the
     * verified research report, but block this content task
     * until the Founder/Jake gives a narrower direction or
     * Rupert's drafting logic is improved.
     */
    if (
      isBindingSafetyFailure &&
      taskId &&
      isUuid(taskId)
    ) {
      const {
        data:
          failedTaskData,
        error:
          failedTaskError,
      } =
        await aiTeamSupabaseAdmin
          .from(
            "ai_tasks"
          )
          .select(
            "id, status, metadata"
          )
          .eq(
            "id",
            taskId
          )
          .maybeSingle();

      if (
        failedTaskError
      ) {
        console.error(
          "Rupert safety-block task lookup failed:",
          failedTaskError
        );
      } else {
        const failedTask =
          failedTaskData as unknown as {
            id: string;
            status: string;
            metadata:
              Record<string, unknown> |
              null;
          } | null;

        if (
          failedTask &&
          failedTask.status ===
            "in_progress"
        ) {
          const blockedAt =
            new Date()
              .toISOString();

          const currentMetadata =
            asRecord(
              failedTask.metadata
            );

          const {
            error:
              blockTaskError,
          } =
            await aiTeamSupabaseAdmin
              .from(
                "ai_tasks"
              )
              .update({
                status:
                  "blocked",

                result_summary:
                  "Rupert's generated content failed binding research safety validation. No blog or approval was created. The task is blocked pending narrower Founder/Jake direction or a corrected drafting approach.",

                metadata: {
                  ...currentMetadata,

                  draft_safety_state:
                    "blocked",

                  draft_block_reason:
                    "binding_research_safety_validation_failed",

                  last_content_safety_failure_at:
                    blockedAt,

                  last_content_safety_error:
                    errorMessage,

                  last_content_safety_report_id:
                    report.id,
                },
              })
              .eq(
                "id",
                taskId
              )
              .eq(
                "status",
                "in_progress"
              );

          if (
            blockTaskError
          ) {
            console.error(
              "Rupert safety-block task update failed:",
              blockTaskError
            );
          }
        }
      }
    }

    return Response.json(
      {
        ok: false,
        error:
          errorMessage,

        blocked:
          isBindingSafetyFailure,
      },
      {
        status:
          isBindingSafetyFailure
            ? 422
            : 500,
      }
    );
  }
}
