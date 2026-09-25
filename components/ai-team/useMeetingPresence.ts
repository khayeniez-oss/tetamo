"use client";

import {
  useCallback,
  useMemo,
  useState,
} from "react";

import type { MeetingPresenceState } from "@/components/ai-team/MeetingStage";

export type MeetingParticipantId =
  | "founder-khaye"
  | "advisor-koot"
  | string;

type PresenceMap = Record<
  MeetingParticipantId,
  MeetingPresenceState
>;

export function useMeetingPresence(
  participantIds: MeetingParticipantId[]
) {
  const initialPresence = useMemo(() => {
    return participantIds.reduce<PresenceMap>(
      (acc, participantId) => {
        acc[participantId] = "idle";
        return acc;
      },
      {}
    );
  }, [participantIds]);

  const [presence, setPresence] =
    useState<PresenceMap>(initialPresence);

  const resetRoom = useCallback(() => {
    setPresence(
      participantIds.reduce<PresenceMap>(
        (acc, participantId) => {
          acc[participantId] = "idle";
          return acc;
        },
        {}
      )
    );
  }, [participantIds]);

  const setParticipantState = useCallback(
    (
      participantId: MeetingParticipantId,
      state: MeetingPresenceState
    ) => {
      setPresence((current) => ({
        ...current,
        [participantId]: state,
      }));
    },
    []
  );

  const setSpeaker = useCallback(
    (participantId: MeetingParticipantId) => {
      setPresence(() =>
        participantIds.reduce<PresenceMap>(
          (acc, id) => {
            acc[id] =
              id === participantId
                ? "speaking"
                : "listening";

            return acc;
          },
          {}
        )
      );
    },
    [participantIds]
  );

  const setThinking = useCallback(
    (participantId: MeetingParticipantId) => {
      setPresence((current) => ({
        ...current,
        [participantId]: "thinking",
      }));
    },
    []
  );

  const setAcknowledging = useCallback(
    (participantId: MeetingParticipantId) => {
      setPresence((current) => ({
        ...current,
        [participantId]: "acknowledging",
      }));
    },
    []
  );

  const setFlagging = useCallback(
    (participantId: MeetingParticipantId) => {
      setPresence((current) => ({
        ...current,
        [participantId]: "flagging",
      }));
    },
    []
  );

  const setListening = useCallback(
    (participantId: MeetingParticipantId) => {
      setPresence((current) => ({
        ...current,
        [participantId]: "listening",
      }));
    },
    []
  );

  const getParticipantState = useCallback(
    (
      participantId: MeetingParticipantId
    ): MeetingPresenceState => {
      return presence[participantId] ?? "idle";
    },
    [presence]
  );

  return {
    presence,
    resetRoom,
    setParticipantState,
    setSpeaker,
    setThinking,
    setAcknowledging,
    setFlagging,
    setListening,
    getParticipantState,
  };
}