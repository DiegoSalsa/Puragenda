import { ThemeNeoBrutalism } from "@/components/landing/ThemeNeoBrutalism";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Puragenda - El software de reservas más poderoso",
  description: "Agenda, fidelización, email marketing y widget de marca blanca en un solo lugar.",
};

export default async function HomePage() {
  const user = await getCurrentSessionUser();
  const business = user ? await getBusinessForUser(user.id) : null;
  return (
    <ThemeNeoBrutalism user={user} business={business} />
  );
}