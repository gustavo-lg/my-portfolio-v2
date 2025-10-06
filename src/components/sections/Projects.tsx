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
import { ExternalLink, Code } from "lucide-react";
import whatsappLogo from "@/assets/whatsapp-logo-black.png";
import { useInView } from "@/hooks/use-in-view";
import projetoImob from "@/assets/projeto-imob.jpg";
import projetoPokedex from "@/assets/projeto-pokedex.jpg";
import projetoJarvis from "@/assets/projeto-jarvis.jpg";
import projetoGuardei from "@/assets/projeto-guardei.jpg";
import projetoRendoia from "@/assets/projeto-rendoia.jpg";
import projetoPoupeFacil from "@/assets/projeto-poupefacil.jpg";

export function Projects() {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  const projects = [
    {
      title: "Projeto Imob",
      description:
        "Desenvolvi um site imobiliário completo, rápido e fácil de usar, feito para atrair mais clientes e ter destaque no Google. Mais do que um simples site, é uma plataforma de negócios que se adapta a qualquer imobiliária, com integração a sistemas de CRM e possibilidade de enviar automaticamente os leads para outros sistemas. Tudo isso pensado para facilitar a gestão e aumentar as vendas.",
      image: projetoImob,
      features: [
        "Alta performance",
        "Otimizado para o Google",
        "Contato direto via WhatsApp",
        "Automação inteligente",
        "Gestão fácil de imóveis",
        "Integração com CRM",
        "Design moderno e responsivo",
      ],
      liveUrl: "https://imobiliario.vercel.app/",
      githubUrl: "#",
      featured: true,
    },
    {
      title: "RendO.ia",
      description:
        "Desenvolvi um sistema online moderno e flexível, implantado do zero para atender às necessidades do cliente. A plataforma integra pagamentos via Kiwify, automações inteligentes e atendimento pelo WhatsApp, permitindo uma gestão mais ágil, prática e totalmente automatizada do negócio. ",
      image: projetoRendoia,
      features: [
        "Sistema rápido e moderno",
        "Chatbot funcional",
        "Pagamentos automatizados",
        "Pagamentos via Kiwify",
        "Atendimento via WhatsApp",
        "Automação de tarefas",
        "Integração com inteligência artificial",
        "Gestão simples e eficiente",
      ],
      liveUrl: "https://www.rendoia.com.br/",
      githubUrl: "#",
      featured: true,
    },
    {
      title: "Jarvis",
      description:
        "Desenvolvi uma página de vendas personalizada, integrada à Hotmart para gerenciamento de pagamentos e planos. O sistema conta com um painel dinâmico, chatbot inteligente e automações via WhatsApp, tornando o atendimento e a gestão muito mais rápidos, eficientes e profissionais.",
      image: projetoJarvis,
      features: [
        "Sistema rápido e moderno",
        "Dashboard dinâmico",
        "Chatbot funcional",
        "Layout redesenhado com foco em usabilidade",
        "Desempenho e experiência do usuário",
        "Pagamentos automatizados",
        "Pagamentos via Hotmart",
        "Atendimento via WhatsApp",
        "Automação de tarefas",
        "Integração com inteligência artificial",
        "Gestão simples e eficiente",
      ],
      liveUrl: "https://www.useojarvis.com/",
      githubUrl: "#",
      featured: true,
    },
    {
      title: "Poupe Fácil",
      description:
      "Desenvolvi uma página de vendas personalizada, integrada à Hotmart para gerenciamento de pagamentos e planos. O sistema conta com um painel dinâmico, chatbot inteligente e automações via WhatsApp, tornando o atendimento e a gestão muito mais rápidos, eficientes e profissionais.",
      image: projetoPoupeFacil,
      features: [
        "Sistema rápido e moderno",
        "Chatbot funcional",
        "Layout redesenhado com foco em usabilidade",
        "Desempenho e experiência do usuário",
        "Pagamentos automatizados",
        "Pagamentos via Hotmart",
        "Atendimento via WhatsApp",
        "Automação de tarefas",
        "Integração com inteligência artificial",
        "Gestão simples e eficiente",
      ],
      liveUrl: "https://poupefacilia.com.br/",
      githubUrl: "#",
      featured: true,
    },
    {
      title: "Guardei App",
      description:
      "Desenvolvi um sistema online moderno e flexível, implantado do zero para atender às necessidades do cliente. A plataforma integra pagamentos via Greenn, automações inteligentes e atendimento pelo WhatsApp, permitindo uma gestão mais ágil, prática e totalmente automatizada do negócio. ",
      image: projetoGuardei,
      features: [
        "Sistema rápido e moderno",
        "Chatbot funcional",
        "Layout redesenhado com foco em usabilidade",
        "Desempenho e experiência do usuário",
        "Pagamentos automatizados",
        "Pagamentos via Greenn",
        "Atendimento via WhatsApp",
        "Automação de tarefas",
        "Integração com inteligência artificial",
        "Gestão simples e eficiente",
      ],
      liveUrl: "https://guardei.vercel.app/",
      githubUrl: "#",
      featured: true,
    },
    {
      title: "Pokedex Next",
      description:
        "Pokedex desenvolvida com Next.js (App Router) e TypeScript, integrando a PokéAPI. Permite busca por nome, exibe detalhes dos Pokémon com renderização SSR, paginação e carregamento dinâmico. Interface responsiva com Material UI e Skeleton Loaders para melhor experiência do usuário.",
      image: projetoPokedex,
      features: [
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
      featured: false,
    },
    {
      title: "Meus Repositórios",
      description:
        "Meus Repositórios Aplicação desenvolvida com React que consome a API do GitHub para listar repositórios de um usuário e exibir detalhes individuais de cada um deles.",
      image: null,
      features: ["React", "Javascript", "Axios", "API Rest"],
      liveUrl: "https://meus-repositorios-beta.vercel.app/",
      githubUrl: "https://github.com/gustavo-lg/meus-repositorios",
      featured: false,
    },
    {
      title: "Blog Platform",
      description:
        "Plataforma de blog com editor rico, painel integrado com Supabase para gerenciamento de dados e storage.",
      image: null,
      features: ["Next.js", "MDX", "Tailwind"],
      liveUrl: "https://imobiliario.vercel.app/blog",
      githubUrl: "#",
      featured: false,
    },
    {
      title: "GWD Landing Page",
      description:
        "Landing page criada para a agência GWD - Global Web Development, utilizando React, TypeScript, SCSS e Material UI para uma interface moderna e responsiva.",
      image: null,
      features: ["React", "TypeScript", "SCSS", "MUI", "HTML"],
      liveUrl: "https://gwd-landingpage.vercel.app/",
      githubUrl: "https://github.com/example",
      featured: false,
    },
  ];

  const featuredProjects = projects.filter((p) => p.featured);
  const otherProjects = projects.filter((p) => !p.featured);

  return (
    <section ref={ref} id="projects" className="relative overflow-hidden py-20 px-4 bg-[#F1F1F1]">
      <svg
        className="pointer-events-none absolute -top-[10%] left-0 w-[140%] h-[120%] rotate-180"
        viewBox="0 0 1440 600"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          d="M0,520 C240,590 480,410 720,520 C960,590 1200,450 1440,500 L1440,600 L0,600 Z"
          className="fill-background"
        />
      </svg>
      <svg
        className="pointer-events-none absolute -bottom-[10%] left-0 w-[140%] h-[120%]"
        viewBox="0 0 1440 600"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          d="M0,520 C240,590 480,410 720,520 C960,590 1200,450 1440,500 L1440,600 L0,600 Z"
          className="fill-background"
        />
      </svg>
      
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
                        {project.features.map((tech) => (
                          <Badge
                            key={tech}
                            variant="outline"
                            className="text-xs"
                          >
                            {tech}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                    <CardFooter className="flex gap-2">
                      <Button
                        aria-label="Acessar projeto"
                        size="sm"
                        className="flex-1 bg-primary hover:bg-primary/90"
                        asChild
                      >
                        <a
                          href={project.liveUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="Acessar projeto"
                        >
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Ver Projeto
                        </a>
                      </Button>
                    </CardFooter>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Other Projects 
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
                    {project.features.slice(0, 3).map((tech) => (
                      <Badge key={tech} variant="secondary" className="text-xs">
                        {tech}
                      </Badge>
                    ))}
                    {project.features.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{project.features.length - 3}
                      </Badge>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="flex gap-2 pt-0">
                  <Button
                    aria-label="Acessar projeto"
                    size="sm"
                    variant="ghost"
                    className="p-2"
                    asChild
                  >
                    <a
                      href={project.liveUrl}
                      aria-label="Acessar projeto"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                  <Button
                    aria-label="Chamar no WhatsApp"
                    size="sm"
                    variant="ghost"
                    className="p-2"
                    asChild
                  >
                    <a
                      href="https://wa.me/5548998155981"
                      aria-label="Chamar no WhatsApp"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <img src={whatsappLogo} alt="WhatsApp" className="h-4 w-4" />
                    </a>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>*/}
      </div>
    </section>
  );
}

// Importing Code icon for placeholder
