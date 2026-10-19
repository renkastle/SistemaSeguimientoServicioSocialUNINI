import "server-only";
import IA from "@anthropic-ai/sdk";
import { z } from "zod";
import { db } from "./db";
import { projectScope, type Session } from "./auth";
import { searchKnowledge } from "./knowledge";
import { hoursByStudent } from "./stats";

const MODEL = process.env.IA_MODELO ?? "";
const MAX_TURNS = 8;

const client = new IA({ apiKey: process.env.IA_API_KEY });

const SearchInput = z.object({ query: z.string().min(1) });
const DocInput = z.object({ doc_id: z.string().min(1) });
const EmptyInput = z.object({}).passthrough();

type ToolDef = { tool: IA.Beta.BetaTool; run: (input: unknown) => Promise<string> };

function buildTools(s: Session): ToolDef[] {
  const tools: ToolDef[] = [
    {
      tool: {
        name: "buscar_conocimiento",
        description:
          "Busca en la base de conocimiento de la organización (guías, reglamentos de servicio social, contenidos de nutrición y vida saludable, plantillas, preguntas frecuentes). Devuelve fragmentos con su doc_id. Úsala antes de responder cualquier pregunta sobre procesos, requisitos o contenidos de la organización. Puedes llamarla varias veces con distintas palabras clave.",
        input_schema: {
          type: "object",
          properties: { query: { type: "string", description: "Palabras clave o pregunta en español" } },
          required: ["query"],
        },
      },
      run: async (input) => {
        const { query } = SearchInput.parse(input);
        const hits = await searchKnowledge(s.organizationId, query);
        if (!hits.length) return "Sin resultados para esa búsqueda. Intenta con otras palabras clave.";
        return hits
          .map((h) => `<fragmento doc_id="${h.docId}" titulo="${h.title}" categoria="${h.category}"${h.sourceUrl ? ` fuente="${h.sourceUrl}"` : ""}>\n${h.excerpt}\n</fragmento>`)
          .join("\n\n");
      },
    },
    {
      tool: {
        name: "leer_documento",
        description: "Lee el contenido completo de un documento de la base de conocimiento por su doc_id, cuando un fragmento no basta.",
        input_schema: { type: "object", properties: { doc_id: { type: "string" } }, required: ["doc_id"] },
      },
      run: async (input) => {
        const { doc_id } = DocInput.parse(input);
        const doc = await db.knowledgeDoc.findFirst({ where: { id: doc_id, organizationId: s.organizationId } });
        return doc ? `# ${doc.title}\n\n${doc.content}` : "Documento no encontrado.";
      },
    },
  ];

  if (s.role === "STUDENT") {
    tools.push({
      tool: {
        name: "mi_avance",
        description: "Consulta el avance del estudiante actual: cohorte, horas validadas y pendientes, proyectos con su estado, hitos y último comentario del tutor.",
        input_schema: { type: "object", properties: {} },
      },
      run: async () => {
        const st = await db.studentProfile.findUnique({
          where: { userId: s.userId },
          include: {
            university: true,
            memberships: { include: { cohort: { include: { tutor: true } } } },
            projects: { include: { milestones: true, reviews: { orderBy: { createdAt: "desc" }, take: 1 } } },
          },
        });
        if (!st) return "Sin perfil de estudiante.";
        const h = (await hoursByStudent([st.id])).get(st.id)!;
        return JSON.stringify({
          universidad: st.university ? `${st.university.name} ${st.university.campus ?? ""} (${st.university.country})` : null,
          cohortes: st.memberships.map((m) => ({
            nombre: m.cohort.name,
            tutor: m.cohort.tutor?.name,
            horasRequeridas: m.cohort.requiredHours,
            fin: m.cohort.endDate.toISOString().slice(0, 10),
          })),
          horasValidadas: h.approved,
          horasPendientes: h.pending,
          proyectos: st.projects.map((p) => ({
            titulo: p.title,
            estado: p.status,
            avance: p.progress,
            hitos: p.milestones.map((m) => ({ titulo: m.title, hecho: m.done, fecha: m.dueDate?.toISOString().slice(0, 10) })),
            ultimoComentarioTutor: p.reviews[0]?.comment,
          })),
        });
      },
    });
  } else {
    tools.push({
      tool: {
        name: "consolidar_proyectos",
        description:
          "Devuelve la información consolidada de los proyectos a cargo del tutor (o de toda la organización si es administrador): estudiante, universidad, estado, avance, horas, hitos y las notas de seguimiento más recientes. Úsala para resúmenes, detectar riesgos o preparar reportes.",
        input_schema: { type: "object", properties: {} },
      },
      run: async (input) => {
        EmptyInput.parse(input ?? {});
        const projects = await db.project.findMany({
          where: projectScope(s),
          include: {
            student: { include: { user: true, university: true } },
            cohort: true,
            milestones: true,
            notes: { orderBy: { createdAt: "desc" }, take: 3 },
          },
        });
        const hours = await hoursByStudent([...new Set(projects.map((p) => p.studentId))]);
        return JSON.stringify(
          projects.map((p) => ({
            proyecto: p.title,
            estudiante: p.student.user.name,
            universidad: p.student.university?.name,
            cohorte: p.cohort.name,
            estado: p.status,
            avance: p.progress,
            horasValidadas: hours.get(p.studentId)?.approved,
            horasRequeridas: p.cohort.requiredHours,
            hitos: `${p.milestones.filter((m) => m.done).length}/${p.milestones.length}`,
            notasRecientes: p.notes.map((n) => `${n.createdAt.toISOString().slice(0, 10)} [${n.kind}] ${n.content}`),
          })),
        );
      },
    });
  }
  return tools;
}

async function systemPrompt(s: Session) {
  const org = await db.organization.findUniqueOrThrow({ where: { id: s.organizationId } });
  const who =
    s.role === "STUDENT"
      ? `Hablas con ${s.name}, estudiante que realiza su servicio social. Ayúdale a entender requisitos y procesos, a diseñar y mejorar su proyecto comunitario y a aprender los contenidos de la organización.`
      : `Hablas con ${s.name}, ${s.role === "TUTOR" ? "tutor/a" : "administrador/a"} del programa de servicio social. Ayúdale a consolidar la información de los proyectos, detectar riesgos y redactar retroalimentación.`;
  return `Eres el asistente del programa de servicio social de ${org.name}.
${org.mission ? `Misión de la organización:\n${org.mission}\n` : ""}
${who}

Cómo responder:
- Responde en español, con calidez y de forma concisa.
- Para preguntas sobre procesos, requisitos, reglamentos o contenidos de la organización, consulta primero la base de conocimiento con buscar_conocimiento y basa tu respuesta en lo que encuentres. Menciona el título del documento del que sale la información.
- Si la base de conocimiento no tiene la respuesta, dilo con claridad y sugiere consultar con el tutor; no inventes requisitos, fechas ni reglas.
- Puedes aportar orientación general (por ejemplo, cómo redactar un objetivo medible) dejando claro que es una sugerencia.
- No hagas el trabajo por el estudiante: guía, da ejemplos y haz preguntas que le ayuden a pensar.
- Usa listas cortas y **negritas** cuando ayuden; evita tablas.
${org.agentPrompt ? `\nIndicaciones adicionales de la organización:\n${org.agentPrompt}` : ""}`;
}

/**
 * Ejecuta el agente con streaming y devuelve un ReadableStream de texto.
 * Bucle manual de herramientas: búsqueda en la base de conocimiento + datos del usuario.
 */
export async function runAgent(s: Session, history: IA.Beta.BetaMessageParam[], onDone: (text: string) => Promise<void>) {
  const tools = buildTools(s);
  const system = await systemPrompt(s);
  const messages = [...history];
  const encoder = new TextEncoder();

  if (!MODEL || !process.env.IA_API_KEY) {
    const msg = "⚠️ El asistente no está configurado. Pide a la administración que agregue IA_API_KEY e IA_MODELO.";
    await onDone(msg);
    return new ReadableStream<Uint8Array>({ start: (c) => (c.enqueue(encoder.encode(msg)), c.close()) });
  }

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      let finalText = "";
      const emit = (t: string) => {
        finalText += t;
        controller.enqueue(encoder.encode(t));
      };
      try {
        for (let turn = 0; turn < MAX_TURNS; turn++) {
          const stream = client.beta.messages.stream({
            model: MODEL,
            max_tokens: 16000,
            output_config: { effort: "low" },
            betas: ["server-side-fallback-2026-07-01"],
            fallbacks: "default",
            cache_control: { type: "ephemeral" },
            system,
            tools: tools.map((t) => t.tool),
            messages,
          });
          stream.on("text", emit);
          const message = await stream.finalMessage();

          if (message.stop_reason === "refusal") {
            emit("\n\nNo puedo ayudar con esa solicitud. Si tienes dudas, consulta con tu tutor.");
            break;
          }
          const toolUses = message.content.filter((b): b is IA.Beta.BetaToolUseBlock => b.type === "tool_use");
          if (message.stop_reason !== "tool_use" || toolUses.length === 0) break;

          messages.push({ role: "assistant", content: message.content });
          const results: IA.Beta.BetaToolResultBlockParam[] = await Promise.all(
            toolUses.map(async (tu) => {
              const def = tools.find((t) => t.tool.name === tu.name);
              try {
                if (!def) throw new Error(`Herramienta desconocida: ${tu.name}`);
                return { type: "tool_result" as const, tool_use_id: tu.id, content: await def.run(tu.input) };
              } catch (err) {
                return { type: "tool_result" as const, tool_use_id: tu.id, is_error: true, content: String(err instanceof Error ? err.message : err) };
              }
            }),
          );
          messages.push({ role: "user", content: results });
          if (finalText && !finalText.endsWith("\n")) emit("\n\n");
        }
      } catch (err) {
        if (err instanceof IA.AuthenticationError) emit("⚠️ El asistente no está configurado (falta IA_API_KEY).");
        else if (err instanceof IA.RateLimitError) emit("⚠️ El asistente está saturado. Intenta de nuevo en un momento.");
        else if (err instanceof IA.APIError) emit(`⚠️ Error del asistente (${err.status}). Intenta de nuevo.`);
        else {
          console.error(err);
          emit("⚠️ Ocurrió un error inesperado.");
        }
      } finally {
        await onDone(finalText.trim());
        controller.close();
      }
    },
  });
}
