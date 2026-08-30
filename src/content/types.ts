export type CategoryKey = "projetos" | "stack" | "sobre" | "contato";

export type IconName = "Boxes" | "Layers" | "User" | "Mail";

export interface CategoryMeta {
  key: CategoryKey;
  label: string;
  path: string;
  icon: IconName;
  blurb: string;
}

export interface Project {
  title: string;
  description: string;
  image: string | null;
  features: string[];
  liveUrl: string;
  githubUrl: string;
  featured: boolean;
}

export interface SkillBar {
  name: string;
  level: number;
  category: string;
}

export interface SkillCategory {
  title: string;
  skills: string[];
  color: string;
}

export interface AboutPillar {
  icon: string;
  title: string;
  description: string;
}

export interface ContactInfo {
  email: string;
  phone: string;
  location: string;
  whatsapp: string;
  instagram: string;
}

export interface ProfileInfo {
  name: string;
  title: string;
  tagline: string;
}
