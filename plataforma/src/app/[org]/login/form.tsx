"use client";

import { useActionState } from "react";
import { login } from "@/lib/actions/auth";
import { btn, input } from "@/components/ui";

export function LoginForm({ org }: { org: string }) {
  const [error, action, pending] = useActionState(login, null);
  return (
    <form action={action} className="mt-6 space-y-4">
      <input type="hidden" name="org" value={org} />
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">Correo</span>
        <input name="email" type="email" required autoComplete="email" className={input} />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">Contraseña</span>
        <input name="password" type="password" required autoComplete="current-password" className={input} />
      </label>
      {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
      <button disabled={pending} className={`${btn} w-full`}>
        {pending ? "Ingresando…" : "Ingresar"}
      </button>
    </form>
  );
}
