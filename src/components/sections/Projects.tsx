import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Github, Code } from "lucide-react";
import { useInView } from "@/hooks/use-in-view";
import project1Image from "@/assets/project-1.jpg";
import project2Image from "@/assets/project-2.jpg";
import project3Image from "@/assets/project-3.jpg";

export function Projects() {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  const projects = [
    {
      title: "E-commerce Dashboard",
      description: "Dashboard completo para gestão de e-commerce com gráficos interativos, gerenciamento de produtos e análise de vendas.",
      image: project1Image,
      technologies: ["React", "TypeScript", "Tailwind", "Chart.js"],
      liveUrl: "https://example.com",
      githubUrl: "https://github.com/example",
      featured: true
    },
    {
      title: "Task Management App",
      description: "Aplicativo de gerenciamento de tarefas com drag & drop, colaboração em tempo real e notificações.",
      image: project2Image,
      technologies: ["Next.js", "React", "Prisma", "Tailwind"],
      liveUrl: "https://example.com",
      githubUrl: "https://github.com/example",
      featured: true
    },
    {
      title: "Portfolio Website",
      description: "Site pessoal responsivo com animações suaves, otimizado para performance e SEO.",
      image: project3Image,
      technologies: ["React", "Tailwind", "Framer Motion"],
      liveUrl: "https://example.com",
      githubUrl: "https://github.com/example",
      featured: false
    },
    {
      title: "Weather App",
      description: "Aplicativo de previsão do tempo com geolocalização, múltiplas cidades e interface intuitiva.",
      image: null,
      technologies: ["JavaScript", "API", "CSS3"],
      liveUrl: "https://example.com",
      githubUrl: "https://github.com/example",
      featured: false
    },
    {
      title: "Blog Platform",
      description: "Plataforma de blog com editor rico, sistema de comentários e gerenciamento de conteúdo.",
      image: null,
      technologies: ["Next.js", "MDX", "Tailwind"],
      liveUrl: "https://example.com",
      githubUrl: "https://github.com/example",
      featured: false
    },
    {
      title: "Chat Application",
      description: "Aplicativo de chat em tempo real com salas privadas, emojis e compartilhamento de arquivos.",
      image: null,
      technologies: ["React", "Socket.io", "Node.js"],
      liveUrl: "https://example.com",
      githubUrl: "https://github.com/example",
      featured: false
    }
  ];

  const featuredProjects = projects.filter(p => p.featured);
  const otherProjects = projects.filter(p => !p.featured);

  return (
    <section ref={ref} id="projects" className="py-20 px-4 bg-secondary/20">
      <div className={`max-w-6xl mx-auto transition-all duration-1000 ${
        isInView ? 'animate-fade-in opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
      }`}>
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">
            Meus Projetos
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Uma seleção dos meus trabalhos mais recentes e projetos que demonstram minhas habilidades
          </p>
        </div>

        {/* Featured Projects */}
        <div className="mb-16">
          <h3 className="text-2xl font-semibold mb-8 text-foreground flex items-center gap-2">
            <span className="w-2 h-2 bg-primary rounded-full"></span>
            Projetos em Destaque
          </h3>
          <div className="grid md:grid-cols-2 gap-8">
            {featuredProjects.map((project, index) => (
              <Card 
                key={index} 
                className={`group hover:shadow-xl transition-all duration-500 hover:-translate-y-1 overflow-hidden ${
                  isInView ? 'animate-scale-in opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                }`}
                style={{ animationDelay: `${index * 200}ms` }}
              >
                <div className="aspect-video bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center relative overflow-hidden">
                  {project.image ? (
                    <img 
                      src={project.image} 
                      alt={project.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <>
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent"></div>
                      <Code className="h-16 w-16 text-primary/30" />
                    </>
                  )}
                  <div className="absolute top-2 right-2">
                    <Badge variant="secondary" className="bg-primary/20 text-primary">
                      Featured
                    </Badge>
                  </div>
                </div>
                <CardHeader>
                  <CardTitle className="group-hover:text-primary transition-colors">
                    {project.title}
                  </CardTitle>
                  <CardDescription>{project.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {project.technologies.map((tech) => (
                      <Badge key={tech} variant="outline" className="text-xs">
                        {tech}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
                <CardFooter className="flex gap-2">
                  <Button 
                    size="sm" 
                    className="flex-1 bg-primary hover:bg-primary/90"
                    asChild
                  >
                    <a href={project.liveUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Ver Projeto
                    </a>
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="flex-1 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                    asChild
                  >
                    <a href={project.githubUrl} target="_blank" rel="noopener noreferrer">
                      <Github className="mr-2 h-4 w-4" />
                      Código
                    </a>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>

        {/* Other Projects */}
        <div>
          <h3 className="text-2xl font-semibold mb-8 text-foreground flex items-center gap-2">
            <span className="w-2 h-2 bg-secondary rounded-full"></span>
            Outros Projetos
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {otherProjects.map((project, index) => (
              <Card 
                key={index} 
                className={`group hover:shadow-lg transition-all duration-500 hover:-translate-y-1 ${
                  isInView ? 'animate-scale-in opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                }`}
                style={{ animationDelay: `${(index + 2) * 150}ms` }}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg group-hover:text-primary transition-colors">
                    {project.title}
                  </CardTitle>
                  <CardDescription className="text-sm line-clamp-2">
                    {project.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="flex flex-wrap gap-1">
                    {project.technologies.slice(0, 3).map((tech) => (
                      <Badge key={tech} variant="secondary" className="text-xs">
                        {tech}
                      </Badge>
                    ))}
                    {project.technologies.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{project.technologies.length - 3}
                      </Badge>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="flex gap-2 pt-0">
                  <Button size="sm" variant="ghost" className="p-2" asChild>
                    <a href={project.liveUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                  <Button size="sm" variant="ghost" className="p-2" asChild>
                    <a href={project.githubUrl} target="_blank" rel="noopener noreferrer">
                      <Github className="h-4 w-4" />
                    </a>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// Importing Code icon for placeholder
