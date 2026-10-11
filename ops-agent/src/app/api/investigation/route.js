import { defaultModel, models } from "../../../lib/agent";
import { saveInvestigation } from "../../../lib/db";

export async function POST(request) {
  const encoder = new TextEncoder();

  const body = await request.json().catch(() => ({}));
  const model = models[body.model] ? body.model : defaultModel;
  const { agent, runner, timeoutMs } = models[model];

  // Object => String => bytes => Stream
  const stream = new ReadableStream({
    async start(controller) {
      function send(event) {
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      }

      const toolResults = [];

      try {
        const result = await runner.run(agent, "Investigate orders-api.", {
          stream: true,
          maxTurns: 6,
          signal: AbortSignal.any([
            request.signal,
            AbortSignal.timeout(timeoutMs),
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
          const limit = timeoutMs === 60_000 ? "עברה דקה" : `עברו ${timeoutMs / 60_000} דקות`;
          throw new Error(`החקירה נעצרה: ${limit} או שהדפדפן נסגר`);
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
