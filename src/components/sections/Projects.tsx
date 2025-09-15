import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Github, Code } from "lucide-react";
import { useInView } from "@/hooks/use-in-view";
import projetoImob from "@/assets/projeto-imob.jpg";
import projetoPokedex from "@/assets/projeto-pokedex.jpg";

export function Projects() {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  const projects = [
    {
      title: "Projeto Imob",
      description:
        "Desenvolvi um site imobiliário completo e de alta performance, construído com Next.js e otimizado para a experiência do usuário e para o Google. Não é apenas um site, é uma plataforma de negócio otimizada para SEO e performance, com integração flexível a qualquer CRM imobiliário. Com um sistema de variáveis de ambiente configurável, ele se adapta facilmente às necessidades de qualquer cliente.",
      image: projetoImob,
      technologies: [
        "Next.js",
        "React",
        "TypeScript",
        "CSS",
        "Axios",
        "MUI",
        "API Rest",
      ],
      liveUrl: "https://imobiliario.vercel.app/",
      githubUrl: "#",
      featured: true,
    },
    {
      title: "Pokedex Next",
      description:
        "Pokedex desenvolvida com Next.js (App Router) e TypeScript, integrando a PokéAPI. Permite busca por nome, exibe detalhes dos Pokémon com renderização SSR, paginação e carregamento dinâmico. Interface responsiva com Material UI e Skeleton Loaders para melhor experiência do usuário.",
      image: projetoPokedex,
      technologies: [
        "Next.js",
        "React",
        "TypeScript",
        "CSS",
        "Axios",
        "MUI",
        "API Rest",
      ],
      liveUrl: "https://pokedex-next-y3qk.vercel.app/",
      githubUrl: "https://github.com/gustavo-lg/pokedex-next",
      featured: true,
    },
    {
      title: "Meus Repositórios",
      description:
        "Meus Repositórios Aplicação desenvolvida com React que consome a API do GitHub para listar repositórios de um usuário e exibir detalhes individuais de cada um deles.",
      image: null,
      technologies: ["React", "Javascript", "Axios", "API Rest"],
      liveUrl: "https://meus-repositorios-beta.vercel.app/",
      githubUrl: "https://github.com/gustavo-lg/meus-repositorios",
      featured: false,
    },
    {
      title: "Blog Platform",
      description:
        "Plataforma de blog com editor rico, painel integrado com Supabase para gerenciamento de dados e storage.",
      image: null,
      technologies: ["Next.js", "MDX", "Tailwind"],
      liveUrl: "https://imobiliario.vercel.app/blog",
      githubUrl: "#",
      featured: false,
    },
    {
      title: "GWD Landing Page",
      description:
        "Landing page criada para a agência GWD - Global Web Development, utilizando React, TypeScript, SCSS e Material UI para uma interface moderna e responsiva.",
      image: null,
      technologies: ["React", "TypeScript", "SCSS", "MUI", "HTML"],
      liveUrl: "https://gwd-landingpage.vercel.app/",
      githubUrl: "https://github.com/example",
      featured: false,
    },
  ];

  const featuredProjects = projects.filter((p) => p.featured);
  const otherProjects = projects.filter((p) => !p.featured);

  return (
    <section ref={ref} id="projects" className="py-20 px-4 bg-secondary/20">
      <div
        className={`max-w-6xl mx-auto transition-all duration-1000 ${
          isInView
            ? "animate-fade-in opacity-100 translate-y-0"
            : "opacity-0 translate-y-10"
        }`}
      >
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">
            Meus Projetos
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Uma seleção dos meus trabalhos mais recentes e projetos que
            demonstram minhas habilidades
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
                  isInView
                    ? "animate-scale-in opacity-100 translate-y-0"
                    : "opacity-0 translate-y-10"
                } flex flex-col h-full`}
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
                    <Badge
                      variant="secondary"
                      className="bg-primary/20 text-primary"
                    >
                      Destaque
                    </Badge>
                  </div>
                </div>
                <CardHeader>
                  <CardTitle className="group-hover:text-primary transition-colors">
                    {project.title}
                  </CardTitle>
                  <CardDescription>{project.description}</CardDescription>
                </CardHeader>
                <div className="flex flex-col justify-end flex-1">
                  <div className="mt-auto px-4 pb-4">
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
                        <a
                          href={project.liveUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Ver Projeto
                        </a>
                      </Button>
                      {project.githubUrl === "#" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled
                          className="flex-1 border-primary text-primary opacity-20 cursor-not-allowed"
                        >
                          <Github className="mr-2 h-4 w-4" />
                          Código
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                          asChild
                        >
                          <a
                            href={project.githubUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Github className="mr-2 h-4 w-4" />
                            Código
                          </a>
                        </Button>
                      )}
                    </CardFooter>
                  </div>
                </div>
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
                  isInView
                    ? "animate-scale-in opacity-100 translate-y-0"
                    : "opacity-0 translate-y-10"
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
                    <a
                      href={project.liveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                  {project.githubUrl === "#" ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="p-2 cursor-not-allowed"
                      disabled
                    >
                      <Github className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button size="sm" variant="ghost" className="p-2" asChild>
                      <a
                        href={project.githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Github className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
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
