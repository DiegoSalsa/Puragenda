import { ClientPortalPasswordResetForm } from "../../client-portal-client";

export default async function ResetClientPortalPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <ClientPortalPasswordResetForm token={token} />;
}
