import { createFileRoute } from "@tanstack/react-router";

/** Live Dhaka weather for the masthead strip (Open-Meteo, no API key). */
export const Route = createFileRoute("/api/public/weather")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const res = await fetch(
            "https://api.open-meteo.com/v1/forecast?latitude=23.8103&longitude=90.4125&current=temperature_2m,weather_code&timezone=Asia%2FDhaka",
            { headers: { accept: "application/json" } },
          );
          if (!res.ok) throw new Error(`upstream ${res.status}`);
          const data = (await res.json()) as {
            current?: { temperature_2m?: number; weather_code?: number };
          };
          return Response.json(
            {
              city: "Dhaka",
              cityBn: "ঢাকা",
              temperature: Math.round(data.current?.temperature_2m ?? 0),
              code: data.current?.weather_code ?? 0,
            },
            { headers: { "Cache-Control": "public, max-age=900" } },
          );
        } catch {
          return Response.json({ error: "weather_unavailable" }, { status: 503 });
        }
      },
    },
  },
});
