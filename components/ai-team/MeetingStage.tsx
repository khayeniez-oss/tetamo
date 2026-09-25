"use client";

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
      <div className="relative aspect-video overflow-hidden bg-gray-100">
        {participant.portraitSrc ? (
          <img
            src={participant.portraitSrc}
            alt={participant.name}
            className="h-full w-full object-cover"
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
            <span className="h-2 w-1 rounded-full bg-white" />
            <span className="h-4 w-1 rounded-full bg-white" />
            <span className="h-3 w-1 rounded-full bg-white" />
            <span className="h-5 w-1 rounded-full bg-white" />
            <span className="h-2.5 w-1 rounded-full bg-white" />
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