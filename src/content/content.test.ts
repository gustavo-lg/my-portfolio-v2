import { describe, it, expect } from "vitest";
import { projects } from "./projects";
import { technicalSkills, skillCategories, softSkills } from "./stack";
import { aboutParagraphs, pillars } from "./about";
import { contactInfo } from "./contact";
import { profile } from "./profile";

describe("content", () => {
  it("has 9 projects, 5 featured", () => {
    expect(projects).toHaveLength(9);
    expect(projects.filter((p) => p.featured)).toHaveLength(5);
  });

  it("every project has title, description, features", () => {
    for (const p of projects) {
      expect(p.title).toBeTruthy();
      expect(p.description).toBeTruthy();
      expect(p.features.length).toBeGreaterThan(0);
    }
  });

  it("stack data present", () => {
    expect(technicalSkills.length).toBeGreaterThan(0);
    expect(skillCategories.length).toBe(4);
    expect(softSkills.length).toBeGreaterThan(0);
  });

  it("about has 2 paragraphs and 4 pillars", () => {
    expect(aboutParagraphs).toHaveLength(2);
    expect(pillars).toHaveLength(4);
  });

  it("contact + profile", () => {
    expect(contactInfo.whatsapp).toBe("5548998155981");
    expect(profile.name).toBe("Gustavo Gonçalves");
  });
});
