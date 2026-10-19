"use client";

import { useEffect, useRef, useState } from "react";
import { Markdown } from "@/components/markdown";
import { btn, input } from "@/components/ui";

type Msg = { role: "user" | "assistant"; content: string };

export function Chat({ initial, suggestions }: { initial: Msg[]; suggestions: string[] }) {
  const [messages, setMessages] = useState<Msg[]>(initial);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => bottom.current?.scrollIntoView({ behavior: "smooth" }), [messages]);

  async function send(content: string) {
    if (!content.trim() || busy) return;
    setBusy(true);
    setText("");
    setMessages((m) => [...m, { role: "user", content }, { role: "assistant", content: "" }]);
    try {
      const res = await fetch("/api/agent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: content }) });
      if (!res.ok || !res.body) throw new Error();
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: "assistant", content: copy[copy.length - 1].content + chunk };
          return copy;
        });
      }
    } catch {
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { role: "assistant", content: "⚠️ No se pudo conectar con el asistente." };
        return copy;
      });
    } finally {
      setBusy(false);
    }
  }

  async function clear() {
    await fetch("/api/agent", { method: "DELETE" });
    setMessages([]);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-slate-200 bg-white">
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="grid gap-2 sm:grid-cols-2">
            {suggestions.map((s) => (
              <button key={s} onClick={() => send(s)} className="rounded-lg border border-slate-200 p-3 text-left text-sm text-slate-700 hover:border-[var(--brand)] hover:bg-slate-50">
                {s}
              </button>
            ))}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${m.role === "user" ? "bg-[var(--brand)] text-white" : "prose-lite bg-slate-100 text-slate-800"}`}>
              {m.role === "assistant" ? (
                m.content ? <Markdown text={m.content} /> : <span className="animate-pulse text-slate-500">Buscando en la base de conocimiento…</span>
              ) : (
                <span className="whitespace-pre-wrap">{m.content}</span>
              )}
            </div>
          </div>
        ))}
        <div ref={bottom} />
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(text);
        }}
        className="flex gap-2 border-t border-slate-200 p-3"
      >
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Escribe tu pregunta…" className={input} disabled={busy} />
        <button disabled={busy || !text.trim()} className={btn}>
          Enviar
        </button>
        {messages.length > 0 && (
          <button type="button" onClick={clear} disabled={busy} className="text-xs text-slate-500 hover:text-rose-600" title="Borrar conversación">
            Limpiar
          </button>
        )}
      </form>
    </div>
  );
}
