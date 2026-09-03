import type { SkillCategory } from "./types";

export const skillCategories: SkillCategory[] = [
  {
    title: "Qualidade & Automação de Testes",
    skills: ["Python", "Pytest", "Selenium", "Playwright"],
    color: "bg-cyan-500",
  },
  {
    title: "Front-end",
    skills: [
      "React",
      "Next.js",
      "TypeScript",
      "JavaScript",
      "Tailwind CSS",
      "HTML5",
      "CSS3",
    ],
    color: "bg-blue-500",
  },
  {
    title: "Back-end & Dados",
    skills: ["Node.js", "Supabase", "SQL", "APIs REST"],
    color: "bg-violet-500",
  },
  {
    title: "Automação & Colaboração",
    skills: ["n8n", "Git"],
    color: "bg-emerald-500",
  },
];

/** Tools I'm currently learning / interested in working with. */
export const learningTools: string[] = [
  "Zendesk",
  "Salesforce Service Cloud",
  "G Suite",
];

/** How I work — drawn from the day-to-day, not a generic soft-skill list. */
export const strengths: string[] = [
  "Raciocínio investigativo",
  "Diagnóstico até a causa raiz",
  "Reprodução e documentação de erros",
  "Alto volume de informação",
  "Múltiplas frentes simultâneas",
  "Comunicação clara",
  "Trabalho em equipe",
  "Compartilhar conhecimento",
];
