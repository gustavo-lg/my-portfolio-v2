import { useEffect } from "react";
import type { CategoryKey } from "@/content/types";
import { categories } from "@/content/categories";
import { profile } from "@/content/profile";

const BASE_TITLE = `${profile.name} — ${profile.title}`;

function setMeta(name: string, content: string) {
  let el = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("name", name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

/** Sets <title> + description for the active route. */
export function useDocumentMeta(category?: CategoryKey) {
  useEffect(() => {
    const meta = category
      ? categories.find((c) => c.key === category)
      : undefined;

    document.title = meta ? `${meta.label} · ${BASE_TITLE}` : BASE_TITLE;
    setMeta(
      "description",
      meta ? `${meta.label} — ${meta.blurb}` : profile.tagline,
    );
  }, [category]);
}
