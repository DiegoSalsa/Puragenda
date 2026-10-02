# Matchday 1 — Campaign Cut

Initial state: clean `webs`, Bella 1 only. Runtime registry existed; builder, preview validation, metadata and client booking transport still referenced Bella. Draft and published snapshots shared a template identity.

## Directions considered

| Direction | Personality / reuse | Complexity / mobile / booking | SoccerBarber / cliché risk |
|---|---|---|---|
| Night Session | Raw black, grain, tight crops; reusable but dependent on dark photos | Medium; readable mobile lists; utilitarian booking | Strong street identity; risks generic dark barbershop |
| Campaign Cut | Ivory field, huge condensed names, vertical crop, red graphic interruption; broad reuse | Medium; deliberate cropped mobile hero; numbered booking | Brand language lives in content; low sports cliché risk |
| Studio Index | Quiet typography, monochrome contact sheets; most neutral | Low; straightforward mobile and booking | Good studio identity, insufficient campaign energy |

Selected: **Campaign Cut**. Reference 1 contributes graphic darkness, contrast and controlled accent. Reference 2 contributes scale, photographic layering, editorial rhythm and campaign energy. The two actual reference images were not attached; these observations refer only to the supplied descriptions. Direct visual comparison remains pending.

Original composition: full-width brand field behind an offset portrait, contrasting horizontal statement panel, numbered service index with changing photo, oversized staff contact sheets and asymmetric highlights. No copied logo, photo, typeface, navigation, text or proportions. No invented proof metrics. Football language is fixture/editor content only.

Independent `MatchdayConfig`, shared media primitives, registry-declared editor sections/capabilities/palettes/previews, template-local Oswald and Manrope fonts. Client/lazy boundaries isolate template CSS and font declarations in production (server dynamic imports alone eagerly emitted both templates' CSS). Canonical service/staff/location/availability data remain authoritative. Editor staff numbers and captions never change staff records.

Snapshots: `templateConfigs` stores version-keyed drafts. `publishedTemplateKey` and `publishedTemplateVersion` stay attached to the published config until explicit publication. Switching is tenant-scoped, revision-checked and preserves universal contact/media fields on first use, or restores the previous template draft on return. Retained snapshots protect media from deletion. Incremental migration backfills existing published identities.

QA fixtures are isolated local businesses, never production records. Synthetic demo routes are development-only and cannot write appointments. Real local tenant routes use canonical API/writer.

Complete delivery report and validation evidence: [MATCHDAY-DELIVERY.md](MATCHDAY-DELIVERY.md).
