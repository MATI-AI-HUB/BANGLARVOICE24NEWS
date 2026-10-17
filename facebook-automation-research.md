# Facebook news-post automation research and implementation report

## Research findings

Meta’s current Pages API supports Page posts through the Page Feed edge and requires a Page access token plus the appropriate Page task permissions. A link post can use `message` and `link`, while a photo post uses the Page Photos edge with a public `url` and a `caption`. Meta also documents `alt_text_custom` for accessible photo descriptions. Scheduled Page posts must be within the API’s supported future window, so the project’s own scheduler remains responsible for timing rather than sending arbitrary timestamps to Meta. [1] [2]

Meta’s Original Content guidance is directly relevant to a news publisher. The safest automation path is to publish only images the project created itself or has rights to publish, and to add meaningful editorial context. A logo, border, or text overlay alone does not turn an unlicensed third-party image into original content. The project therefore keeps the existing `image_rights_verified` gate and does not treat the generated card as permission to reuse an image. [3]

Meta’s Community Standards apply to AI-generated content and emphasize authenticity, safety, privacy, and dignity. The existing newsroom gates for source URL, recency, Bengali quality, originality, numbers, risk, and image rights should remain upstream of social dispatch. [4]

The Reuters Institute’s 2025 Digital News Report describes a fragmented, increasingly social/video-led news environment while highlighting declining trust and news avoidance. The practical implication for this project is a compact, source-linked, recognizably branded post rather than engagement bait: a clear headline, one relevant visual, a short explanatory caption, and a direct article path. [5]

Public pages for BBC News, Reuters, Reuters Pictures, and The New York Times show the same broad pattern: recognizable publisher identity, a concise story-led caption, a relevant visual or video, and a route back to the publisher’s reporting. Public Facebook page rendering is not a reliable source for a complete historical template specification, so the implementation follows Meta’s documented API contract and the project’s own rights/audit rules rather than copying another publisher’s branding.

## Cross-check against the project

Before this change, the project already had several strong controls:

- a dynamic 1200×630 `/api/social-card/[id]` renderer;
- per-article headline wrapping and category label rendering;
- use of the article’s `featured_image` or `thumbnail_url` when available;
- a branded fallback background when the source image is unavailable;
- a `image_rights_verified` and HTTPS image gate in the dispatcher;
- freshness, publication status, rate-limit, daily-budget, readiness, and audit-ledger checks;
- a first-comment article link pattern for Facebook.

The important gap was in the Facebook publisher: it sent a text-only `/feed` request and never attached the generated article card. That meant the existing headline/image template was not actually used for Facebook posts.

## Implemented change

The Facebook branch now:

1. publishes to the Page Photos edge instead of a text-only Feed post;
2. sends the per-article `/api/social-card/{article_id}` URL as the photo;
3. sends the article headline plus a bounded Bengali excerpt as the photo caption;
4. sends the headline as `alt_text_custom`;
5. uses the returned `post_id` when Meta supplies one, so the first-comment article link targets the Page post rather than only the photo object;
6. retains the existing rights, freshness, readiness, rate-limit, kill-switch, and audit guards;
7. uses Meta Graph API `v26.0` for this publishing path, matching the current official documentation.

The generated picture changes automatically per article because the card route loads that article’s headline, category, and rights-approved source image. The card keeps a fixed 1200×630 layout so the visual system remains consistent while headline, image, category, and accessible description change per post.

## Safe operating contract

A Facebook post is eligible only when the article is published, no older than the social freshness window, has an HTTPS image, and has `image_rights_verified=true`. If any of those checks fail, the ledger row is skipped with an audit reason. If readiness is unavailable, the dispatcher fails closed. No post is sent by this implementation step; deployment validation must use typecheck, build, tests, card rendering, and unauthenticated guards rather than a live Facebook publish.

The next production observation should confirm that the deployed dispatcher reaches the Facebook photo branch only for an eligible, owner-approved queue row. A real Facebook post should be treated as an external publication action and performed only when the owner explicitly wants the live queue released.

## References

[1]: https://developers.facebook.com/documentation/pages-api/posts "Meta Pages API: Posts"
[2]: https://developers.facebook.com/docs/graph-api/reference/page/photos/ "Meta Graph API: Page Photos"
[3]: https://www.facebook.com/business/help/262834734651607 "Original Content Guidelines on Facebook"
[4]: https://transparency.meta.com/policies/community-standards/ "Meta Community Standards"
[5]: https://reutersinstitute.politics.ox.ac.uk/digital-news-report/2025 "Reuters Institute Digital News Report 2025"
