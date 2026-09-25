"use client";

export const AI_TEAM_TABS = [
  { key: "overview", label: "Overview" },
  { key: "meeting-room", label: "Meeting Room" },
  { key: "jake", label: "Jake" },
  { key: "mona", label: "Mona" },
  { key: "rupert", label: "Rupert" },
  { key: "randolph", label: "Randolph" },
  { key: "lola", label: "Lola" },
  { key: "uncle-sam", label: "Uncle Sam" },
  { key: "tasks", label: "Tasks" },
  { key: "approvals", label: "Approvals" },
  { key: "activity", label: "Activity" },
] as const;

export type AITeamTab =
  (typeof AI_TEAM_TABS)[number]["key"];

export function AITeamNavigation({
  activeTab,
  onChange,
}: {
  activeTab: AITeamTab;
  onChange: (tab: AITeamTab) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <div className="inline-flex min-w-max items-center gap-1 rounded-2xl border border-gray-200 bg-white p-1.5 shadow-sm">
        {AI_TEAM_TABS.map((tab) => {
          const active = tab.key === activeTab;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onChange(tab.key)}
              aria-pressed={active}
              className={[
                "rounded-xl px-3 py-2 text-xs font-medium transition sm:px-3.5 sm:text-sm",
                active
                  ? "bg-[#1C1C1E] text-white shadow-sm"
                  : "text-gray-500 hover:bg-gray-50 hover:text-[#1C1C1E]",
              ].join(" ")}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}