import { createFileRoute } from "@tanstack/react-router";

/**
 * Google AdSense ads.txt, generated from the deployment environment so the
 * publisher id never has to be hand-edited per host.
 *
 * Set either ADSENSE_PUBLISHER_ID (server env, e.g. "pub-1234567890123456")
 * or VITE_ADSENSE_CLIENT ("ca-pub-1234567890123456").
 */
export const Route = createFileRoute("/ads.txt")({
  server: {
    handlers: {
      GET: async () => {
        const raw =
          process.env['ADSENSE_PUBLISHER_ID'] ??
          process.env['VITE_ADSENSE_CLIENT'] ??
          "";
        const pub = raw.trim().replace(/^ca-/, "");

        const body = pub
          ? `google.com, ${pub}, DIRECT, f08c47fec0942fa0\n`
          : `# Set ADSENSE_PUBLISHER_ID (pub-XXXXXXXXXXXXXXXX) to activate AdSense.\n`;

        return new Response(body, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
