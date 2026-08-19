import type {
  MonaConversationMemory,
  MonaMemoryMessage,
} from "./memory";
import type { MonaSalesStage } from "./stage";

export type MonaHumanDelayOptions = {
  minimumMs?: number;
  maximumMs?: number;
  messageLength?: number;
};

export type MonaSilenceFollowUpNumber =
  | 1
  | 2;

export type MonaSilenceFollowUpDecision =
  | {
      action: "none";
      reason: string;
      nextDueAt: string | null;
    }
  | {
      action: "follow_up";
      followUpNumber: MonaSilenceFollowUpNumber;
      reason: string;
      dueAt: string;
      waitingSince: string;
    }
  | {
      action: "stop";
      reason: string;
      nextDueAt: null;
    };

export type MonaSilenceFollowUpState = {
  /*
   * Number of silence follow-ups already SENT successfully
   * for the current unanswered Mona message cycle.
   *
   * 0 = none sent
   * 1 = first follow-up sent
   * 2 = second/final follow-up sent
   */
  followUpsSent: 0 | 1 | 2;

  /*
   * Timestamp when follow-up #1 was successfully sent.
   * Required to calculate follow-up #2 from the actual first
   * follow-up send time.
   */
  firstFollowUpSentAt?: string | null;

  /*
   * If Brain/Sales identifies a real customer dependency such as
   * "next month", "after salary", "after I ask my husband",
   * Orchestrator can mark this cycle as dependency-controlled.
   *
   * Normal 1h/12h silence chasing is then suppressed.
   */
  dependencyControlled?: boolean;

  dependencyReason?: string | null;
};

export type EvaluateMonaSilenceFollowUpParams = {
  memory: MonaConversationMemory;
  state: MonaSilenceFollowUpState;
  now?: Date;

  /*
   * Current CRM sales stage.
   * Timing does not change the stage; it only uses it as a suppression signal.
   */
  salesStage?: MonaSalesStage | string | null;

  /*
   * These values will normally come from conversation/orchestrator state.
   */
  aiPaused?: boolean;
  blocked?: boolean;
  optedOut?: boolean;
};

const FIRST_SILENCE_FOLLOW_UP_MS =
  60 * 60 * 1000;

const SECOND_SILENCE_FOLLOW_UP_MS =
  12 * 60 * 60 * 1000;

function sleep(
  milliseconds: number
) {
  return new Promise<void>(
    (resolve) => {
      setTimeout(
        resolve,
        milliseconds
      );
    }
  );
}

function randomBetween(
  minimum: number,
  maximum: number
) {
  return (
    Math.floor(
      Math.random() *
        (maximum - minimum + 1)
    ) + minimum
  );
}

export function calculateMonaHumanDelay(
  options: MonaHumanDelayOptions = {}
) {
  const minimumMs = Math.max(
    0,
    options.minimumMs ?? 1800
  );

  const maximumMs = Math.max(
    minimumMs,
    options.maximumMs ?? 4200
  );

  const messageLength = Math.max(
    0,
    options.messageLength ?? 0
  );

  const lengthAdjustment =
    messageLength > 500
      ? 1200
      : messageLength > 250
        ? 700
        : messageLength > 100
          ? 350
          : 0;

  return randomBetween(
    minimumMs,
    maximumMs + lengthAdjustment
  );
}

export async function waitForMonaHumanDelay(
  options: MonaHumanDelayOptions = {}
) {
  const delayMs =
    calculateMonaHumanDelay(
      options
    );

  await sleep(delayMs);

  return delayMs;
}

function parseDate(
  value?: string | null
): Date | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(
    date.getTime()
  )
    ? null
    : date;
}

function addMilliseconds(
  date: Date,
  milliseconds: number
) {
  return new Date(
    date.getTime() + milliseconds
  );
}

function normalizeStage(
  value?: string | null
) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function isClosedStage(
  stage?: string | null
) {
  const normalized =
    normalizeStage(stage);

  return (
    normalized === "closed_won" ||
    normalized === "closed_lost"
  );
}

/*
 * System and Campaign messages are not conversational turns.
 *
 * They must not:
 * - start a Mona silence timer;
 * - cancel a Mona silence timer;
 * - become the conversational "last message".
 */
function isMeaningfulConversationMessage(
  message: MonaMemoryMessage
) {
  return (
    message.speaker ===
      "Customer" ||
    message.speaker === "Mona" ||
    message.speaker === "Admin"
  );
}

function getMeaningfulConversationMessages(
  memory: MonaConversationMemory
) {
  return memory.messages.filter(
    isMeaningfulConversationMessage
  );
}

function getLastMeaningfulMessage(
  memory: MonaConversationMemory
) {
  const messages =
    getMeaningfulConversationMessages(
      memory
    );

  return (
    messages[
      messages.length - 1
    ] || null
  );
}

/*
 * Returns the Mona message that currently owns the waiting cycle.
 *
 * A silence cycle exists only when:
 * - the latest meaningful conversational message is Mona;
 * - therefore Mona has replied and is waiting for the customer.
 *
 * If Customer is latest:
 * Mona owes a normal reply; this is NOT silence follow-up.
 *
 * If Admin is latest:
 * human intervention owns the conversation; automated follow-up is suppressed.
 */
function getWaitingMonaMessage(
  memory: MonaConversationMemory
): MonaMemoryMessage | null {
  const last =
    getLastMeaningfulMessage(
      memory
    );

  if (
    !last ||
    last.speaker !== "Mona"
  ) {
    return null;
  }

  return last;
}

function hasCustomerReplyAfter(
  memory: MonaConversationMemory,
  timestamp: string
) {
  const waitingSince =
    parseDate(timestamp);

  if (!waitingSince) {
    return false;
  }

  return memory.messages.some(
    (message) => {
      if (
        message.speaker !==
        "Customer"
      ) {
        return false;
      }

      const createdAt =
        parseDate(
          message.createdAt
        );

      return Boolean(
        createdAt &&
          createdAt.getTime() >
            waitingSince.getTime()
      );
    }
  );
}

function hasAdminMessageAfter(
  memory: MonaConversationMemory,
  timestamp: string
) {
  const waitingSince =
    parseDate(timestamp);

  if (!waitingSince) {
    return false;
  }

  return memory.messages.some(
    (message) => {
      if (
        message.speaker !==
        "Admin"
      ) {
        return false;
      }

      const createdAt =
        parseDate(
          message.createdAt
        );

      return Boolean(
        createdAt &&
          createdAt.getTime() >
            waitingSince.getTime()
      );
    }
  );
}

/*
 * TIMING RESPONSIBILITY
 * ---------------------
 *
 * Timing decides WHEN an automated silence follow-up is due.
 *
 * Timing does NOT:
 * - decide customer role;
 * - interpret customer meaning;
 * - choose a package;
 * - write the follow-up;
 * - decide sales strategy;
 * - send the message;
 * - update the database.
 *
 * Orchestrator owns execution/persistence.
 * Writer owns wording.
 */
export function evaluateMonaSilenceFollowUp(
  params: EvaluateMonaSilenceFollowUpParams
): MonaSilenceFollowUpDecision {
  const now =
    params.now || new Date();

  /*
   * Absolute suppression conditions.
   */
  if (params.blocked) {
    return {
      action: "stop",
      reason:
        "Customer/contact is blocked.",
      nextDueAt: null,
    };
  }

  if (params.optedOut) {
    return {
      action: "stop",
      reason:
        "Customer opted out or requested no further contact.",
      nextDueAt: null,
    };
  }

  if (params.aiPaused) {
    return {
      action: "none",
      reason:
        "Mona AI is paused for this conversation.",
      nextDueAt: null,
    };
  }

  if (
    isClosedStage(
      params.salesStage
    )
  ) {
    return {
      action: "stop",
      reason:
        "Conversation is already in a closed sales stage.",
      nextDueAt: null,
    };
  }

  if (
    params.state
      .dependencyControlled
  ) {
    return {
      action: "none",
      reason:
        params.state
          .dependencyReason ||
        "Customer has an explicit timing dependency; normal silence follow-up is suppressed.",
      nextDueAt: null,
    };
  }

  /*
   * After the second silence follow-up, stop automatically.
   */
  if (
    params.state
      .followUpsSent >= 2
  ) {
    return {
      action: "stop",
      reason:
        "Two silence follow-ups have already been sent for this waiting cycle.",
      nextDueAt: null,
    };
  }

  const lastMeaningful =
    getLastMeaningfulMessage(
      params.memory
    );

  if (!lastMeaningful) {
    return {
      action: "none",
      reason:
        "There is no meaningful conversation message to evaluate.",
      nextDueAt: null,
    };
  }

  if (
    lastMeaningful.speaker ===
    "Customer"
  ) {
    return {
      action: "none",
      reason:
        "Customer sent the latest meaningful message; Mona should process a normal reply instead of a silence follow-up.",
      nextDueAt: null,
    };
  }

  if (
    lastMeaningful.speaker ===
    "Admin"
  ) {
    return {
      action: "none",
      reason:
        "Admin sent the latest meaningful message; automated silence follow-up is suppressed.",
      nextDueAt: null,
    };
  }

  const waitingMonaMessage =
    getWaitingMonaMessage(
      params.memory
    );

  if (!waitingMonaMessage) {
    return {
      action: "none",
      reason:
        "Mona is not currently the latest meaningful conversational sender.",
      nextDueAt: null,
    };
  }

  const waitingSince =
    parseDate(
      waitingMonaMessage
        .createdAt
    );

  if (!waitingSince) {
    return {
      action: "none",
      reason:
        "Mona's waiting timestamp is invalid.",
      nextDueAt: null,
    };
  }

  /*
   * Defensive cancellation:
   * if a Customer or Admin turn exists after the waiting Mona message,
   * the waiting cycle is no longer valid even if persistence state is stale.
   */
  if (
    hasCustomerReplyAfter(
      params.memory,
      waitingMonaMessage
        .createdAt
    )
  ) {
    return {
      action: "none",
      reason:
        "Customer replied after Mona's message; the silence cycle is cancelled.",
      nextDueAt: null,
    };
  }

  if (
    hasAdminMessageAfter(
      params.memory,
      waitingMonaMessage
        .createdAt
    )
  ) {
    return {
      action: "none",
      reason:
        "Admin intervened after Mona's message; automated silence follow-up is suppressed.",
      nextDueAt: null,
    };
  }

  /*
   * FOLLOW-UP #1
   *
   * Due one hour after Mona's unanswered message.
   */
  if (
    params.state
      .followUpsSent === 0
  ) {
    const dueAt =
      addMilliseconds(
        waitingSince,
        FIRST_SILENCE_FOLLOW_UP_MS
      );

    if (
      now.getTime() >=
      dueAt.getTime()
    ) {
      return {
        action: "follow_up",
        followUpNumber: 1,
        reason:
          "Customer has not replied for one hour after Mona's last customer-facing message.",
        dueAt:
          dueAt.toISOString(),
        waitingSince:
          waitingSince.toISOString(),
      };
    }

    return {
      action: "none",
      reason:
        "First silence follow-up is not due yet.",
      nextDueAt:
        dueAt.toISOString(),
    };
  }

  /*
   * FOLLOW-UP #2
   *
   * Due twelve hours AFTER follow-up #1 was actually sent.
   *
   * We intentionally do not calculate this as 13 hours from the original
   * Mona reply because the first follow-up could have been delayed.
   */
  if (
    params.state
      .followUpsSent === 1
  ) {
    const firstFollowUpSentAt =
      parseDate(
        params.state
          .firstFollowUpSentAt
      );

    if (!firstFollowUpSentAt) {
      return {
        action: "none",
        reason:
          "First follow-up is marked as sent but its send timestamp is missing.",
        nextDueAt: null,
      };
    }

    const dueAt =
      addMilliseconds(
        firstFollowUpSentAt,
        SECOND_SILENCE_FOLLOW_UP_MS
      );

    if (
      now.getTime() >=
      dueAt.getTime()
    ) {
      return {
        action: "follow_up",
        followUpNumber: 2,
        reason:
          "Customer remained silent for twelve hours after the first follow-up.",
        dueAt:
          dueAt.toISOString(),
        waitingSince:
          waitingSince.toISOString(),
      };
    }

    return {
      action: "none",
      reason:
        "Second silence follow-up is not due yet.",
      nextDueAt:
        dueAt.toISOString(),
    };
  }

  return {
    action: "stop",
    reason:
      "No additional silence follow-up is permitted for this waiting cycle.",
    nextDueAt: null,
  };
}
