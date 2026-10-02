# Ritual · inventario editorial

| FIELD | EDITOR | RENDERER | STATUS |
| --- | --- | --- | --- |
| `sensorial.eyebrow` | El espacio | Pausa | Canonical |
| `sensorial.title` | El espacio | Pausa | Canonical; migrates `copy.pauseTitle` |
| `sensorial.body` | El espacio | Pausa | Canonical; migrates `copy.pauseBody` |
| `copy.heroStamp` | Portada | Sello vertical del hero | Editable; empty hides it |
| `copy.bookingPrompt` | Portada | Prompt before booking opens | Editable brand copy |
| `copy.staffDefaultLabel` | Equipo | Staff fallback label | Editable |
| `staffEditorial[id]` | Equipo | Label, note, visibility | Editable per professional |
| `galleryCategories` | Galería | Public gallery filters | Stable IDs, ordered |
| `gallery[].categoryIds` | Galería | Filter membership | Multi-category, photo retained on delete |
| `gallery[]` order | Galería | Rail/lightbox order | Drag/drop equivalent via move controls |
| `paletteMode/customPalette` | Diseño | CSS token variables | Human six-control mapping, derived contrast |
| `copy.servicesTitle/servicesNote` | Tratamientos | Services section heading | Editable |
| `copy.nav.*` | Portada > Navegación | Header and mobile nav | Editable labels, internal targets fixed |
| `brandTitle` | Legacy compatibility | Brand fallback when `displayName` is empty | Retained for snapshots; `displayName` is the editor control |
| services/staff names, prices, availability | Read-only | Booking and cards | Canonical Puragenda data |
