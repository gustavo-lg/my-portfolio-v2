import { useEffect } from "react";
import type { CategoryKey } from "@/content/types";
import { categories } from "@/content/categories";
import { profile } from "@/content/profile";

const BASE_TITLE = `${profile.name} — ${profile.title} & Automação`;

const CATEGORY_DESCRIPTIONS: Record<CategoryKey, string> = {
  projetos:
    "PROJETOS — Conheça plataformas SaaS, sistemas web, integrações e automações inteligentes desenvolvidas por Gustavo Gonçalves com foco em performance.",
  stack:
    "STACK — Tecnologias dominadas por Gustavo Gonçalves: React, Next.js, TypeScript, Python, Three.js, integrações de APIs e automações n8n.",
  sobre:
    "SOBRE — Trajetória de Gustavo Gonçalves, desenvolvedor web especializado em código limpo, arquitetura escalável, integrações e automações digitais.",
  contato:
    "CONTATO — Fale com Gustavo Gonçalves sobre desenvolvimento web, plataformas sob medida e automações de processos. Contato via WhatsApp e e-mail.",
};

function setMeta(name: string, content: string) {
  let el = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("name", name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setOgMeta(property: string, content: string) {
  let el = document.querySelector<HTMLMetaElement>(`meta[property="${property}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("property", property);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setCanonical(href: string) {
  let el = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

/** Sets <title> + description + Open Graph + Twitter cards + canonical for the active route. */
export function useDocumentMeta(category?: CategoryKey) {
  useEffect(() => {
    const meta = category
      ? categories.find((c) => c.key === category)
      : undefined;

    const title = meta ? `${meta.label} · ${BASE_TITLE}` : `${profile.name} — ${profile.title} | Portfólio`;
    const desc = category && CATEGORY_DESCRIPTIONS[category]
      ? CATEGORY_DESCRIPTIONS[category]
      : profile.tagline;
    const path = meta ? meta.path : "/";
    const fullUrl = `https://gustavogoncalves.dev.br${path === "/" ? "/" : path}`;

    document.title = title;
    setMeta("description", desc);
    setOgMeta("og:title", title);
    setOgMeta("og:description", desc);
    setOgMeta("og:url", fullUrl);
    setMeta("twitter:title", title);
    setMeta("twitter:description", desc);
    setMeta("twitter:url", fullUrl);
    setCanonical(fullUrl);
  }, [category]);
}
