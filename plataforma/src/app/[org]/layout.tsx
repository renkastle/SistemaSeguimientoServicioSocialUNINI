import type { Metadata } from "next";
import { getOrg } from "@/lib/auth";

export async function generateMetadata({ params }: { params: Promise<{ org: string }> }): Promise<Metadata> {
  const org = await getOrg((await params).org);
  return { title: { default: org.name, template: `%s · ${org.shortName || org.name}` }, description: org.tagline ?? undefined };
}

export default async function OrgLayout({ children, params }: { children: React.ReactNode; params: Promise<{ org: string }> }) {
  const org = await getOrg((await params).org);
  return (
    <div style={{ ["--brand" as string]: org.primaryColor, ["--accent" as string]: org.accentColor }} className="min-h-screen">
      {children}
    </div>
  );
}
