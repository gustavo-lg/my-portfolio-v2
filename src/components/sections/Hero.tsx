import { Button } from "@/components/ui/button";
import { ArrowDown, Download, Github, Linkedin } from "lucide-react";
import { useInView } from "@/hooks/use-in-view";

export function Hero() {
  const { ref, isInView } = useInView({ threshold: 0.2 });
  const handleScroll = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section ref={ref} id="home" className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/20 px-4">
      <div className={`text-center max-w-4xl mx-auto transition-all duration-1000 ${
        isInView ? 'animate-fade-in opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
      }`}>
        <div className="mb-8">
          <h1 className="text-5xl md:text-7xl font-bold mb-4 bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
            Frontend Developer
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-2">
            Olá! 👋 Eu sou um <span className="text-primary font-semibold">Desenvolvedor Frontend</span>
          </p>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Especializado em criar experiências web modernas e interativas com React, Next.js e JavaScript.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
          <Button 
            onClick={() => handleScroll('projects')}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 text-lg group"
          >
            Ver Projetos
            <ArrowDown className="ml-2 h-5 w-5 group-hover:translate-y-1 transition-transform" />
          </Button>
          
          <a
            href="/public/CV_GUSTAVO.pdf"
            download
            className="inline-flex items-center justify-center border-primary text-primary hover:bg-primary hover:text-primary-foreground px-8 py-3 text-lg border rounded-md transition-colors"
          >
            <Download className="mr-2 h-5 w-5" />
            Download CV
          </a>
        </div>

        <div className="flex justify-center gap-6">
          <a
            href="https://github.com/gustavo-lg "
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 rounded-full bg-card hover:bg-primary hover:text-primary-foreground transition-all duration-300 hover:scale-110 shadow-lg hover:shadow-primary/25"
          >
            <Github className="h-6 w-6" />
          </a>
          <a
            href="https://linkedin.com/in/gustavo-lg"
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 rounded-full bg-card hover:bg-primary hover:text-primary-foreground transition-all duration-300 hover:scale-110 shadow-lg hover:shadow-primary/25"
          >
            <Linkedin className="h-6 w-6" />
          </a>
        </div>

        <div className="static mt-10 left-1/2 transform -translate-x-1/2 animate-bounce">
          <button 
            onClick={() => handleScroll('about')}
            className="p-2 rounded-full border border-primary/30 hover:border-primary hover:bg-primary/10 transition-colors"
          >
            <ArrowDown className="h-5 w-5 text-primary" />
          </button>
        </div>
      </div>
    </section>
  );
}