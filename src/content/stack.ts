import type { SkillBar, SkillCategory } from "./types";

export const technicalSkills: SkillBar[] = [
  { name: "React", level: 90, category: "Web" },
  { name: "Next.js", level: 85, category: "Web" },
  { name: "TypeScript", level: 80, category: "Language" },
  { name: "JavaScript", level: 95, category: "Language" },
  { name: "Tailwind CSS", level: 88, category: "Styling" },
  { name: "HTML5", level: 95, category: "Markup" },
  { name: "CSS3", level: 90, category: "Styling" },
  { name: "Node.js", level: 70, category: "Backend" },
  { name: "Git", level: 85, category: "Tools" },
];

export const skillCategories: SkillCategory[] = [
  { title: "Web Frameworks", skills: ["React", "Next.js"], color: "bg-blue-500" },
  {
    title: "Linguagens",
    skills: ["JavaScript", "TypeScript", "HTML5", "CSS3"],
    color: "bg-green-500",
  },
  {
    title: "Styling & UI",
    skills: ["Tailwind CSS", "Styled Components", "SASS", "Bootstrap"],
    color: "bg-purple-500",
  },
  {
    title: "Ferramentas & Outros",
    skills: ["Git", "Webpack", "Vite", "Vercel"],
    color: "bg-orange-500",
  },
];

export const softSkills: string[] = [
  "Resolução de Problemas",
  "Comunicação",
  "Trabalho em Equipe",
  "Adaptabilidade",
  "Criatividade",
  "Pensamento Crítico",
  "Gestão de Tempo",
  "Aprendizado Contínuo",
];
