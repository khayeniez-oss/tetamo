"use client";

type MeetingPresenceTestPanelProps = {
  onKhayeSpeaking: () => void;
  onJakeThinking: () => void;
  onMonaSpeaking: () => void;
  onLolaFlagging: () => void;
  onReset: () => void;
};

export function MeetingPresenceTestPanel({
  onKhayeSpeaking,
  onJakeThinking,
  onMonaSpeaking,
  onLolaFlagging,
  onReset,
}: MeetingPresenceTestPanelProps) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-4">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">
          Developer Test Controls
        </p>

        <p className="mt-1 text-xs text-gray-500">
          Temporary controls for testing Meeting Room presence
          states. These will not remain in the final UI.
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onKhayeSpeaking}
          className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium text-[#1C1C1E] hover:bg-gray-100"
        >
          Khaye Speaks
        </button>

        <button
          type="button"
          onClick={onJakeThinking}
          className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium text-[#1C1C1E] hover:bg-gray-100"
        >
          Jake Thinks
        </button>

        <button
          type="button"
          onClick={onMonaSpeaking}
          className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium text-[#1C1C1E] hover:bg-gray-100"
        >
          Mona Speaks
        </button>

        <button
          type="button"
          onClick={onLolaFlagging}
          className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium text-[#1C1C1E] hover:bg-gray-100"
        >
          Lola Flags
        </button>

        <button
          type="button"
          onClick={onReset}
          className="rounded-xl bg-[#1C1C1E] px-3 py-2 text-xs font-medium text-white hover:bg-black"
        >
          Reset Room
        </button>
      </div>
    </div>
  );
}