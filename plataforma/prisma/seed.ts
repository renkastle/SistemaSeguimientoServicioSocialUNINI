/**
 * Datos de ejemplo. Ejecuta: npm run db:seed
 * Para dar de alta OTRA asociación copia el bloque de createOrganization() con su slug y contenido.
 *
 * Usuarios de prueba (todas las organizaciones): contraseña "demo1234"
 *   admin@<slug>.org, tutor@<slug>.org, tutora2@<slug>.org, estudiante@<slug>.org
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();
const DEMO_PASSWORD = "demo1234";
const day = (n: number) => new Date(Date.now() + n * 86400000);

const KNOWLEDGE = [
  {
    title: "Reglamento de servicio social",
    category: "Servicio social",
    content: `Requisitos para iniciar
Para iniciar el servicio social en la fundación, el estudiante debe contar con al menos el 70% de créditos de su carrera (o lo que indique su universidad), carta de presentación de su universidad y registro en la plataforma.

Duración y horas
El servicio social se cubre en un mínimo de 6 meses y un máximo de 2 años. Las horas requeridas las define cada cohorte; normalmente son 480 horas. Solo cuentan las horas validadas por el tutor en la plataforma.

Registro de horas
Cada actividad se registra en la sección "Horas" con fecha, horas, descripción de la actividad y, de preferencia, un enlace a evidencia (fotografía, lista de asistencia, material). No se aceptan registros de más de 8 horas en un solo día sin justificación.

Proyecto
Cada estudiante debe proponer un proyecto comunitario alineado con la misión de la fundación. El proyecto debe ser aprobado por el tutor antes de registrar horas de ejecución. Las horas de diseño del proyecto sí cuentan.

Bajas
El estudiante puede solicitar su baja por escrito a su tutor. Tres semanas sin registrar actividad ni comunicarse con el tutor pueden causar baja del programa.

Liberación y constancia
Al completar las horas requeridas, concluir el proyecto y entregar el informe final, el tutor marca el proyecto como concluido y la fundación emite la constancia de liberación en un plazo de 10 días hábiles.`,
  },
  {
    title: "Guía para diseñar tu proyecto comunitario",
    category: "Servicio social",
    content: `1. Diagnóstico
Identifica una necesidad real de la comunidad o escuela. Habla con directivos, docentes y familias. Usa datos: peso y talla, hábitos de consumo, disponibilidad de agua potable, actividad física.

2. Objetivos medibles
Redacta objetivos con la fórmula: verbo + qué + a quién + cuánto + cuándo. Ejemplo: "Aumentar en 20% el consumo de agua simple en alumnos de 4º a 6º de la Primaria Benito Juárez entre marzo y junio".

3. Población beneficiaria
Indica quiénes y cuántas personas participarán directamente (alumnos, docentes, padres de familia) e indirectamente.

4. Actividades y calendario
Lista actividades concretas con fecha aproximada: talleres, pláticas, huertos escolares, ferias de salud, materiales didácticos. Incluye una actividad de cierre y evaluación.

5. Evaluación
Define cómo sabrás si funcionó: encuestas antes y después, registros de consumo, número de asistentes, testimonios.

6. Ética y consentimiento
Si tomas fotografías o datos de menores, necesitas el consentimiento informado de madres, padres o tutores y la autorización de la escuela.`,
  },
  {
    title: "Plato del Bien Comer y Jarra del Buen Beber",
    category: "Nutrición",
    content: `El Plato del Bien Comer es la guía de alimentación de México (NOM-043-SSA2-2012). Divide los alimentos en tres grupos:
- Verduras y frutas: consumir en abundancia y variedad, de preferencia crudas y con cáscara.
- Cereales y tubérculos: suficientes, preferir integrales.
- Leguminosas y alimentos de origen animal: combinar leguminosas con cereales; preferir pescado, pollo sin piel y moderar carnes rojas.

Recomendaciones clave: realizar tres comidas y dos colaciones, beber agua simple, reducir azúcares, grasas y sal, y realizar actividad física.

La Jarra del Buen Beber recomienda: 6 a 8 vasos de agua simple al día; leche semidescremada o descremada y bebidas sin azúcar en cantidades moderadas; evitar refrescos y bebidas azucaradas.

Ideas de actividades para primaria: armar un plato con recortes, "semáforo" de alimentos, concurso de loncheras saludables, reto de agua simple de 21 días.`,
  },
  {
    title: "Doble carga de malnutrición en México",
    category: "Nutrición",
    content: `La doble carga de malnutrición es la coexistencia de desnutrición (incluida la deficiencia de micronutrientes como hierro) y sobrepeso u obesidad en una misma población, hogar o incluso persona.

En México, según la ENSANUT, alrededor de 1 de cada 3 niñas y niños en edad escolar vive con sobrepeso u obesidad, mientras persisten la talla baja y la anemia en comunidades rurales e indígenas.

Factores: entornos obesogénicos, alto consumo de bebidas azucaradas y ultraprocesados, inseguridad alimentaria, poca actividad física y falta de acceso a agua potable.

Intervenciones escolares efectivas: educación alimentaria continua, acceso a agua simple, huertos escolares, involucrar a madres y padres, y actividad física diaria.`,
  },
  {
    title: "Preguntas frecuentes de estudiantes",
    category: "Preguntas frecuentes",
    content: `¿Puedo hacer mi servicio social desde otro país?
Sí. La fundación recibe estudiantes de universidades de México y del extranjero. Las actividades pueden ser presenciales en México o en tu comunidad, siempre que estén aprobadas por tu tutor.

¿Quién es mi tutor?
Tu tutor es el responsable de tu cohorte. Lo ves en tu página de inicio de la plataforma.

¿Cuánto tarda la revisión de mi proyecto?
El tutor revisa propuestas en un máximo de 5 días hábiles. Si te pide cambios, edita el proyecto y vuelve a enviarlo.

¿Qué pasa si me rechazan horas?
Revisa la descripción y la evidencia. Puedes registrar nuevamente la actividad con más detalle o hablar con tu tutor.

¿Cómo obtengo mi constancia?
Cuando completes tus horas y tu tutor marque tu proyecto como concluido, la fundación emite tu constancia en 10 días hábiles.`,
  },
  {
    title: "Hábitos y estilos de vida saludable en el trabajo",
    category: "Vida saludable",
    content: `Pausas activas: 5 a 10 minutos de estiramiento cada 2 horas reducen dolor muscular y mejoran la concentración.

Hidratación: tener agua simple accesible en el lugar de trabajo; sustituir refrescos en reuniones.

Alimentación: llevar comida preparada en casa siguiendo el Plato del Bien Comer; preferir colaciones de fruta, verdura o leguminosas.

Sueño: dormir 7 a 9 horas mejora el metabolismo y el estado de ánimo.

Programas laborales: retos de pasos, comedores con opciones saludables, ferias de salud y tamizaje de glucosa y presión arterial.`,
  },
];

async function createOrganization(data: {
  slug: string;
  name: string;
  shortName: string;
  tagline: string;
  about: string;
  mission: string;
  vision: string;
  transparency?: string;
  primaryColor: string;
  accentColor: string;
  contactEmail: string;
  website?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  xUrl?: string;
  youtubeUrl?: string;
  stats: { value: string; label: string }[];
  withSampleData: boolean;
}) {
  const { stats, withSampleData, ...orgData } = data;
  await db.organization.deleteMany({ where: { slug: data.slug } });
  const org = await db.organization.create({ data: { ...orgData, statsJson: JSON.stringify(stats) } });
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const domain = `${data.slug}.org`;

  await db.user.create({ data: { organizationId: org.id, email: `admin@${domain}`, name: "Coordinación General", role: "ADMIN", passwordHash } });
  const tutor = await db.user.create({ data: { organizationId: org.id, email: `tutor@${domain}`, name: "Mtra. Laura Méndez", role: "TUTOR", passwordHash } });
  const tutor2 = await db.user.create({ data: { organizationId: org.id, email: `tutora2@${domain}`, name: "Dr. Jorge Ramírez", role: "TUTOR", passwordHash } });

  await db.knowledgeDoc.createMany({ data: KNOWLEDGE.map((k) => ({ ...k, organizationId: org.id })) });
  await db.post.createMany({
    data: [
      {
        organizationId: org.id,
        slug: "agua-simple-en-la-escuela",
        title: "Agua simple en la escuela: un reto de 21 días",
        excerpt: "Así logramos que alumnos de primaria cambiaran el refresco por agua.",
        content: "Durante tres semanas, estudiantes de servicio social acompañaron a 120 alumnos en el **reto de agua simple**.\n\n- Bebederos señalizados\n- Registro diario en el salón\n- Premiación al grupo con mejor constancia\n\nEl consumo reportado de bebidas azucaradas bajó de forma notable.",
      },
      {
        organizationId: org.id,
        slug: "convocatoria-servicio-social",
        title: "Convocatoria de servicio social",
        excerpt: "Abrimos lugares para estudiantes de nutrición, medicina, psicología, pedagogía y comunicación.",
        content: "Buscamos estudiantes comprometidos con la salud de sus comunidades. Podrás diseñar tu propio proyecto con acompañamiento de un tutor.\n\nEscríbenos para recibir información.",
      },
    ],
  });

  if (!withSampleData) return;

  const unis = await Promise.all(
    [
      { name: "Universidad Nacional Autónoma de México", campus: "Ciudad Universitaria", city: "Ciudad de México", country: "México" },
      { name: "Universidad de Guadalajara", campus: "CUCS", city: "Guadalajara", country: "México" },
      { name: "Universidad Autónoma de Nuevo León", campus: "Facultad de Salud Pública y Nutrición", city: "Monterrey", country: "México" },
      { name: "Universidad de los Andes", campus: "Bogotá", city: "Bogotá", country: "Colombia" },
      { name: "Universidad de Costa Rica", campus: "Rodrigo Facio", city: "San José", country: "Costa Rica" },
    ].map((u) => db.university.create({ data: { ...u, organizationId: org.id } })),
  );

  const cohort = await db.cohort.create({
    data: {
      organizationId: org.id,
      name: "Cohorte Otoño 2026",
      description: "Intervenciones de alimentación saludable en primarias públicas.",
      startDate: day(-75),
      endDate: day(105),
      requiredHours: 480,
      tutorId: tutor.id,
    },
  });
  const cohort2 = await db.cohort.create({
    data: {
      organizationId: org.id,
      name: "Cohorte Entornos Laborales 2026",
      description: "Promoción de hábitos saludables en centros de trabajo.",
      startDate: day(-40),
      endDate: day(140),
      requiredHours: 480,
      tutorId: tutor2.id,
    },
  });

  const people = [
    { email: `estudiante@${domain}`, name: "Valeria Hernández", uni: 0, career: "Nutrición", country: "México", cohort: cohort.id },
    { email: `diego@${domain}`, name: "Diego Martínez", uni: 1, career: "Medicina", country: "México", cohort: cohort.id },
    { email: `camila@${domain}`, name: "Camila Rojas", uni: 3, career: "Psicología", country: "Colombia", cohort: cohort.id },
    { email: `andres@${domain}`, name: "Andrés Solís", uni: 4, career: "Nutrición", country: "Costa Rica", cohort: cohort2.id },
    { email: `sofia@${domain}`, name: "Sofía Garza", uni: 2, career: "Nutrición", country: "México", cohort: cohort2.id },
  ];
  const students = [];
  for (const p of people) {
    const u = await db.user.create({
      data: {
        organizationId: org.id,
        email: p.email,
        name: p.name,
        role: "STUDENT",
        passwordHash,
        student: { create: { universityId: unis[p.uni].id, career: p.career, country: p.country, semester: 8, studentNumber: `A${Math.floor(Math.random() * 90000 + 10000)}` } },
      },
      include: { student: true },
    });
    await db.cohortMember.create({ data: { cohortId: p.cohort, studentId: u.student!.id } });
    students.push({ ...u.student!, cohortId: p.cohort, tutorId: p.cohort === cohort.id ? tutor.id : tutor2.id });
  }

  const projects = [
    {
      s: 0,
      title: "Reto de agua simple en la Primaria Benito Juárez",
      summary: "Intervención de 12 semanas para sustituir bebidas azucaradas por agua simple en alumnos de 4º a 6º grado.",
      community: "Primaria Benito Juárez, Iztapalapa, CDMX",
      objectives: "Aumentar en 20% el consumo de agua simple reportado.\nCapacitar a 8 docentes en la Jarra del Buen Beber.",
      beneficiaries: "180 alumnos, 8 docentes y sus familias.",
      activities: "Semana 1-2: diagnóstico\nSemana 3-10: talleres y reto de 21 días\nSemana 11-12: evaluación y feria de cierre",
      status: "APPROVED",
      progress: 45,
      hours: [6, 5, 4, 6, 3, 5, 6, 4],
    },
    {
      s: 1,
      title: "Huerto escolar y loncheras saludables",
      summary: "Crear un huerto escolar y talleres para madres y padres sobre loncheras saludables.",
      community: "Primaria Niños Héroes, Zapopan, Jal.",
      objectives: "Implementar un huerto de 20 m².\nRealizar 4 talleres para familias.",
      beneficiaries: "120 alumnos y 60 familias.",
      activities: "Diagnóstico, construcción del huerto, talleres mensuales.",
      status: "SUBMITTED",
      progress: 10,
      hours: [4, 3],
    },
    {
      s: 2,
      title: "Alimentación emocional en adolescentes",
      summary: "Talleres psicoeducativos sobre la relación entre emociones y alimentación en secundaria.",
      community: "Colegio comunitario, Bogotá",
      objectives: "Ayudar a los jóvenes",
      beneficiaries: "Adolescentes",
      activities: "Talleres",
      status: "CHANGES_REQUESTED",
      progress: 5,
      hours: [3],
    },
    {
      s: 3,
      title: "Pausas activas en oficinas municipales",
      summary: "Programa de pausas activas e hidratación para personal administrativo.",
      community: "Municipalidad de San José",
      objectives: "Lograr que 70% del personal participe en pausas activas 3 veces por semana.",
      beneficiaries: "85 trabajadores.",
      activities: "Sensibilización, capacitación de líderes, seguimiento semanal.",
      status: "APPROVED",
      progress: 30,
      hours: [5, 5, 4],
    },
  ];

  for (const p of projects) {
    const st = students[p.s];
    const project = await db.project.create({
      data: {
        organizationId: org.id,
        cohortId: st.cohortId,
        studentId: st.id,
        tutorId: st.tutorId,
        title: p.title,
        summary: p.summary,
        community: p.community,
        objectives: p.objectives,
        beneficiaries: p.beneficiaries,
        activities: p.activities,
        problem: "Alto consumo de bebidas azucaradas y alimentos ultraprocesados.",
        status: p.status,
        progress: p.progress,
        submittedAt: day(-30),
        approvedAt: p.status === "APPROVED" ? day(-25) : null,
      },
    });
    if (p.status === "APPROVED") {
      await db.projectReview.create({ data: { projectId: project.id, tutorId: st.tutorId, decision: "APPROVED", comment: "Excelente diagnóstico. Aprobado; cuida el registro de evidencias." } });
      await db.milestone.createMany({
        data: [
          { projectId: project.id, title: "Diagnóstico inicial", dueDate: day(-20), done: true, doneAt: day(-18) },
          { projectId: project.id, title: "Primer taller", dueDate: day(-5), done: true, doneAt: day(-6) },
          { projectId: project.id, title: "Evaluación intermedia", dueDate: day(15) },
          { projectId: project.id, title: "Cierre y feria", dueDate: day(60) },
        ],
      });
    }
    if (p.status === "CHANGES_REQUESTED") {
      await db.projectReview.create({
        data: {
          projectId: project.id,
          tutorId: st.tutorId,
          decision: "CHANGES_REQUESTED",
          comment: "La idea es valiosa, pero los objetivos no son medibles. Usa la fórmula verbo + qué + a quién + cuánto + cuándo (ver la guía en la base de conocimiento).",
        },
      });
    }
    if (p.s === 0) {
      await db.tutorNote.createMany({
        data: [
          { projectId: project.id, tutorId: st.tutorId, kind: "REUNION", content: "Reunión con la directora: autorizó bebederos señalizados.", progress: 30, createdAt: day(-12) },
          { projectId: project.id, tutorId: st.tutorId, kind: "LOGRO", content: "Primer taller con 3 grupos; muy buena participación.", progress: 45, createdAt: day(-4) },
        ],
      });
    }
    for (let i = 0; i < p.hours.length; i++) {
      await db.hourLog.create({
        data: {
          studentId: st.id,
          projectId: project.id,
          date: day(-3 * (p.hours.length - i) - (p.s === 3 ? 18 : 0)),
          hours: p.hours[i],
          activity: ["Diagnóstico en escuela", "Preparación de material didáctico", "Taller con alumnos", "Reunión con docentes", "Registro de resultados"][i % 5],
          status: i < p.hours.length - 2 ? "APPROVED" : "PENDING",
        },
      });
    }
  }

  await db.announcement.create({
    data: { organizationId: org.id, title: "Entrega de informe intermedio", body: "Recuerden subir su informe intermedio antes de fin de mes.", audience: "STUDENTS" },
  });
}

async function main() {
  // En el build de Vercel: solo carga datos de ejemplo si SEED_DEMO=1 y la base está vacía.
  if (process.argv.includes("--si-vacia")) {
    if (process.env.SEED_DEMO !== "1") return console.log("SEED_DEMO no está activo; no se cargan datos de ejemplo.");
    if ((await db.organization.count()) > 0) return console.log("La base ya tiene datos; no se cargan datos de ejemplo.");
  }
  await createOrganization({
    slug: "reyhan",
    name: "Fundación Aprende con Reyhan",
    shortName: "Aprende con Reyhan",
    tagline: "Impulsamos hábitos y estilos de vida saludable en escuelas y centros de trabajo de México.",
    about:
      "Somos una Asociación Civil sin fines de lucro que tiene como beneficiarios a personas, sectores y regiones de escasos recursos, comunidades indígenas y grupos vulnerables por edad, sexo o problemas de discapacidad.\n\nNuestras actividades asistenciales incluyen la atención a requerimientos básicos de subsistencia en materia de alimentación, vestido o vivienda, así como orientación social, educación y capacitación para el trabajo.",
    mission:
      "Impulsar la formación de hábitos y estilos de vida saludable en escuelas públicas de nivel básico, medio y superior en México.\nPromover hábitos y estilos de vida saludable en el sector laboral en México.\nImpulsar alianzas estratégicas con el gobierno, la academia, la industria y con organizaciones de la sociedad civil.",
    vision:
      "Ser una organización de la sociedad civil sin fines de lucro líder en intervenciones educativas en materia de promoción de hábitos de vida saludable, que permita aminorar la doble carga de malnutrición (desnutrición-obesidad) y coadyuvar en el acceso a una alimentación sana, nutritiva y suficiente.",
    transparency:
      "La Fundación Aprende con Reyhan A.C. tiene el compromiso de rendir cuentas claras y oportunas con las autoridades y donadores, y cuenta con autorización del SAT para recibir donativos deducibles en México y del extranjero.",
    primaryColor: "#0f766e",
    accentColor: "#f59e0b",
    contactEmail: "", // correo oficial de la fundación
    website: "https://aprendeconreyhan.org",
    facebookUrl: "https://facebook.com",
    instagramUrl: "https://instagram.com",
    xUrl: "https://x.com",
    youtubeUrl: "https://youtube.com",
    stats: [
      { value: "+5", label: "años de trayectoria" },
      { value: "+100", label: "acciones comunitarias" },
      { value: "+30", label: "cursos educativos" },
    ],
    withSampleData: true,
  });

  // Segunda organización para demostrar que el sistema es replicable.
  await createOrganization({
    slug: "demo",
    name: "Asociación Demo de Servicio Comunitario",
    shortName: "Asociación Demo",
    tagline: "Plantilla lista para cualquier asociación civil con programa de servicio social.",
    about: "Esta organización de ejemplo muestra cómo otra asociación puede usar la misma plataforma con su propia marca y contenidos.",
    mission: "Formar jóvenes comprometidos con su comunidad.\nVincular universidades con causas sociales.",
    vision: "Ser referente en servicio social de alto impacto en América Latina.",
    primaryColor: "#4338ca",
    accentColor: "#ec4899",
    contactEmail: "hola@demo.org",
    stats: [{ value: "+10", label: "universidades aliadas" }],
    withSampleData: true,
  });

  console.log(`Listo. Usuarios de prueba con contraseña "${DEMO_PASSWORD}": admin@reyhan.org, tutor@reyhan.org, estudiante@reyhan.org (y equivalentes @demo.org)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
