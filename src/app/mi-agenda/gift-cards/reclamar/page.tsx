import { redirect } from "next/navigation";
import { getClientPortalAccount } from "@/server/services/client-portal.service";
import { ClaimGiftCard } from "./claim-gift-card";

export default async function ClaimByCodePage() {
  const account = await getClientPortalAccount();
  if (!account) redirect("/mi-agenda?returnTo=%2Fmi-agenda%2Fgift-cards%2Freclamar");
  return <ClaimGiftCard />;
}
