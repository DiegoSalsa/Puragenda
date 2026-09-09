import { prisma } from "@/server/db/prisma";

export const dynamic = "force-dynamic";

export default async function GiftCardResultPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ purchaseId?: string }> }) {
  const { slug } = await params; const query = await searchParams;
  const purchase = query.purchaseId ? await prisma.giftCardPurchase.findFirst({ where: { id: query.purchaseId, business: { slug } }, select: { paymentStatus: true, giftCard: { select: { publicCode: true } } } }) : null;
  const paid = purchase && ["PAID", "MANUAL_PAID"].includes(purchase.paymentStatus);
  return <main className="flex min-h-screen items-center justify-center bg-[#fffaf0] p-5 text-black"><div className="w-full max-w-lg rounded-3xl border-4 border-black bg-white p-8 text-center shadow-[10px_10px_0_#000]"><div className="text-5xl">{paid ? "🎁" : "⏳"}</div><h1 className="mt-4 text-3xl font-black">{paid ? "Tu Gift Card está lista" : "Estamos confirmando tu pago"}</h1><p className="mt-3 font-medium text-black/60">{paid ? `Código ${purchase.giftCard?.publicCode}. También enviamos el correo de entrega.` : "La Gift Card se emite únicamente cuando Mercado Pago confirma el pago por webhook. Puedes volver a revisar en unos instantes."}</p><a href={`/widget/${slug}/gift-cards`} className="mt-6 inline-block rounded-xl border-2 border-black bg-[#ffb5e8] px-5 py-3 font-black shadow-[4px_4px_0_#000]">Volver a Gift Cards</a></div></main>;
}
