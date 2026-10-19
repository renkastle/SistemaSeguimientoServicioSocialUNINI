import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { Chat } from "./chat";

const SUGGESTIONS = {
  STUDENT: [
    "¿Cuáles son los requisitos para liberar mi servicio social?",
    "Ayúdame a redactar objetivos medibles para mi proyecto",
    "¿Cómo voy con mis horas?",
    "Dame ideas de actividades sobre el plato del bien comer para primaria",
  ],
  STAFF: [
    "Resume el estado de todos mis proyectos y señala los que están en riesgo",
    "¿Qué estudiantes van atrasados en horas?",
    "¿Qué dice el reglamento sobre bajas del servicio social?",
    "Redacta retroalimentación constructiva para un proyecto con objetivos poco claros",
  ],
};

export default async function AssistantPage({ params }: { params: Promise<{ org: string }> }) {
  const { org } = await params;
  const s = await requireUser(org);
  const history = await db.chatMessage.findMany({ where: { userId: s.userId }, orderBy: { createdAt: "asc" }, take: 50 });
  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-3xl flex-col">
      <PageHeader title="Asistente IA" subtitle="Responde con base en la base de conocimiento de la organización y tu información en la plataforma." />
      <Chat
        initial={history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content }))}
        suggestions={s.role === "STUDENT" ? SUGGESTIONS.STUDENT : SUGGESTIONS.STAFF}
      />
    </div>
  );
}
