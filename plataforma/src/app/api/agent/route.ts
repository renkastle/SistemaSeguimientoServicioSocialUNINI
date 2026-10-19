import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { runAgent } from "@/lib/agent";

export const runtime = "nodejs";

const HISTORY = 20;

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const { message } = (await req.json()) as { message?: string };
  const text = message?.trim();
  if (!text || text.length > 4000) return NextResponse.json({ error: "Mensaje inválido" }, { status: 400 });

  const previous = await db.chatMessage.findMany({ where: { userId: session.userId }, orderBy: { createdAt: "desc" }, take: HISTORY });
  await db.chatMessage.create({ data: { userId: session.userId, role: "user", content: text } });

  // Historial alternado user/assistant que termina en el mensaje nuevo.
  const history = previous
    .reverse()
    .filter((m) => m.content)
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
  while (history.length && history[0].role !== "user") history.shift();
  const merged: typeof history = [];
  for (const m of [...history, { role: "user" as const, content: text }]) {
    const last = merged[merged.length - 1];
    if (last && last.role === m.role) last.content += `\n\n${m.content}`;
    else merged.push({ ...m });
  }

  const stream = await runAgent(session, merged, async (answer) => {
    if (answer) await db.chatMessage.create({ data: { userId: session.userId, role: "assistant", content: answer } });
  });
  return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" } });
}

export async function DELETE() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  await db.chatMessage.deleteMany({ where: { userId: session.userId } });
  return NextResponse.json({ ok: true });
}
