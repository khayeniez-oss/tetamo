import "server-only";

import {
  aiTeamSupabaseAdmin,
} from "@/lib/ai-team/core/admin-auth";

import {
  classifyInquiryMessages,
  redactInquiryText,
} from "@/lib/ai-team/inquiry-intelligence/classifier";

type StoredMetaMessage = {
  id: string;
  conversation_id:
    string | null;
  message:
    string | null;
  created_at:
    string | null;
  media_count:
    number | null;
};

function isUsableMessage(
  value: string
) {
  const text =
    String(value || "")
      .trim();

  if (!text) {
    return false;
  }

  if (
    /^\[Customer sent\b/i.test(
      text
    )
  ) {
    return false;
  }

  return true;
}

export async function previewInquiryIntelligence(
  options?: {
    limit?: number;
    lookbackDays?: number;
    before?: string | null;
  }
) {
  const limit =
    Math.min(
      10,
      Math.max(
        1,
        Number(
          options?.limit ??
            5
        ) || 5
      )
    );

  const lookbackDays =
    Math.min(
      30,
      Math.max(
        1,
        Number(
          options?.lookbackDays ??
            14
        ) || 14
      )
    );

  const before =
    (() => {
      const value =
        String(
          options?.before ||
            ""
        ).trim();

      if (!value) {
        return null;
      }

      const parsed =
        new Date(value);

      if (
        Number.isNaN(
          parsed.getTime()
        )
      ) {
        throw new Error(
          "Invalid inquiry preview before timestamp."
        );
      }

      return parsed.toISOString();
    })();

  /*
   * Historical preview uses a moving time window.
   *
   * Without `before`, the window ends now.
   * With `before`, the window ends immediately before
   * that timestamp.
   */
  const windowEnd =
    before
      ? new Date(before)
      : new Date();

  const cutoff =
    new Date(
      windowEnd.getTime() -
        lookbackDays *
          24 *
          60 *
          60 *
          1000
    ).toISOString();

  /*
   * READ ONLY.
   *
   * This query deliberately reads only the minimum fields needed
   * from already-saved Meta inbound messages.
   *
   * It does NOT read:
   * - phone
   * - from_number
   * - to_number
   * - profile_name
   * - raw_payload
   *
   * It does NOT update Mona or WhatsApp data.
   */
  let query =
    aiTeamSupabaseAdmin
      .from(
        "whatsapp_messages"
      )
      .select(
        "id, conversation_id, message, created_at, media_count"
      )
      .eq(
        "direction",
        "inbound"
      )
      .eq(
        "provider",
        "meta"
      )
      .eq(
        "ai_generated",
        false
      )
      .eq(
        "admin_generated",
        false
      )
      .gte(
        "created_at",
        cutoff
      );

  if (before) {
    query =
      query.lt(
        "created_at",
        before
      );
  }

  const {
    data,
    error,
  } =
    await query
      .order(
        "created_at",
        {
          ascending:
            false,
        }
      )
      .limit(
        Math.max(
          limit * 5,
          25
        )
      );

  if (error) {
    throw new Error(
      `Unable to read Meta inquiry messages: ${error.message}`
    );
  }

  const candidates =
    (
      (data || []) as
        StoredMetaMessage[]
    )
      .filter(
        (row) =>
          Boolean(
            row.id &&
              row.created_at &&
              isUsableMessage(
                row.message ||
                  ""
              )
          )
      )
      .slice(
        0,
        limit
      );

  if (
    !candidates.length
  ) {
    return {
      mode:
        "preview_read_only" as const,

      writesPerformed:
        false,

      lookbackDays,
      requestedLimit:
        limit,

      before,

      windowStart:
        cutoff,

      nextBefore:
        null,

      sourceMessages:
        0,

      signals:
        [],
    };
  }

  const sourceMap =
    new Map<
      string,
      StoredMetaMessage
    >();

  const modelInputs =
    candidates.map(
      (row, index) => {
        const sourceKey =
          `m${index + 1}`;

        sourceMap.set(
          sourceKey,
          row
        );

        return {
          sourceKey,

          text:
            redactInquiryText(
              row.message ||
                ""
            ),
        };
      }
    );

  const classifications =
    await classifyInquiryMessages(
      modelInputs
    );

  const signals =
    classifications.map(
      (classification) => {
        const source =
          sourceMap.get(
            classification.sourceKey
          );

        if (!source) {
          throw new Error(
            "Inquiry preview source mapping failed."
          );
        }

        /*
         * We deliberately do NOT return:
         * - raw message
         * - conversation id
         * - phone
         * - profile name
         * - raw payload
         */
        return {
          sourceMessageId:
            source.id,

          sourceCreatedAt:
            source.created_at,

          language:
            classification.language,

          customerType:
            classification.customerType,

          inquiryKind:
            classification.inquiryKind,

          themeKey:
            classification.themeKey,

          themeTitle:
            classification.themeTitle,

          questionSummary:
            classification.questionSummary,

          contentRelevance:
            classification.contentRelevance,

          growthRelevance:
            classification.growthRelevance,

          confidence:
            classification.confidence,

          contentCandidate:
            classification.contentCandidate,

          privacyStatus:
            classification.privacyStatus,

          reason:
            classification.reason,
        };
      }
    );

  return {
    mode:
      "preview_read_only" as const,

    writesPerformed:
      false,

    lookbackDays,
    requestedLimit:
      limit,

    before,

    windowStart:
      cutoff,

    nextBefore:
      candidates[
        candidates.length - 1
      ]?.created_at ??
      null,

    sourceMessages:
      candidates.length,

    signals,
  };
}
