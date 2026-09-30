"use client";

import { useEffect, useState } from "react";

import {
  Brain,
  Circle,
  Flag,
  Headphones,
  MessageCircle,
  Sparkles,
  UserRound,
} from "lucide-react";

export type MeetingPresenceState =
  | "idle"
  | "listening"
  | "thinking"
  | "speaking"
  | "acknowledging"
  | "flagging";

export type MeetingParticipant = {
  id: string;
  name: string;
  role: string;
  state: MeetingPresenceState;
  portraitSrc?: string | null;
  subtitle?: string | null;
};

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function getStateLabel(
  state: MeetingPresenceState
) {
  switch (state) {
    case "listening":
      return "Listening";
    case "thinking":
      return "Thinking";
    case "speaking":
      return "Speaking";
    case "acknowledging":
      return "Acknowledging";
    case "flagging":
      return "Flagging";
    case "idle":
    default:
      return "Idle";
  }
}

function getStateIcon(
  state: MeetingPresenceState
) {
  switch (state) {
    case "listening":
      return Headphones;
    case "thinking":
      return Brain;
    case "speaking":
      return MessageCircle;
    case "acknowledging":
      return Sparkles;
    case "flagging":
      return Flag;
    case "idle":
    default:
      return Circle;
  }
}

function getTileClasses(
  state: MeetingPresenceState
) {
  switch (state) {
    case "speaking":
      return "border-[#1C1C1E] ring-2 ring-[#1C1C1E]/15 shadow-md";

    case "flagging":
      return "border-amber-300 ring-2 ring-amber-200/60 shadow-sm";

    case "thinking":
      return "border-blue-200 ring-1 ring-blue-100";

    case "listening":
      return "border-emerald-200 ring-1 ring-emerald-100";

    case "acknowledging":
      return "border-violet-200 ring-1 ring-violet-100";

    case "idle":
    default:
      return "border-gray-200";
  }
}

function getStateBadgeClasses(
  state: MeetingPresenceState
) {
  switch (state) {
    case "speaking":
      return "border-[#1C1C1E] bg-[#1C1C1E] text-white";

    case "flagging":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "thinking":
      return "border-blue-200 bg-blue-50 text-blue-700";

    case "listening":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "acknowledging":
      return "border-violet-200 bg-violet-50 text-violet-700";

    case "idle":
    default:
      return "border-gray-200 bg-gray-50 text-gray-500";
  }
}

function getPortraitAnimationClass(
  state: MeetingPresenceState
) {
  switch (state) {
    case "listening":
      return "tetamo-ai-listening";
    case "thinking":
      return "tetamo-ai-thinking";
    case "speaking":
      return "tetamo-ai-speaking";
    case "acknowledging":
      return "tetamo-ai-acknowledging";
    case "flagging":
      return "tetamo-ai-flagging";
    case "idle":
    default:
      return "tetamo-ai-idle";
  }
}


const JAKE_PORTRAITS: Record<
  MeetingPresenceState,
  string
> = {
  idle: "/ai-team/characters/jake-animation/jake-idle.png",
  listening:
    "/ai-team/characters/jake-animation/jake-listening.png",
  thinking:
    "/ai-team/characters/jake-animation/jake-thinking.png",
  speaking:
    "/ai-team/characters/jake-animation/jake-idle.png",
  acknowledging:
    "/ai-team/characters/jake-animation/jake-acknowledging.png",
  flagging:
    "/ai-team/characters/jake-animation/jake-flagging.png",
};

const JAKE_BLINK_SRC =
  "/ai-team/characters/jake-animation/jake-blink.png";

const JAKE_SPEAKING_PORTRAITS = {
  closed:
    "/ai-team/characters/jake-animation/jake-speaking-closed.png",
  small:
    "/ai-team/characters/jake-animation/jake-speaking-small.png",
  medium:
    "/ai-team/characters/jake-animation/jake-speaking-medium.png",
  wide:
    "/ai-team/characters/jake-animation/jake-speaking-wide.png",
} as const;

function JakeAnimatedPortrait({
  state,
}: {
  state: MeetingPresenceState;
}) {
  const [isBlinking, setIsBlinking] =
    useState(false);

  const [audioLevel, setAudioLevel] =
    useState(0);

  const canBlink =
    state === "idle" ||
    state === "listening" ||
    state === "speaking";

  useEffect(() => {
    const handleJakeAudioLevel = (
      event: Event
    ) => {
      const customEvent =
        event as CustomEvent<{
          agentKey?: string;
          level?: number;
        }>;

      if (customEvent.detail?.agentKey !== "jake") {
        return;
      }

      const nextLevel =
        typeof customEvent.detail?.level === "number"
          ? customEvent.detail.level
          : 0;

      setAudioLevel(
        Math.min(1, Math.max(0, nextLevel))
      );
    };

    window.addEventListener(
      "tetamo:agent-audio-level",
      handleJakeAudioLevel
    );

    return () => {
      window.removeEventListener(
        "tetamo:agent-audio-level",
        handleJakeAudioLevel
      );
    };
  }, []);

  useEffect(() => {
    if (!canBlink) {
      setIsBlinking(false);
      return;
    }

    let blinkTimer: ReturnType<typeof setTimeout> | null =
      null;
    let reopenTimer: ReturnType<typeof setTimeout> | null =
      null;
    let cancelled = false;

    const scheduleBlink = () => {
      const delay =
        3500 + Math.random() * 3500;

      blinkTimer = setTimeout(() => {
        if (cancelled) {
          return;
        }

        setIsBlinking(true);

        reopenTimer = setTimeout(() => {
          if (cancelled) {
            return;
          }

          setIsBlinking(false);
          scheduleBlink();
        }, 140);
      }, delay);
    };

    scheduleBlink();

    return () => {
      cancelled = true;

      if (blinkTimer) {
        clearTimeout(blinkTimer);
      }

      if (reopenTimer) {
        clearTimeout(reopenTimer);
      }
    };
  }, [canBlink, state]);

  let src = JAKE_PORTRAITS[state];

  if (state === "speaking") {
    if (audioLevel < 0.08) {
      src = JAKE_SPEAKING_PORTRAITS.closed;
    } else if (audioLevel < 0.28) {
      src = JAKE_SPEAKING_PORTRAITS.small;
    } else if (audioLevel < 0.55) {
      src = JAKE_SPEAKING_PORTRAITS.medium;
    } else {
      src = JAKE_SPEAKING_PORTRAITS.wide;
    }
  }

  if (isBlinking && canBlink) {
    src = JAKE_BLINK_SRC;
  }

  return (
    <img
      src={src}
      alt="Jake"
      className={[
        "h-full w-full object-contain will-change-transform",
        getPortraitAnimationClass(state),
      ].join(" ")}
    />
  );
}

const MONA_BLINK_SRC =
  "/ai-team/characters/mona-animation/mona-blink.png";

const MONA_SPEAKING_PORTRAITS = {
  closed:
    "/ai-team/characters/mona-animation/mona-speaking-closed.png",
  small:
    "/ai-team/characters/mona-animation/mona-speaking-small.png",
  medium:
    "/ai-team/characters/mona-animation/mona-speaking-medium.png",
  wide:
    "/ai-team/characters/mona-animation/mona-speaking-wide.png",
} as const;

function MonaAnimatedPortrait({
  state,
}: {
  state: MeetingPresenceState;
}) {
  const [isBlinking, setIsBlinking] =
    useState(false);

  const [audioLevel, setAudioLevel] =
    useState(0);

  const canBlink =
    state === "idle" ||
    state === "listening" ||
    state === "speaking";

  useEffect(() => {
    const handleMonaAudioLevel = (
      event: Event
    ) => {
      const customEvent =
        event as CustomEvent<{
          agentKey?: string;
          level?: number;
        }>;

      if (customEvent.detail?.agentKey !== "mona") {
        return;
      }

      const nextLevel =
        typeof customEvent.detail?.level === "number"
          ? customEvent.detail.level
          : 0;

      setAudioLevel(
        Math.min(1, Math.max(0, nextLevel))
      );
    };

    window.addEventListener(
      "tetamo:agent-audio-level",
      handleMonaAudioLevel
    );

    return () => {
      window.removeEventListener(
        "tetamo:agent-audio-level",
        handleMonaAudioLevel
      );
    };
  }, []);

  useEffect(() => {
    if (!canBlink) {
      setIsBlinking(false);
      return;
    }

    let blinkTimer:
      | ReturnType<typeof setTimeout>
      | null = null;

    let reopenTimer:
      | ReturnType<typeof setTimeout>
      | null = null;

    let cancelled = false;

    const scheduleBlink = () => {
      const delay =
        3500 + Math.random() * 3500;

      blinkTimer = setTimeout(() => {
        if (cancelled) {
          return;
        }

        setIsBlinking(true);

        reopenTimer = setTimeout(() => {
          if (cancelled) {
            return;
          }

          setIsBlinking(false);
          scheduleBlink();
        }, 140);
      }, delay);
    };

    scheduleBlink();

    return () => {
      cancelled = true;

      if (blinkTimer) {
        clearTimeout(blinkTimer);
      }

      if (reopenTimer) {
        clearTimeout(reopenTimer);
      }
    };
  }, [canBlink, state]);

  let src = "/ai-team/characters/mona.png";

  if (state === "speaking") {
    if (audioLevel < 0.08) {
      src = MONA_SPEAKING_PORTRAITS.closed;
    } else if (audioLevel < 0.28) {
      src = MONA_SPEAKING_PORTRAITS.small;
    } else if (audioLevel < 0.55) {
      src = MONA_SPEAKING_PORTRAITS.medium;
    } else {
      src = MONA_SPEAKING_PORTRAITS.wide;
    }
  }

  if (isBlinking && canBlink) {
    src = MONA_BLINK_SRC;
  }

  return (
    <img
      src={src}
      alt="Mona"
      className={[
        "h-full w-full object-contain will-change-transform",
        getPortraitAnimationClass(state),
      ].join(" ")}
    />
  );
}

const RUPERT_BLINK_SRC =
  "/ai-team/characters/rupert-animation/rupert-blink.png";

const RUPERT_SPEAKING_PORTRAITS = {
  closed:
    "/ai-team/characters/rupert-animation/rupert-speaking-closed.png",
  small:
    "/ai-team/characters/rupert-animation/rupert-speaking-small.png",
  medium:
    "/ai-team/characters/rupert-animation/rupert-speaking-medium.png",
  wide:
    "/ai-team/characters/rupert-animation/rupert-speaking-wide.png",
} as const;

function RupertAnimatedPortrait({
  state,
}: {
  state: MeetingPresenceState;
}) {
  const [isBlinking, setIsBlinking] =
    useState(false);

  const [audioLevel, setAudioLevel] =
    useState(0);

  const canBlink =
    state === "idle" ||
    state === "listening" ||
    state === "speaking";

  useEffect(() => {
    const handleRupertAudioLevel = (
      event: Event
    ) => {
      const customEvent =
        event as CustomEvent<{
          agentKey?: string;
          level?: number;
        }>;

      if (customEvent.detail?.agentKey !== "rupert") {
        return;
      }

      const nextLevel =
        typeof customEvent.detail?.level === "number"
          ? customEvent.detail.level
          : 0;

      setAudioLevel(
        Math.min(1, Math.max(0, nextLevel))
      );
    };

    window.addEventListener(
      "tetamo:agent-audio-level",
      handleRupertAudioLevel
    );

    return () => {
      window.removeEventListener(
        "tetamo:agent-audio-level",
        handleRupertAudioLevel
      );
    };
  }, []);

  useEffect(() => {
    if (!canBlink) {
      setIsBlinking(false);
      return;
    }

    let blinkTimer:
      | ReturnType<typeof setTimeout>
      | null = null;

    let reopenTimer:
      | ReturnType<typeof setTimeout>
      | null = null;

    let cancelled = false;

    const scheduleBlink = () => {
      const delay =
        3500 + Math.random() * 3500;

      blinkTimer = setTimeout(() => {
        if (cancelled) return;

        setIsBlinking(true);

        reopenTimer = setTimeout(() => {
          if (cancelled) return;

          setIsBlinking(false);
          scheduleBlink();
        }, 140);
      }, delay);
    };

    scheduleBlink();

    return () => {
      cancelled = true;

      if (blinkTimer) {
        clearTimeout(blinkTimer);
      }

      if (reopenTimer) {
        clearTimeout(reopenTimer);
      }
    };
  }, [canBlink, state]);

  let src = "/ai-team/characters/rupert.png";

  if (state === "speaking") {
    if (audioLevel < 0.08) {
      src = RUPERT_SPEAKING_PORTRAITS.closed;
    } else if (audioLevel < 0.28) {
      src = RUPERT_SPEAKING_PORTRAITS.small;
    } else if (audioLevel < 0.55) {
      src = RUPERT_SPEAKING_PORTRAITS.medium;
    } else {
      src = RUPERT_SPEAKING_PORTRAITS.wide;
    }
  }

  if (isBlinking && canBlink) {
    src = RUPERT_BLINK_SRC;
  }

  return (
    <img
      src={src}
      alt="Rupert"
      className={[
        "h-full w-full object-contain will-change-transform",
        getPortraitAnimationClass(state),
      ].join(" ")}
    />
  );
}

const RANDOLPH_BLINK_SRC =
  "/ai-team/characters/randolph-animation/randolph-blink.png";

const RANDOLPH_SPEAKING_PORTRAITS = {
  closed:
    "/ai-team/characters/randolph-animation/randolph-speaking-closed.png",
  small:
    "/ai-team/characters/randolph-animation/randolph-speaking-small.png",
  medium:
    "/ai-team/characters/randolph-animation/randolph-speaking-medium.png",
  wide:
    "/ai-team/characters/randolph-animation/randolph-speaking-wide.png",
} as const;

function RandolphAnimatedPortrait({
  state,
}: {
  state: MeetingPresenceState;
}) {
  const [isBlinking, setIsBlinking] =
    useState(false);

  const [audioLevel, setAudioLevel] =
    useState(0);

  const canBlink =
    state === "idle" ||
    state === "listening" ||
    state === "speaking";

  useEffect(() => {
    const handleRandolphAudioLevel = (
      event: Event
    ) => {
      const customEvent =
        event as CustomEvent<{
          agentKey?: string;
          level?: number;
        }>;

      if (
        customEvent.detail?.agentKey !==
        "randolph"
      ) {
        return;
      }

      const nextLevel =
        typeof customEvent.detail?.level ===
        "number"
          ? customEvent.detail.level
          : 0;

      setAudioLevel(
        Math.min(1, Math.max(0, nextLevel))
      );
    };

    window.addEventListener(
      "tetamo:agent-audio-level",
      handleRandolphAudioLevel
    );

    return () => {
      window.removeEventListener(
        "tetamo:agent-audio-level",
        handleRandolphAudioLevel
      );
    };
  }, []);

  useEffect(() => {
    if (!canBlink) {
      setIsBlinking(false);
      return;
    }

    let blinkTimer:
      | ReturnType<typeof setTimeout>
      | null = null;

    let reopenTimer:
      | ReturnType<typeof setTimeout>
      | null = null;

    let cancelled = false;

    const scheduleBlink = () => {
      const delay =
        3500 + Math.random() * 3500;

      blinkTimer = setTimeout(() => {
        if (cancelled) return;

        setIsBlinking(true);

        reopenTimer = setTimeout(() => {
          if (cancelled) return;

          setIsBlinking(false);
          scheduleBlink();
        }, 140);
      }, delay);
    };

    scheduleBlink();

    return () => {
      cancelled = true;

      if (blinkTimer) {
        clearTimeout(blinkTimer);
      }

      if (reopenTimer) {
        clearTimeout(reopenTimer);
      }
    };
  }, [canBlink, state]);

  let src =
    "/ai-team/characters/randolph.png";

  if (state === "speaking") {
    if (audioLevel < 0.08) {
      src =
        RANDOLPH_SPEAKING_PORTRAITS.closed;
    } else if (audioLevel < 0.28) {
      src =
        RANDOLPH_SPEAKING_PORTRAITS.small;
    } else if (audioLevel < 0.55) {
      src =
        RANDOLPH_SPEAKING_PORTRAITS.medium;
    } else {
      src =
        RANDOLPH_SPEAKING_PORTRAITS.wide;
    }
  }

  if (isBlinking && canBlink) {
    src = RANDOLPH_BLINK_SRC;
  }

  return (
    <img
      src={src}
      alt="Randolph"
      className={[
        "h-full w-full object-contain will-change-transform",
        getPortraitAnimationClass(state),
      ].join(" ")}
    />
  );
}

const LOLA_BLINK_SRC =
  "/ai-team/characters/lola-animation/lola-blink.png";

const LOLA_SPEAKING_PORTRAITS = {
  closed:
    "/ai-team/characters/lola-animation/lola-speaking-closed.png",
  small:
    "/ai-team/characters/lola-animation/lola-speaking-small.png",
  medium:
    "/ai-team/characters/lola-animation/lola-speaking-medium.png",
  wide:
    "/ai-team/characters/lola-animation/lola-speaking-wide.png",
} as const;

function LolaAnimatedPortrait({
  state,
}: {
  state: MeetingPresenceState;
}) {
  const [isBlinking, setIsBlinking] =
    useState(false);

  const [audioLevel, setAudioLevel] =
    useState(0);

  const canBlink =
    state === "idle" ||
    state === "listening" ||
    state === "speaking";

  useEffect(() => {
    const handleLolaAudioLevel = (
      event: Event
    ) => {
      const customEvent =
        event as CustomEvent<{
          agentKey?: string;
          level?: number;
        }>;

      if (
        customEvent.detail?.agentKey !==
        "lola"
      ) {
        return;
      }

      const nextLevel =
        typeof customEvent.detail?.level ===
        "number"
          ? customEvent.detail.level
          : 0;

      setAudioLevel(
        Math.min(1, Math.max(0, nextLevel))
      );
    };

    window.addEventListener(
      "tetamo:agent-audio-level",
      handleLolaAudioLevel
    );

    return () => {
      window.removeEventListener(
        "tetamo:agent-audio-level",
        handleLolaAudioLevel
      );
    };
  }, []);

  useEffect(() => {
    if (!canBlink) {
      setIsBlinking(false);
      return;
    }

    let blinkTimer:
      | ReturnType<typeof setTimeout>
      | null = null;

    let reopenTimer:
      | ReturnType<typeof setTimeout>
      | null = null;

    let cancelled = false;

    const scheduleBlink = () => {
      const delay =
        3500 + Math.random() * 3500;

      blinkTimer = setTimeout(() => {
        if (cancelled) return;

        setIsBlinking(true);

        reopenTimer = setTimeout(() => {
          if (cancelled) return;

          setIsBlinking(false);
          scheduleBlink();
        }, 140);
      }, delay);
    };

    scheduleBlink();

    return () => {
      cancelled = true;

      if (blinkTimer) {
        clearTimeout(blinkTimer);
      }

      if (reopenTimer) {
        clearTimeout(reopenTimer);
      }
    };
  }, [canBlink, state]);

  let src =
    "/ai-team/characters/lola.png";

  if (state === "speaking") {
    if (audioLevel < 0.08) {
      src =
        LOLA_SPEAKING_PORTRAITS.closed;
    } else if (audioLevel < 0.28) {
      src =
        LOLA_SPEAKING_PORTRAITS.small;
    } else if (audioLevel < 0.55) {
      src =
        LOLA_SPEAKING_PORTRAITS.medium;
    } else {
      src =
        LOLA_SPEAKING_PORTRAITS.wide;
    }
  }

  if (isBlinking && canBlink) {
    src = LOLA_BLINK_SRC;
  }

  return (
    <img
      src={src}
      alt="Lola"
      className={[
        "h-full w-full object-contain will-change-transform",
        getPortraitAnimationClass(state),
      ].join(" ")}
    />
  );
}

const UNCLE_SAM_BLINK_SRC =
  "/ai-team/characters/uncle-sam-animation/uncle-sam-blink.png";

const UNCLE_SAM_SPEAKING_PORTRAITS = {
  closed:
    "/ai-team/characters/uncle-sam-animation/uncle-sam-speaking-closed.png",
  small:
    "/ai-team/characters/uncle-sam-animation/uncle-sam-speaking-small.png",
  medium:
    "/ai-team/characters/uncle-sam-animation/uncle-sam-speaking-medium.png",
  wide:
    "/ai-team/characters/uncle-sam-animation/uncle-sam-speaking-wide.png",
} as const;

function UncleSamAnimatedPortrait({
  state,
}: {
  state: MeetingPresenceState;
}) {
  const [isBlinking, setIsBlinking] =
    useState(false);

  const [audioLevel, setAudioLevel] =
    useState(0);

  const canBlink =
    state === "idle" ||
    state === "listening" ||
    state === "speaking";

  useEffect(() => {
    const handleUncleSamAudioLevel = (
      event: Event
    ) => {
      const customEvent =
        event as CustomEvent<{
          agentKey?: string;
          level?: number;
        }>;

      if (
        customEvent.detail?.agentKey !==
        "uncle_sam"
      ) {
        return;
      }

      const nextLevel =
        typeof customEvent.detail?.level ===
        "number"
          ? customEvent.detail.level
          : 0;

      setAudioLevel(
        Math.min(1, Math.max(0, nextLevel))
      );
    };

    window.addEventListener(
      "tetamo:agent-audio-level",
      handleUncleSamAudioLevel
    );

    return () => {
      window.removeEventListener(
        "tetamo:agent-audio-level",
        handleUncleSamAudioLevel
      );
    };
  }, []);

  useEffect(() => {
    if (!canBlink) {
      setIsBlinking(false);
      return;
    }

    let blinkTimer:
      | ReturnType<typeof setTimeout>
      | null = null;

    let reopenTimer:
      | ReturnType<typeof setTimeout>
      | null = null;

    let cancelled = false;

    const scheduleBlink = () => {
      const delay =
        3500 + Math.random() * 3500;

      blinkTimer = setTimeout(() => {
        if (cancelled) return;

        setIsBlinking(true);

        reopenTimer = setTimeout(() => {
          if (cancelled) return;

          setIsBlinking(false);
          scheduleBlink();
        }, 140);
      }, delay);
    };

    scheduleBlink();

    return () => {
      cancelled = true;

      if (blinkTimer) {
        clearTimeout(blinkTimer);
      }

      if (reopenTimer) {
        clearTimeout(reopenTimer);
      }
    };
  }, [canBlink, state]);

  let src =
    "/ai-team/characters/uncle-sam.png";

  if (state === "speaking") {
    if (audioLevel < 0.08) {
      src =
        UNCLE_SAM_SPEAKING_PORTRAITS.closed;
    } else if (audioLevel < 0.28) {
      src =
        UNCLE_SAM_SPEAKING_PORTRAITS.small;
    } else if (audioLevel < 0.55) {
      src =
        UNCLE_SAM_SPEAKING_PORTRAITS.medium;
    } else {
      src =
        UNCLE_SAM_SPEAKING_PORTRAITS.wide;
    }
  }

  if (isBlinking && canBlink) {
    src = UNCLE_SAM_BLINK_SRC;
  }

  return (
    <img
      src={src}
      alt="Uncle Sam"
      className={[
        "h-full w-full object-contain will-change-transform",
        getPortraitAnimationClass(state),
      ].join(" ")}
    />
  );
}

function ParticipantTile({
  participant,
}: {
  participant: MeetingParticipant;
}) {
  const StateIcon = getStateIcon(
    participant.state
  );

  return (
    <div
      className={[
        "group relative overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-200",
        getTileClasses(participant.state),
      ].join(" ")}
    >
      <div className="relative h-[320px] overflow-hidden bg-gray-100 xl:h-[360px]">
        {participant.name === "Jake" ? (
          <JakeAnimatedPortrait
            state={participant.state}
          />
        ) : participant.name === "Mona" ? (
          <MonaAnimatedPortrait
            state={participant.state}
          />
        ) : participant.name === "Rupert" ? (
          <RupertAnimatedPortrait
            state={participant.state}
          />
        ) : participant.name === "Randolph" ? (
          <RandolphAnimatedPortrait
            state={participant.state}
          />
        ) : participant.name === "Lola" ? (
          <LolaAnimatedPortrait
            state={participant.state}
          />
        ) : participant.name === "Uncle Sam" ? (
          <UncleSamAnimatedPortrait
            state={participant.state}
          />
        ) : participant.portraitSrc ? (
          <img
            src={participant.portraitSrc}
            alt={participant.name}
            className={[
              "h-full w-full object-contain will-change-transform",
              getPortraitAnimationClass(
                participant.state
              ),
            ].join(" ")}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
            <div className="flex h-20 w-20 items-center justify-center rounded-full border border-gray-200 bg-white text-xl font-semibold text-[#1C1C1E] shadow-sm">
              {getInitials(participant.name) || (
                <UserRound className="h-7 w-7" />
              )}
            </div>
          </div>
        )}

        <div className="absolute left-3 top-3">
          <span
            className={[
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold shadow-sm",
              getStateBadgeClasses(
                participant.state
              ),
            ].join(" ")}
          >
            <StateIcon className="h-3 w-3" />
            {getStateLabel(
              participant.state
            )}
          </span>
        </div>

        {participant.state === "speaking" ? (
          <div className="absolute bottom-3 right-3 flex items-end gap-1 rounded-full bg-black/70 px-2.5 py-1.5">
            <span className="tetamo-ai-wave-bar h-2 w-1 rounded-full bg-white" />
            <span className="tetamo-ai-wave-bar h-4 w-1 rounded-full bg-white [animation-delay:120ms]" />
            <span className="tetamo-ai-wave-bar h-3 w-1 rounded-full bg-white [animation-delay:240ms]" />
            <span className="tetamo-ai-wave-bar h-5 w-1 rounded-full bg-white [animation-delay:80ms]" />
            <span className="tetamo-ai-wave-bar h-2.5 w-1 rounded-full bg-white [animation-delay:190ms]" />
          </div>
        ) : null}
      </div>

      <div className="p-4">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-[#1C1C1E]">
            {participant.name}
          </h3>

          <p className="mt-0.5 truncate text-xs text-gray-500">
            {participant.role}
          </p>
        </div>

        {participant.subtitle ? (
          <p className="mt-3 line-clamp-2 text-xs leading-5 text-gray-400">
            {participant.subtitle}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function MeetingStage({
  participants,
}: {
  participants: MeetingParticipant[];
}) {
  const speakingParticipant =
    participants.find(
      (participant) =>
        participant.state === "speaking"
    ) ?? null;

  const flaggedParticipants =
    participants.filter(
      (participant) =>
        participant.state === "flagging"
    );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">
            Live Meeting Stage
          </p>

          <h3 className="mt-1 text-base font-semibold text-[#1C1C1E]">
            Everyone in the room
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {speakingParticipant ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-[#1C1C1E] px-3 py-1.5 text-xs font-medium text-white">
              <MessageCircle className="h-3.5 w-3.5" />
              {speakingParticipant.name} is speaking
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-500">
              <Circle className="h-3.5 w-3.5" />
              Room idle
            </span>
          )}

          {flaggedParticipants.length > 0 ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700">
              <Flag className="h-3.5 w-3.5" />
              {flaggedParticipants.length} flagged
            </span>
          ) : null}
        </div>
      </div>

      <div className="rounded-3xl border border-gray-200 bg-gray-50 p-3 shadow-inner sm:p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {participants.map(
            (participant) => (
              <ParticipantTile
                key={participant.id}
                participant={participant}
              />
            )
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {(
          [
            "idle",
            "listening",
            "thinking",
            "speaking",
            "acknowledging",
            "flagging",
          ] as MeetingPresenceState[]
        ).map((state) => {
          const StateIcon =
            getStateIcon(state);

          return (
            <div
              key={state}
              className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-[10px] font-medium text-gray-500"
            >
              <StateIcon className="h-3.5 w-3.5 shrink-0" />
              {getStateLabel(state)}
            </div>
          );
        })}
      </div>
    </div>
  );
}