const OLLAMA_URL = (process.env.OLLAMA_BASE_URL || "http://localhost:11434/v1").replace(/\/v1\/?$/, "");

export async function GET() {
  try {
    // /api/tags lists installed models, /api/ps lists the ones loaded in memory right now
    const [tagsResponse, psResponse] = await Promise.all([
      fetch(`${OLLAMA_URL}/api/tags`, { cache: "no-store", signal: AbortSignal.timeout(5_000) }),
      fetch(`${OLLAMA_URL}/api/ps`, { cache: "no-store", signal: AbortSignal.timeout(5_000) }),
    ]);

    const { models: installed = [] } = await tagsResponse.json();
    const { models: loaded = [] } = await psResponse.json();
    const loadedNames = new Set(loaded.map((m) => m.name));

    const models = installed.map((m) => ({
      name: m.name,
      sizeGb: Math.round((m.size / 1e9) * 10) / 10,
      parameterSize: m.details?.parameter_size,
      supportsTools: (m.capabilities || []).includes("tools"),
      loaded: loadedNames.has(m.name),
    }));

    return Response.json({ models });
  } catch (error) {
    return Response.json(
      { error: `Can't reach Ollama at ${OLLAMA_URL}: ${error.message}` },
      { status: 502 },
    );
  }
}
