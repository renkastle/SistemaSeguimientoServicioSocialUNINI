export function str(form: FormData, key: string): string | null {
  const v = form.get(key);
  if (v === null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

export function req(form: FormData, key: string): string {
  const s = str(form, key);
  if (!s) throw new Error(`Falta el campo ${key}`);
  return s;
}

export function num(form: FormData, key: string): number | null {
  const s = str(form, key);
  if (s === null) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function date(form: FormData, key: string): Date | null {
  const s = str(form, key);
  return s ? new Date(`${s}T12:00:00`) : null;
}
