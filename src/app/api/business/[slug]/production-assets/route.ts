import crypto from "crypto";
import { NextRequest } from "next/server";
import { getBusinessBySlug, validateApiKey } from "@/server/services/business.service";
import { bookingLimiter } from "@/server/lib/rate-limit";
import { cloudinary } from "@/server/lib/cloudinary";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_SIZE = 5 * 1024 * 1024;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const blocked = bookingLimiter.check(request);
  if (blocked) return blocked;

  const { slug } = await params;
  const business = await getBusinessBySlug(slug);
  if (!business) return Response.json({ error: "Negocio no encontrado" }, { status: 404 });
  if (!business.productionOrdersEnabled) {
    return Response.json({ error: "Los encargos no están habilitados" }, { status: 404 });
  }
  if (!validateApiKey(business, request.headers.get("x-api-key"))) {
    return Response.json({ error: "API Key invalida" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("image");
  if (!(file instanceof File)) return Response.json({ error: "Imagen requerida" }, { status: 400 });
  if (!ALLOWED_TYPES.has(file.type)) {
    return Response.json({ error: "Usa imagenes JPG, PNG o WebP" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return Response.json({ error: "Cada imagen puede pesar hasta 5MB" }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const dataUri = `data:${file.type};base64,${bytes.toString("base64")}`;
  const result = await cloudinary.uploader.upload(dataUri, {
    folder: "puragenda_order_references",
    public_id: `${business.slug}_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`,
    resource_type: "image",
    transformation: [{ width: 1600, height: 1600, crop: "limit", quality: "auto", fetch_format: "auto" }],
  });

  return Response.json({ url: result.secure_url }, { status: 201 });
}
