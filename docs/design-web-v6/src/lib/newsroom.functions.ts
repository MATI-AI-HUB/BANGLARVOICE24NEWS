import { createServerFn } from "@tanstack/react-start";
import { getPublishedStory } from "./newsroom.server";

export const fetchPublishedStory = createServerFn({ method: "GET" })
  .inputValidator((input: { slug: string }) => ({ slug: String(input?.slug ?? "") }))
  .handler(async ({ data }) => getPublishedStory(data.slug));
