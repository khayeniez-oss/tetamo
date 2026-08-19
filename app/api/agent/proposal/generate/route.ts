import {
  sanitizeProposalFileName,
} from "@/lib/agent-proposal";
import {
  generateAgentProposalPdf,
} from "@/lib/agent-proposal-pdf";
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

    const {
      proposalData,
      mode,
    } = result;

    const pdfBuffer =
      await generateAgentProposalPdf(
        proposalData
      );

    const baseName =
      mode === "portfolio"
        ? `tetamo-property-portfolio-${proposalData.buyerName || "buyer"}`
        : `tetamo-property-proposal-${proposalData.properties[0]?.kode || proposalData.properties[0]?.title || "property"}`;

    const fileName =
      `${sanitizeProposalFileName(
        baseName
      )}.pdf`;

    return new Response(
      new Uint8Array(
        pdfBuffer
      ),
      {
        status: 200,
        headers: {
          "Content-Type":
            "application/pdf",
          "Content-Disposition":
            `attachment; filename="${fileName}"`,
          "Cache-Control":
            "no-store",
          "X-Tetamo-Proposal-Mode":
            mode,
        },
      }
    );
  } catch (error) {
    console.error(
      "Agent proposal PDF generation error:",
      error
    );

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Proposal could not be generated.",
      },
      {
        status: 500,
      }
    );
  }
}
