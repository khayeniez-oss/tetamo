"use client";

import { useCallback, useEffect, useState } from "react";

import {
  MeetingStage,
  type MeetingParticipant,
} from "@/components/ai-team/MeetingStage";

import { getAICharacterPortrait } from "@/components/ai-team/character-assets";
import { useMeetingPresence } from "@/components/ai-team/useMeetingPresence";
import { supabase } from "@/lib/supabase";
import { MeetingPresenceTestPanel } from "@/components/ai-team/MeetingPresenceTestPanel";

export type MeetingRoomAgent = {
  id: string;
  agent_key:
    | "jake"
    | "mona"
    | "rupert"
    | "randolph"
    | "lola"
    | "uncle_sam";
  display_name: string;
  role_title: string;
  status: string;
  enabled: boolean;
};

type MeetingRoomProps = {
  agents: MeetingRoomAgent[];
};

type MeetingStatus =
  | "scheduled"
  | "preparing"
  | "in_progress"
  | "completed"
  | "cancelled";

type MeetingRecord = {
  id: string;
  meeting_type: string;
  title: string;
  status: MeetingStatus;
  scheduled_for: string;
  started_at: string | null;
};

type MeetingsResponse = {
  ok: boolean;
  meetings?: MeetingRecord[];
  meeting?: MeetingRecord;
  error?: string;
};

type MeetingTurn = {
  id: string;
  meeting_id: string;
  turn_order: number;
  speaker_type: "user" | "advisor" | "agent" | "system";
  speaker_name_snapshot: string;
  speaker_role_snapshot: string | null;
  input_source: "text" | "voice" | "system";
  presence_state: string | null;
  content: string;
  spoken_at: string;
};

type TurnResponse = {
  ok: boolean;
  turn?: MeetingTurn;
  error?: string;
};

type TurnsResponse = {
  ok: boolean;
  turns?: MeetingTurn[];
  error?: string;
};

type JakeDecision = {
  action: "speak" | "handoff" | "no_response";
  reply: string | null;
  acknowledgeRoom: boolean;
  targetAgentKey:
    | "mona"
    | "rupert"
    | "randolph"
    | "lola"
    | "uncle_sam"
    | null;
};

type OrchestrationResponse = {
  ok: boolean;
  decision?: JakeDecision;
  savedTurn?: MeetingTurn | null;
  error?: string;
};

type SpecialistResponse = {
  ok: boolean;
  savedTurn?: MeetingTurn;
  error?: string;
};

const AGENT_ORDER: MeetingRoomAgent["agent_key"][] = [
  "jake",
  "mona",
  "rupert",
  "randolph",
  "lola",
  "uncle_sam",
];

export function MeetingRoom({
  agents,
}: MeetingRoomProps) {
  const orderedAgents = [...agents].sort(
    (a, b) =>
      AGENT_ORDER.indexOf(a.agent_key) -
      AGENT_ORDER.indexOf(b.agent_key)
  );

  const [currentMeeting, setCurrentMeeting] =
    useState<MeetingRecord | null>(null);

  const [meetingLoading, setMeetingLoading] =
    useState(true);

  const [startingMeeting, setStartingMeeting] =
    useState(false);

  const [meetingError, setMeetingError] =
    useState("");

  const [draftTurn, setDraftTurn] =
    useState("");

  const [sendingTurn, setSendingTurn] =
    useState(false);

  const [turnError, setTurnError] =
    useState("");

  const [lastSavedTurn, setLastSavedTurn] =
    useState<MeetingTurn | null>(null);

  const [meetingTurns, setMeetingTurns] =
    useState<MeetingTurn[]>([]);

  const [turnsLoading, setTurnsLoading] =
    useState(false);

  const [orchestrating, setOrchestrating] =
    useState(false);

  const [orchestrationError, setOrchestrationError] =
    useState("");

  const [jakePreview, setJakePreview] =
    useState<JakeDecision | null>(null);

  const loadCurrentMeeting = useCallback(
    async () => {
      try {
        setMeetingLoading(true);
        setMeetingError("");

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (!session?.access_token) {
          throw new Error(
            "Admin session not found. Please log in again."
          );
        }

        const response = await fetch(
          "/api/admin/ai-team/meetings",
          {
            method: "GET",
            headers: {
              Authorization:
                `Bearer ${session.access_token}`,
            },
            cache: "no-store",
          }
        );

        const payload =
          (await response.json()) as MeetingsResponse;

        if (!response.ok || !payload.ok) {
          throw new Error(
            payload.error ||
              "Failed to load meeting status."
          );
        }

        const activeMeeting =
          (payload.meetings ?? []).find(
            (meeting) =>
              meeting.status === "in_progress"
          ) ?? null;

        setCurrentMeeting(activeMeeting);
      } catch (err) {
        console.error(
          "Failed to load AI Team meeting:",
          err
        );

        setMeetingError(
          err instanceof Error
            ? err.message
            : "Failed to load meeting status."
        );
      } finally {
        setMeetingLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    void loadCurrentMeeting();
  }, [loadCurrentMeeting]);

  const startMeeting = async () => {
    try {
      setStartingMeeting(true);
      setMeetingError("");

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      if (!session?.access_token) {
        throw new Error(
          "Admin session not found. Please log in again."
        );
      }

      const response = await fetch(
        "/api/admin/ai-team/meetings",
        {
          method: "POST",
          headers: {
            Authorization:
              `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            meetingType: "ad_hoc",
          }),
        }
      );

      const payload =
        (await response.json()) as MeetingsResponse;

      if (
        !response.ok ||
        !payload.ok ||
        !payload.meeting
      ) {
        throw new Error(
          payload.error ||
            "Failed to start meeting."
        );
      }

      setCurrentMeeting(payload.meeting);
    } catch (err) {
      console.error(
        "Failed to start AI Team meeting:",
        err
      );

      setMeetingError(
        err instanceof Error
          ? err.message
          : "Failed to start meeting."
      );
    } finally {
      setStartingMeeting(false);
    }
  };

  const loadMeetingTurns = useCallback(
    async (meetingId: string) => {
      try {
        setTurnsLoading(true);
        setTurnError("");

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (!session?.access_token) {
          throw new Error(
            "Admin session not found. Please log in again."
          );
        }

        const response = await fetch(
          `/api/admin/ai-team/meetings/${meetingId}/turns`,
          {
            method: "GET",
            headers: {
              Authorization:
                `Bearer ${session.access_token}`,
            },
            cache: "no-store",
          }
        );

        const payload =
          (await response.json()) as TurnsResponse;

        if (!response.ok || !payload.ok) {
          throw new Error(
            payload.error ||
              "Failed to load meeting conversation."
          );
        }

        setMeetingTurns(payload.turns ?? []);
      } catch (err) {
        console.error(
          "Failed to load meeting turns:",
          err
        );

        setTurnError(
          err instanceof Error
            ? err.message
            : "Failed to load meeting conversation."
        );
      } finally {
        setTurnsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!currentMeeting) {
      setMeetingTurns([]);
      return;
    }

    void loadMeetingTurns(currentMeeting.id);
  }, [currentMeeting, loadMeetingTurns]);

  const previewJakeDecision = async (
    triggerTurn?: MeetingTurn
  ) => {
    if (!currentMeeting) {
      setOrchestrationError(
        "Start a meeting first."
      );
      return;
    }

    const latestTurn =
      triggerTurn ??
      meetingTurns[
        meetingTurns.length - 1
      ] ??
      null;

    if (!latestTurn) {
      setOrchestrationError(
        "There is no meeting turn for Jake to review."
      );
      return;
    }

    try {
      setOrchestrating(true);
      setOrchestrationError("");
      setJakePreview(null);

      for (const participantId of participantIds) {
        setListening(participantId);
      }

      if (jakeId) {
        setThinking(jakeId);
      }

      const thinkingStartedAt =
        Date.now();

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      if (!session?.access_token) {
        throw new Error(
          "Admin session not found. Please log in again."
        );
      }

      const response = await fetch(
        `/api/admin/ai-team/meetings/${currentMeeting.id}/orchestrate`,
        {
          method: "POST",
          headers: {
            Authorization:
              `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            triggerTurnId: latestTurn.id,
          }),
        }
      );

      const payload =
        (await response.json()) as OrchestrationResponse;

      if (
        !response.ok ||
        !payload.ok ||
        !payload.decision
      ) {
        throw new Error(
          payload.error ||
            "Jake could not make a meeting decision."
        );
      }

      const thinkingElapsed =
        Date.now() - thinkingStartedAt;

      const minimumThinkingMs = 1300;

      if (thinkingElapsed < minimumThinkingMs) {
        await new Promise((resolve) =>
          window.setTimeout(
            resolve,
            minimumThinkingMs - thinkingElapsed
          )
        );
      }

      setJakePreview(payload.decision);

      if (payload.decision.acknowledgeRoom) {
        for (const participantId of participantIds) {
          if (participantId !== "founder-khaye") {
            setAcknowledging(participantId);
          }
        }

        await new Promise((resolve) =>
          window.setTimeout(resolve, 1000)
        );
      }

      if (
        payload.decision.action === "speak" &&
        jakeId
      ) {
        if (payload.savedTurn) {
          setMeetingTurns((currentTurns) => {
            if (
              currentTurns.some(
                (turn) =>
                  turn.id === payload.savedTurn?.id
              )
            ) {
              return currentTurns;
            }

            return [
              ...currentTurns,
              payload.savedTurn as MeetingTurn,
            ];
          });
        }

        setSpeaker(jakeId);
      } else if (
        payload.decision.action === "handoff" &&
        payload.decision.targetAgentKey
      ) {
        const targetAgentId =
          orderedAgents.find(
            (agent) =>
              agent.agent_key ===
              payload.decision?.targetAgentKey
          )?.id ?? null;

        if (targetAgentId) {
          for (const participantId of participantIds) {
            setListening(participantId);
          }

          setThinking(targetAgentId);

          const specialistKey =
            payload.decision.targetAgentKey;

          if (
            specialistKey === "mona" ||
            specialistKey === "lola" ||
            specialistKey === "randolph" ||
            specialistKey === "rupert"
          ) {
            const specialistThinkingStartedAt =
              Date.now();

            const {
              data: { session: specialistSession },
              error: specialistSessionError,
            } = await supabase.auth.getSession();

            if (specialistSessionError) {
              throw specialistSessionError;
            }

            if (!specialistSession?.access_token) {
              throw new Error(
                "Admin session not found. Please log in again."
              );
            }

            const specialistResponse =
              await fetch(
                `/api/admin/ai-team/meetings/${currentMeeting.id}/specialists/${specialistKey}`,
                {
                  method: "POST",
                  headers: {
                    Authorization:
                      `Bearer ${specialistSession.access_token}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    triggerTurnId: latestTurn.id,
                  }),
                }
              );

            const specialistPayload =
              (await specialistResponse.json()) as SpecialistResponse;

            if (
              !specialistResponse.ok ||
              !specialistPayload.ok ||
              !specialistPayload.savedTurn
            ) {
              const specialistName =
                specialistKey === "mona"
                  ? "Mona"
                  : specialistKey === "lola"
                    ? "Lola"
                    : specialistKey === "randolph"
                      ? "Randolph"
                      : specialistKey === "rupert"
                        ? "Rupert"
                        : "Specialist";

              throw new Error(
                specialistPayload.error ||
                  `${specialistName} could not respond.`
              );
            }

            const specialistThinkingElapsed =
              Date.now() -
              specialistThinkingStartedAt;

            const minimumSpecialistThinkingMs =
              1300;

            if (
              specialistThinkingElapsed <
              minimumSpecialistThinkingMs
            ) {
              await new Promise((resolve) =>
                window.setTimeout(
                  resolve,
                  minimumSpecialistThinkingMs -
                    specialistThinkingElapsed
                )
              );
            }

            setMeetingTurns(
              (currentTurns) => {
                if (
                  currentTurns.some(
                    (turn) =>
                      turn.id ===
                      specialistPayload.savedTurn?.id
                  )
                ) {
                  return currentTurns;
                }

                return [
                  ...currentTurns,
                  specialistPayload.savedTurn as MeetingTurn,
                ];
              }
            );

            setSpeaker(targetAgentId);
          }
        }
      } else if (
        payload.decision.action === "no_response"
      ) {
        resetRoom();
      }
    } catch (err) {
      console.error(
        "Jake orchestration preview failed:",
        err
      );

      setOrchestrationError(
        err instanceof Error
          ? err.message
          : "Jake could not make a meeting decision."
      );
    } finally {
      setOrchestrating(false);
    }
  };

  const submitFounderTurn = async () => {
    if (!currentMeeting) {
      setTurnError(
        "Start a meeting before sending a message."
      );
      return;
    }

    const content = draftTurn.trim();

    if (!content) {
      return;
    }

    try {
      setSendingTurn(true);
      setTurnError("");

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      if (!session?.access_token) {
        throw new Error(
          "Admin session not found. Please log in again."
        );
      }

      setSpeaker("founder-khaye");

      const response = await fetch(
        `/api/admin/ai-team/meetings/${currentMeeting.id}/turns`,
        {
          method: "POST",
          headers: {
            Authorization:
              `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content,
            inputSource: "text",
          }),
        }
      );

      const payload =
        (await response.json()) as TurnResponse;

      if (
        !response.ok ||
        !payload.ok ||
        !payload.turn
      ) {
        throw new Error(
          payload.error ||
            "Failed to save meeting turn."
        );
      }

      const savedFounderTurn =
        payload.turn as MeetingTurn;

      setLastSavedTurn(savedFounderTurn);
      setMeetingTurns((currentTurns) => [
        ...currentTurns,
        savedFounderTurn,
      ]);
      setDraftTurn("");

      await previewJakeDecision(
        savedFounderTurn
      );
    } catch (err) {
      console.error(
        "Failed to save founder meeting turn:",
        err
      );

      setTurnError(
        err instanceof Error
          ? err.message
          : "Failed to save meeting turn."
      );
    } finally {
      setSendingTurn(false);
    }
  };

  const participantIds = [
    "founder-khaye",
    "advisor-koot",
    ...orderedAgents.map((agent) => agent.id),
  ];

  const {
    getParticipantState,
    setSpeaker,
    setThinking,
    setAcknowledging,
    setFlagging,
    setListening,
    resetRoom,
  } = useMeetingPresence(participantIds);

  const jakeId =
    orderedAgents.find(
      (agent) => agent.agent_key === "jake"
    )?.id ?? null;

  const monaId =
    orderedAgents.find(
      (agent) => agent.agent_key === "mona"
    )?.id ?? null;

  const lolaId =
    orderedAgents.find(
      (agent) => agent.agent_key === "lola"
    )?.id ?? null;

  const participants: MeetingParticipant[] = [
    {
      id: "founder-khaye",
      name: "Khaye",
      role: "Founder / CEO",
      state: getParticipantState("founder-khaye"),
      portraitSrc: null,
      subtitle:
        "Final decision-maker and approval authority.",
    },
    {
      id: "advisor-koot",
      name: "KooT",
      role: "Strategic Adviser to Founder",
      state: getParticipantState("advisor-koot"),
      portraitSrc: null,
      subtitle:
        "Advisory seat outside the AI employee hierarchy.",
    },
    ...orderedAgents.map(
      (agent): MeetingParticipant => ({
        id: agent.id,
        name: agent.display_name,
        role: agent.role_title,
        state: getParticipantState(agent.id),
        portraitSrc: getAICharacterPortrait(agent.agent_key),
        subtitle: agent.enabled
          ? "AI staff member is enabled."
          : "AI staff member is currently inactive.",
      })
    ),
  ];

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">
              Shared Executive Room
            </p>

            <h2 className="mt-2 text-xl font-semibold text-[#1C1C1E]">
              Meeting Room
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500">
              Shared conversational space for the Founder,
              KooT, Jake and the specialist AI team. Jake
              will coordinate turn-taking once the live
              conversation layer is connected.
            </p>
          </div>

          <div className="flex flex-col items-start gap-2 lg:items-end">
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-500">
              {meetingLoading
                ? "Checking meeting status..."
                : currentMeeting
                  ? "Meeting in progress"
                  : "No meeting in progress"}
            </div>

            {!meetingLoading && !currentMeeting ? (
              <button
                type="button"
                onClick={() => void startMeeting()}
                disabled={startingMeeting}
                className="rounded-xl bg-[#1C1C1E] px-4 py-2 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                {startingMeeting
                  ? "Starting..."
                  : "Start Meeting"}
              </button>
            ) : currentMeeting ? (
              <p className="max-w-xs text-right text-xs text-gray-500">
                {currentMeeting.title}
              </p>
            ) : null}
          </div>
        </div>

        {meetingError ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {meetingError}
          </div>
        ) : null}

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">
              Weekly Executive Meeting
            </p>

            <p className="mt-1 text-sm font-medium text-[#1C1C1E]">
              Monday · 10:00 AM WITA
            </p>
          </div>

          <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">
              Founder / COO Strategy Review
            </p>

            <p className="mt-1 text-sm font-medium text-[#1C1C1E]">
              Friday · 4:00 PM WITA
            </p>
          </div>
        </div>
      </div>

      <MeetingStage participants={participants} />

      <MeetingPresenceTestPanel
        onKhayeSpeaking={() =>
          setSpeaker("founder-khaye")
        }
        onJakeThinking={() => {
          if (jakeId) {
            setThinking(jakeId);
          }
        }}
        onMonaSpeaking={() => {
          if (monaId) {
            setSpeaker(monaId);
          }
        }}
        onLolaFlagging={() => {
          if (lolaId) {
            setFlagging(lolaId);
          }
        }}
        onReset={resetRoom}
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">
            Conversation Layer
          </p>

          <h3 className="mt-2 text-base font-semibold text-[#1C1C1E]">
            Speak to the room
          </h3>

          <p className="mt-2 text-sm leading-6 text-gray-500">
            Text input is connected first. Voice will use
            the same meeting-turn system once the realtime
            audio layer is added.
          </p>

          <textarea
            value={draftTurn}
            onChange={(event) =>
              setDraftTurn(event.target.value)
            }
            disabled={
              !currentMeeting || sendingTurn
            }
            rows={4}
            placeholder={
              currentMeeting
                ? "Say something to the team..."
                : "Start a meeting first..."
            }
            className="mt-4 w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-[#1C1C1E] outline-none transition placeholder:text-gray-400 focus:border-gray-400 disabled:cursor-not-allowed disabled:bg-gray-50"
          />

          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-xs text-gray-400">
              {lastSavedTurn
                ? `Saved as turn #${lastSavedTurn.turn_order}`
                : "Meeting history is stored in Supabase."}
            </p>

            <button
              type="button"
              onClick={() =>
                void submitFounderTurn()
              }
              disabled={
                !currentMeeting ||
                sendingTurn ||
                !draftTurn.trim()
              }
              className="rounded-xl bg-[#1C1C1E] px-4 py-2 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sendingTurn ? "Saving..." : "Send"}
            </button>
          </div>

          {turnError ? (
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {turnError}
            </div>
          ) : null}

          {currentMeeting &&
          meetingTurns.length > 0 ? (
            <div className="mt-4 border-t border-gray-100 pt-4">
              {jakePreview ? (
                <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">
                    Jake Decision Preview
                  </p>

                  <p className="mt-2 text-sm text-gray-700">
                    Action:{" "}
                    <span className="font-semibold">
                      {jakePreview.action}
                    </span>
                  </p>

                  <p className="mt-1 text-sm text-gray-700">
                    Room acknowledgement:{" "}
                    <span className="font-semibold">
                      {jakePreview.acknowledgeRoom
                        ? "Yes"
                        : "No"}
                    </span>
                  </p>

                  {jakePreview.targetAgentKey ? (
                    <p className="mt-1 text-sm text-gray-700">
                      Handoff:{" "}
                      <span className="font-semibold">
                        {jakePreview.targetAgentKey}
                      </span>
                    </p>
                  ) : null}

                  {jakePreview.reply ? (
                    <p className="mt-3 text-sm leading-6 text-gray-600">
                      “{jakePreview.reply}”
                    </p>
                  ) : null}
                </div>
              ) : null}

              {orchestrationError ? (
                <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {orchestrationError}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">
            Meeting Memory
          </p>

          <h3 className="mt-2 text-base font-semibold text-[#1C1C1E]">
            Conversation history
          </h3>

          {turnsLoading ? (
            <p className="mt-3 text-sm text-gray-500">
              Loading meeting history...
            </p>
          ) : meetingTurns.length > 0 ? (
            <div className="mt-4 max-h-72 space-y-3 overflow-y-auto">
              {meetingTurns.map((turn) => (
                <div
                  key={turn.id}
                  className="rounded-xl border border-gray-100 bg-gray-50 p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold text-[#1C1C1E]">
                      {turn.speaker_name_snapshot}
                    </p>

                    <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-gray-400">
                      Turn #{turn.turn_order}
                    </p>
                  </div>

                  <p className="mt-2 text-sm leading-6 text-gray-600">
                    {turn.content}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm leading-6 text-gray-500">
              No conversation has been recorded in this
              meeting yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}