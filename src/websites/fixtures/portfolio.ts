export const filters = ["Todo", "Minimal", "French", "Nail art", "Chrome", "Cejas", "Pestañas"] as const;
export const works = [
  { id: "red", name: "Rojo sólido", category: "Color", filters: ["Todo"], image: "/websites/bella/portfolio/red.webp", alt: "Uñas rojas brillantes sobre una superficie curva de acero; composición demostrativa" },
  { id: "chrome", name: "Chrome", category: "Acabado", filters: ["Todo", "Chrome"], image: "/websites/bella/portfolio/chrome.webp", alt: "Manicure de acabado cromo plateado sobre una esfera pulida; fotografía demostrativa" },
  { id: "french", name: "French, de cerca", category: "Forma", filters: ["Todo", "French", "Minimal"], image: "/websites/bella/portfolio/french.webp", alt: "Detalle de uñas con base translúcida y punta blanca; fotografía demostrativa" },
  { id: "art", name: "Un trazo rojo", category: "Nail art", filters: ["Todo", "Nail art"], image: "/websites/bella/portfolio/art.webp", alt: "Nail art de líneas rojas finas sobre uñas naturales; fotografía demostrativa" },
  { id: "brows", name: "Textura y dirección", category: "Cejas", filters: ["Todo", "Cejas"], image: "/websites/bella/services/brows.webp", alt: "Macro de una ceja peinada que conserva la textura del pelo; fotografía demostrativa" },
  { id: "lashes", name: "La curva justa", category: "Pestañas", filters: ["Todo", "Pestañas"], image: "/websites/bella/services/lashes.webp", alt: "Detalle lateral de pestañas sobre un ojo cerrado; fotografía demostrativa" },
] as const;
