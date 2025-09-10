import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

export function Skills() {
  const technicalSkills = [
    { name: "React", level: 90, category: "Frontend" },
    { name: "Next.js", level: 85, category: "Frontend" },
    { name: "TypeScript", level: 80, category: "Language" },
    { name: "JavaScript", level: 95, category: "Language" },
    { name: "Tailwind CSS", level: 88, category: "Styling" },
    { name: "HTML5", level: 95, category: "Markup" },
    { name: "CSS3", level: 90, category: "Styling" },
    { name: "Node.js", level: 70, category: "Backend" },
    { name: "Git", level: 85, category: "Tools" },
    { name: "Figma", level: 75, category: "Design" }
  ];

  const categories = [
    {
      title: "Frontend Frameworks",
      skills: ["React", "Next.js", "Vue.js", "Angular"],
      color: "bg-blue-500"
    },
    {
      title: "Linguagens",
      skills: ["JavaScript", "TypeScript", "HTML5", "CSS3"],
      color: "bg-green-500"
    },
    {
      title: "Styling & UI",
      skills: ["Tailwind CSS", "Styled Components", "SASS", "Bootstrap"],
      color: "bg-purple-500"
    },
    {
      title: "Ferramentas & Outros",
      skills: ["Git", "Webpack", "Vite", "Figma", "Vercel"],
      color: "bg-orange-500"
    }
  ];

  const softSkills = [
    "Resolução de Problemas",
    "Comunicação",
    "Trabalho em Equipe",
    "Adaptabilidade",
    "Criatividade",
    "Pensamento Crítico",
    "Gestão de Tempo",
    "Aprendizado Contínuo"
  ];

  return (
    <section id="skills" className="py-20 px-4 bg-background">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">
            Minhas Habilidades
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Tecnologias e ferramentas que domino para criar soluções eficazes
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 mb-16">
          {/* Technical Skills */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="w-3 h-3 bg-primary rounded-full"></span>
                Habilidades Técnicas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {technicalSkills.map((skill, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-foreground">{skill.name}</span>
                    <span className="text-sm text-muted-foreground">{skill.level}%</span>
                  </div>
                  <Progress 
                    value={skill.level} 
                    className="h-2"
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Skill Categories */}
          <div className="space-y-6">
            {categories.map((category, index) => (
              <Card key={index} className="group hover:shadow-lg transition-shadow duration-300">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${category.color}`}></span>
                    {category.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {category.skills.map((skill) => (
                      <Badge key={skill} variant="secondary" className="text-sm">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Soft Skills */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="w-3 h-3 bg-secondary rounded-full"></span>
              Habilidades Comportamentais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {softSkills.map((skill, index) => (
                <div
                  key={index}
                  className="p-3 bg-secondary/30 rounded-lg text-center hover:bg-secondary/50 transition-colors duration-300 cursor-default"
                >
                  <span className="text-sm font-medium text-foreground">{skill}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}