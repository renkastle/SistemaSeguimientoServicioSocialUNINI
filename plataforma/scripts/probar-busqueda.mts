// Prueba la búsqueda de la base de conocimiento sin llamar a la IA: npx tsx scripts/probar-busqueda.mts "pregunta"
import { PrismaClient } from "@prisma/client";
import { searchKnowledge } from "../src/lib/knowledge.ts";

const db = new PrismaClient();
const org = await db.organization.findUniqueOrThrow({ where: { slug: process.env.DEFAULT_ORG || "reyhan" } });
const hits = await searchKnowledge(org.id, process.argv[2] ?? "requisitos para liberar el servicio social");
for (const h of hits) console.log(`${h.score.toFixed(2)}  ${h.title}  →  ${h.excerpt.slice(0, 90).replace(/\n/g, " ")}…`);
await db.$disconnect();
