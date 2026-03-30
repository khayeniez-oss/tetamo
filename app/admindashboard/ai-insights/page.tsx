"use client";

import { Brain, TrendingUp, ShieldAlert, Target } from "lucide-react";

export default function AdminAIInsightsPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#1C1C1E]">AI Insights</h1>
        <p className="text-sm text-gray-500">
          Future intelligence center for lead scoring, pricing suggestions, and market signals.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <Brain className="h-6 w-6 text-[#1C1C1E]" />
          <h3 className="mt-4 font-semibold text-[#1C1C1E]">Lead Scoring</h3>
          <p className="mt-2 text-sm text-gray-500">
            AI can rank leads by purchase intent and response urgency.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <TrendingUp className="h-6 w-6 text-[#1C1C1E]" />
          <h3 className="mt-4 font-semibold text-[#1C1C1E]">Pricing Suggestions</h3>
          <p className="mt-2 text-sm text-gray-500">
            AI can estimate listing price health based on city and engagement.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <ShieldAlert className="h-6 w-6 text-[#1C1C1E]" />
          <h3 className="mt-4 font-semibold text-[#1C1C1E]">Risk Detection</h3>
          <p className="mt-2 text-sm text-gray-500">
            AI can flag suspicious listings, repeated failures, and fraud patterns.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <Target className="h-6 w-6 text-[#1C1C1E]" />
          <h3 className="mt-4 font-semibold text-[#1C1C1E]">Campaign Targeting</h3>
          <p className="mt-2 text-sm text-gray-500">
            AI can suggest which city, audience, and listing type to promote next.
          </p>
        </div>
      </div>
    </div>
  );
}