import { run } from "@openai/agents";
import { opsAgent } from "../../../lib/agent";
import { saveInvestigation } from "../../../lib/db";

export async function POST(request) {
  const encoder = new TextEncoder();

  // Object => String => bytes => Stream
  const stream = new ReadableStream({
    async start(controller) {
      function send(event) {
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      }

      const toolResults = [];

      try {
        const result = await run(opsAgent, "Investigate orders-api.", {
          stream: true,
          maxTurns: 6,
          signal: AbortSignal.any([
            request.signal,
            AbortSignal.timeout(60_000),
          ]),
        });

        for await (const event of result) {
          if (event.type !== "run_item_stream_event") {
            continue;
          }

          if (event.item.type === "tool_call_item") {
            const tool = event.item.rawItem.name;

            send({
              type: "tool_called",
              tool,
            });
          }

          if (event.item.type === "tool_call_output_item") {
            send({
              type: "tool_output",
              output: event.item.output,
            });

            toolResults.push({
              output: event.item.output,
            });
          }
        }
        await result.completed;

        if (result.cancelled) {
          throw new Error("החקירה נעצרה: עברה דקה או שהדפדפן נסגר");
        }

        const report = result.finalOutput;
        send({ type: "report", report });

        await saveInvestigation({ createdAT: new Date(), toolResults, report });
      } catch (error) {
        send({ type: "error", message: error.message });
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson" },
  });
}
