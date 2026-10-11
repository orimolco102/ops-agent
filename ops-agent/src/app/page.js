"use client";
import React, { useState } from "react";
import { readEvents } from "./read-events";

const MODELS = [
  { id: "astra", label: "Astra" },
  { id: "qwen", label: "Qwen3 14B" },
  { id: "qwen-coder", label: "Qwen3 Coder" },
];

export default function Home() {
  const [model, setModel] = useState("astra");
  const [running, setRunning] = useState(false);
  const [events, setEvents] = useState([]);
  const [report, setReport] = useState("");
  const [error, setError] = useState("");
  const [ollama, setOllama] = useState(null); // { loading, models, error }

  async function findOllamaModels() {
    setOllama({ loading: true });

    try {
      const response = await fetch("/api/ollama-models");
      const data = await response.json();
      setOllama(data.error ? { error: data.error } : { models: data.models });
    } catch (error) {
      setOllama({ error: error.message });
    }
  }

  async function investigate() {
    setRunning(true);
    setEvents([]);
    setReport("");
    setError("");

    try {
      const response = await fetch("/api/investigation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model }),
      });

      await readEvents(response, (event) => {
        if (event.type === "report") setReport(event.report);
        else if (event.type === "error") setError(event.message);
        else setEvents((prev) => [...prev, event]);
      });
    } catch (error) {
      setError(error.message);
    } finally {
      setRunning(false);
    }
  }

  return (
    <main className="chat">
      <header className="px-5 py-4 border-b border-border flex items-center gap-3">
        <div className="size-9 rounded-xl bg-accent/15 text-accent grid place-items-center font-semibold">
          DA
        </div>
        <div className="flex-1">
          <h1 className="font-semibold leading-tight">DevOps Agent</h1>
          <p className="text-xs text-muted">Investigates and explains service problems</p>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-muted">
          <span
            className={`size-2 rounded-full ${running ? "bg-accent animate-pulse" : "bg-success"}`}
          />
          {running ? "Working" : "Ready"}
        </span>
      </header>

      <div className="px-5 py-2 border-b border-border flex items-center justify-between gap-2 flex-wrap">
        <div className="flex rounded-lg border border-border bg-surface p-0.5 text-xs">
          {MODELS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setModel(m.id)}
              disabled={running}
              aria-pressed={model === m.id}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors disabled:cursor-not-allowed ${
                model === m.id ? "bg-accent text-white" : "text-muted hover:text-foreground"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={findOllamaModels}
          disabled={ollama?.loading}
          className="px-2.5 py-1 rounded-lg border border-border text-xs font-medium text-muted hover:text-foreground hover:border-accent transition-colors disabled:opacity-50"
        >
          {ollama?.loading ? "Searching…" : "Find Ollama models"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {ollama && !ollama.loading && (
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-medium uppercase tracking-wide text-muted">
                Ollama models on this PC
              </h2>
              <button
                type="button"
                onClick={() => setOllama(null)}
                className="text-xs text-muted hover:text-foreground"
              >
                Close
              </button>
            </div>

            {ollama.error && (
              <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
                {ollama.error}
              </div>
            )}

            {ollama.models?.length === 0 && (
              <p className="text-sm text-muted">No models installed. Download one with <code className="font-mono">ollama pull</code>.</p>
            )}

            {ollama.models?.length > 0 && (
              <ul className="rounded-xl border border-border divide-y divide-border">
                {ollama.models.map((m) => (
                  <li key={m.name} className="px-3 py-2 flex items-center gap-3 text-sm">
                    <span
                      title={m.loaded ? "Loaded in memory" : "Installed, not loaded"}
                      className={`size-2 rounded-full ${m.loaded ? "bg-success" : "bg-muted/40"}`}
                    />
                    <span className="font-mono flex-1 truncate">{m.name}</span>
                    <span className="text-xs text-muted whitespace-nowrap">
                      {m.parameterSize} · {m.sizeGb} GB
                    </span>
                    {!m.supportsTools && (
                      <span className="text-xs text-danger whitespace-nowrap">no tools</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {!ollama && !running && events.length === 0 && !report && !error && (
          <div className="h-full grid place-items-center text-center">
            <div className="space-y-2">
              <p className="font-medium">No investigation yet</p>
              <p className="text-sm text-muted">
                Click &ldquo;Investigate service&rdquo; to have the agent check the demo service.
              </p>
            </div>
          </div>
        )}

        {events.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-xs font-medium uppercase tracking-wide text-muted">
              What the agent is doing
            </h2>
            <ol className="space-y-2">
              {events.map((event, i) => (
                <li key={i} className="rounded-xl border border-border bg-surface px-3 py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span
                      className={`size-1.5 rounded-full ${
                        event.type === "tool_called" ? "bg-accent" : "bg-success"
                      }`}
                    />
                    <span className="font-mono">
                      {event.type === "tool_called"
                        ? `${event.tool} started`
                        : `${event.tool} returned`}
                    </span>
                  </div>

                  {event.output && (
                    <details className="mt-2 group">
                      <summary className="cursor-pointer text-xs text-muted hover:text-foreground">
                        Output
                      </summary>
                      <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-background/60 border border-border p-3 text-xs font-mono">
                        {JSON.stringify(event.output, null, 2)}
                      </pre>
                    </details>
                  )}
                </li>
              ))}
            </ol>
          </section>
        )}

        {error && (
          <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        {report && (
          <section className="space-y-2">
            <h2 className="text-xs font-medium uppercase tracking-wide text-muted">Report</h2>
            <div className="rounded-xl border border-accent/25 bg-accent/5 px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap">
              {report}
            </div>
          </section>
        )}
      </div>

      <form className="p-3 border-t border-border flex gap-2">
        <input
          className="flex-1 min-w-0 bg-transparent px-3 py-2 rounded-xl border border-border outline-none focus:border-accent transition-colors"
          placeholder="Ask about the service…"
        />
        <button
          onClick={investigate}
          disabled={running}
          className="px-4 rounded-xl bg-accent text-white text-sm font-medium whitespace-nowrap hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
        >
          {running ? "Investigating…" : "Investigate service..."}
        </button>
      </form>
    </main>
  );
}
