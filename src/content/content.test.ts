import { describe, it, expect } from "vitest";
import { projects } from "./projects";
import { skillCategories, learningTools, strengths } from "./stack";
import { aboutIntro, aboutParagraphs, aboutGoal, pillars } from "./about";
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
    expect(skillCategories.length).toBe(4);
    expect(strengths.length).toBeGreaterThan(0);
    expect(learningTools.length).toBeGreaterThan(0);
  });

  it("every skill category has a title and at least one skill", () => {
    for (const c of skillCategories) {
      expect(c.title).toBeTruthy();
      expect(c.skills.length).toBeGreaterThan(0);
    }
  });

  it("about has intro, paragraphs, goal and 4 pillars", () => {
    expect(aboutIntro).toBeTruthy();
    expect(aboutParagraphs).toHaveLength(3);
    expect(aboutGoal).toBeTruthy();
    expect(pillars).toHaveLength(4);
    for (const p of pillars) {
      expect(p.title).toBeTruthy();
      expect(p.description).toBeTruthy();
    }
  });

  it("contact + profile", () => {
    expect(contactInfo.whatsapp).toBe("5548998155981");
    expect(profile.name).toBe("Gustavo Gonçalves");
  });
});
