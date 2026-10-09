import { pinkConfigSchema } from "../templates/pink-y2k/config";
import type { Catalog, StudioService } from "../booking/types";
import type { WebsiteView } from "../types";
import type { PinkConfig } from "../templates/pink-y2k/config";

const photo = "/websites/pink-y2k/pink-dream.webp";
const locationIds = ["pink-demo-location"];
const service = (
  id: string,
  name: string,
  price: number,
  duration: number,
  description: string,
  category = "Manos",
): StudioService => ({
  id,
  name,
  price,
  duration,
  description,
  category,
  categoryId: category.toLowerCase(),
  categoryPosition: category === "Manos" ? 0 : category === "Pies" ? 1 : 2,
  image: photo,
  optionCategories: [],
  locationIds,
});
/** Example prices and fictional durations: never a live catalog. */
export function pinkDemoCatalog(): Catalog {
  const services = [
    service(
      "pink-soft-gel",
      "Soft gel + diseño",
      24990,
      90,
      "Extensiones, forma y un diseño que habla de ti.",
    ),
    service(
      "pink-kapping",
      "Kapping unicolor",
      19990,
      75,
      "Refuerza tu uña natural con tu color favorito.",
    ),
    service(
      "pink-polygel",
      "Polygel + diseño",
      26990,
      100,
      "Largo y estructura para llevar tu idea más lejos.",
    ),
    service(
      "pink-manicura",
      "Manicura básica",
      7990,
      30,
      "Limpieza y cuidado para tus manos.",
    ),
    service(
      "pink-pedicure",
      "Pedicure con esmaltado",
      18990,
      60,
      "Un toque de color, también en tus pies.",
      "Pies",
    ),
    service(
      "pink-retiro",
      "Retiro de aplicación",
      3990,
      30,
      "Retira tu set con cuidado y parte de nuevo.",
      "Retiro",
    ),
  ];
  // The existing options contract supports design and removal, without a new form.
  services[0].optionCategories = [
    {
      id: "pink-design",
      name: "Diseño de muestra",
      isRequired: true,
      maxSelections: 1,
      alternatives: [
        {
          id: "pink-design-base",
          name: "Diseño simple incluido",
          priceDelta: 0,
          durationDelta: 0,
          isHomeService: false,
        },
        {
          id: "pink-design-complex",
          name: "Diseño complejo · ejemplo",
          priceDelta: 5000,
          durationDelta: 20,
          isHomeService: false,
        },
      ],
    },
    {
      id: "pink-removal",
      name: "Retiro previo de muestra",
      isRequired: false,
      maxSelections: 1,
      alternatives: [
        {
          id: "pink-removal-new",
          name: "Retiro para nuevo set · ejemplo",
          priceDelta: 1000,
          durationDelta: 15,
          isHomeService: false,
        },
      ],
    },
  ];
  return {
    mode: "demo",
    business: {
      name: "Y2K",
      timezone: "America/Santiago",
      currency: "CLP",
    },
    supportsAnyStaff: false,
    locations: [
      {
        id: locationIds[0],
        name: "Ubicación de muestra · Viña del Mar",
        timezone: "America/Santiago",
      },
    ],
    services,
    staff: [
      {
        id: "pink-demo-artist",
        name: "Profesional de muestra",
        image: null,
        serviceIds: services.map((row) => row.id),
        locationIds,
      },
    ],
    rules: {
      staffSelection: "REQUIRED",
      allowSameDayBookings: false,
      maxDaysAhead: 90,
      depositEnabled: false,
      maxServicesPerBooking: 1,
    },
  };
}
export function pinkFixtureView(): WebsiteView<PinkConfig> {
  return {
    preview: true,
    business: {
      id: "fixture-pink-y2k",
      name: "Y2K",
      logo: null,
      address: null,
      mapsUrl: null,
    },
    catalog: pinkDemoCatalog(),
    config: pinkConfigSchema.parse({
      displayName: "Y2K",
      logo: "",
      headline: ["Tus uñas,", "tu universo."],
      intro:
        "Diseños personalizados para las que aman\nun poquito más de todo. Tú sueñas, yo lo creo.",
      city: "Viña del Mar, Chile",
      heroImage: photo,
      instagram: "",
      colors: {
        accent: "#b71863",
        ink: "#541536",
        background: "#fff0f6",
        surface: "#fffafd",
      },
      visibility: { gallery: true, pocket: true, policies: true },
      pocket: {
        name: "LOVE POCKET",
        messages: [
          {
            title: "¡Hola, nail lover!",
            body: "Tu próximo set empieza con una idea ♡",
          },
          {
            title: "Tu idea, tu estilo",
            body: "Color, brillos y un universo de posibilidades.",
          },
          {
            title: "¿Creamos tu set?",
            body: "Toca el corazón para explorar la agenda.",
          },
        ],
      },
      gallery: [
        {
          image: photo,
          name: "Pink digital dream",
          alt: "Inspiración generada con uñas rosadas, estrellas plateadas y detalles brillantes",
          category: "Pink",
          filters: [],
          focal: "center",
        },
        {
          image: "/websites/bella/portfolio/chrome.webp",
          name: "Chrome crush",
          alt: "Fotografía de muestra del repositorio: manicura con acabado cromado",
          category: "Chrome",
          filters: [],
          focal: "center",
        },
        {
          image: "/websites/bella/portfolio/art.webp",
          name: "Un poquito de nail art",
          alt: "Fotografía de muestra del repositorio: líneas rojas y cristales sobre uñas naturales",
          category: "Nail art",
          filters: [],
          focal: "center",
        },
        {
          image: "/websites/bella/portfolio/french.webp",
          name: "French, siempre",
          alt: "Fotografía de muestra del repositorio: manicura francesa",
          category: "French",
          filters: [],
          focal: "center",
        },
      ],
      policy: {
        title: "Cuidemos ese set ♡",
        body: "Las condiciones y cuidados se configuran según cada negocio. Esta es una demostración.",
        modality:
          "Estudio o domicilio: modalidad y dirección por confirmar con la profesional.",
      },
      copy: {
        reserve: "Reservar hora",
        secondary: "Ver mis trabajos",
        eyebrow: "NAIL ART CON MUCHA PERSONALIDAD",
        sticker: "más es más ♡",
        heroNote: "hechas para ser muy tú",
        servicesTitle: "Elige tu próximo crush.",
        servicesIntro:
          "Un color, un detalle o un set que lo tenga todo.\nEncuentra el punto de partida para tu idea.",
        servicesNote:
          "Los diseños complejos pueden modificar el precio base. Confirma los detalles antes de tu cita.",
        galleryTitle: "Pequeñas obras. Mucho amor.",
        galleryIntro: "Un álbum de inspiración para imaginar tu próximo set.",
        guideTitle: "De tu moodboard a tus manos.",
        guideIntro: "Elegir tu hora debería ser la parte fácil.",
        steps: [
          {
            title: "Encuentra tu idea",
            body: "Piensa en el diseño y largo que te gustaría. Guarda una referencia para conversar con la profesional.",
          },
          {
            title: "Elige tu servicio",
            body: "Selecciona tu técnica y, cuando esté disponible, agrega diseño o retiro previo.",
          },
          {
            title: "Hazle espacio",
            body: "Elige profesional, día y hora. Deja tus datos y revisa tu elección, sin crear una cuenta.",
          },
        ],
        finalTitle: "¿Lista para tu próximo set?",
        finalBody: "Un poquito de brillo. Un montón de ti.",
        footer: "Diseños con personalidad. Hechos con amor.",
      },
    }),
  };
}
