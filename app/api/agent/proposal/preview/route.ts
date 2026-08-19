import {
  loadAgentProposalData,
} from "@/lib/agent-proposal-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request
) {
  try {
    const result =
      await loadAgentProposalData(
        request
      );

    if (
      result instanceof Response
    ) {
      return result;
    }

    return Response.json(
      {
        proposal:
          result.proposalData,
      },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "Agent proposal preview error:",
      error
    );

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Proposal preview could not be loaded.",
      },
      {
        status: 500,
      }
    );
  }
}
