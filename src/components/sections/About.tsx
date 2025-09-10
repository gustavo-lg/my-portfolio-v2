import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Code, Rocket, Users, Zap } from "lucide-react";
import { useInView } from "@/hooks/use-in-view";
import profilePhoto from "@/assets/profile.png";

export function About() {
  const { ref, isInView } = useInView({ threshold: 0.2 });
  const highlights = [
    {
      icon: Code,
      title: "Código Limpo",
      description: "Desenvolvimento com foco em manutenibilidade e performance"
    },
    {
      icon: Rocket,
      title: "Inovação",
      description: "Sempre explorando novas tecnologias e tendências"
    },
    {
      icon: Users,
      title: "Colaboração",
      description: "Trabalho em equipe e comunicação eficaz"
    },
    {
      icon: Zap,
      title: "Performance",
      description: "Otimização e experiência do usuário em primeiro lugar"
    }
  ];

  const technologies = [
    "React", "Next.js", "TypeScript", "JavaScript", "Tailwind CSS",
    "HTML5", "CSS3", "Node.js", "Git", "Responsive Design"
  ];

  return (
    <section ref={ref} id="about" className="py-20 px-4 bg-background">
      <div className={`max-w-6xl mx-auto transition-all duration-1000 ${
        isInView ? 'animate-fade-in opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
      }`}>
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">
            Sobre Mim
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Desenvolvedor frontend apaixonado por criar interfaces modernas e funcionais
          </p>
          <div className="flex justify-center mt-6">
            <img
              src={profilePhoto}
              alt="Foto de Gustavo Leandro"
              className="w-32 h-32 rounded-full object-cover border-4 border-primary shadow-lg"
            />
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
          <div className="space-y-6">
            <p className="text-lg text-muted-foreground leading-relaxed">
              Sou um desenvolvedor frontend com experiência em criar aplicações web modernas e responsivas.
              Minha paixão está em transformar ideias em realidade através de código limpo e interfaces intuitivas.
            </p>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Trabalho principalmente com <span className="text-primary font-semibold">React</span>, 
              <span className="text-primary font-semibold"> Next.js</span> e 
              <span className="text-primary font-semibold"> TypeScript</span>, sempre buscando as melhores práticas
              e mantendo-me atualizado com as tendências do mercado.
            </p>
            
            <div className="flex flex-wrap gap-2 mt-6">
              {technologies.map((tech) => (
                <Badge key={tech} variant="secondary" className="text-sm py-1 px-3">
                  {tech}
                </Badge>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {highlights.map((item, index) => (
              <Card key={index} className="group hover:shadow-lg transition-shadow duration-300">
                <CardHeader className="pb-3">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                    <item.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">{item.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}