import Link from "next/link";
import { getOrg } from "@/lib/auth";
import { LoginForm } from "./form";

export default async function LoginPage({ params }: { params: Promise<{ org: string }> }) {
  const org = await getOrg((await params).org);
  return (
    <main className="grid min-h-screen place-items-center bg-[var(--brand)] px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl">
        <Link href={`/${org.slug}`} className="text-sm text-slate-500 hover:text-slate-700">
          ← {org.shortName || org.name}
        </Link>
        <h1 className="mt-4 text-2xl font-semibold text-slate-900">Ingresar</h1>
        <p className="mt-1 text-sm text-slate-500">Plataforma de servicio social</p>
        <LoginForm org={org.slug} />
      </div>
    </main>
  );
}
