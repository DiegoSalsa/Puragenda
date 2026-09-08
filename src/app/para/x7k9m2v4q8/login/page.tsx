import { redirect } from "next/navigation";
import { ADMIN_SECRET_PATH } from "@/core/constants";
import { getCurrentAdminSessionUser } from "@/server/auth/admin-session";
import { AdminLoginForm } from "./admin-login-form";

export default async function AdminLoginPage() {
  const user = await getCurrentAdminSessionUser();
  if (user) redirect(ADMIN_SECRET_PATH);
  return <AdminLoginForm />;
}
