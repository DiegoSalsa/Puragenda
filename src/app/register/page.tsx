import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarClock } from "lucide-react";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { RegisterForm } from "./register-form";

export default async function RegisterPage() {
  const user = await getCurrentSessionUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6 py-12">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-44 left-1/2 h-[26rem] w-[26rem] -translate-x-1/2 rounded-full bg-[#7C3AED]/8 blur-[120px]" />
      </div>

      <div className="w-full max-w-md space-y-6">
        <Link href="/" className="mx-auto flex w-fit items-center">
          <img src="/logos/logo-black.svg" alt="Puragenda Logo" className="h-10 w-auto scale-[2.5] origin-center dark:hidden" />
          <img src="/logos/logo-white.svg" alt="Puragenda Logo" className="hidden h-10 w-auto scale-[2.5] origin-center dark:block" />
        </Link>

        <RegisterForm />
      </div>
    </main>
  );
}
