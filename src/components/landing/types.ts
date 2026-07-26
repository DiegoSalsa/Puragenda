export interface LandingIdentityProps {
  user?: { name: string } | null;
  business?: { name: string; logoUrl?: string | null } | null;
}
