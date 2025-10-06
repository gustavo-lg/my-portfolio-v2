import { Button } from "@/components/ui/button";
import { ArrowDown, Instagram } from "lucide-react";
import whatsappLogo from "@/assets/whatsapp-logo-black.png";
import macbook from "@/assets/macbook-no-bg.png";
import iphone from "@/assets/iphone-no-bg.png";
import { useInView } from "@/hooks/use-in-view";

export function Hero() {
  const { ref, isInView } = useInView({ threshold: 0.2 });
  const handleScroll = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section
      ref={ref}
      id="home"
      className="relative overflow-hidden min-h-[85vh] flex items-center bg-[#F1F1F1] px-4"
    >
      <svg
        className="pointer-events-none absolute -bottom-[10%] left-0 w-[140%] h-[230%]"
        viewBox="0 0 1440 600"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          d="M0,520 
       C480,700 960,300 1440,520 
       L1440,600 L0,600 Z"
          className="fill-background"
        />
      </svg>

      <div
        className={`relative z-10 max-w-6xl mx-auto w-full transition-all duration-1000 ${
          isInView ? "animate-fade-in opacity-100" : "opacity-0 translate-y-10"
        }`}
      >
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div className="text-left">
            <h1 className="text-4xl md:text-6xl font-extrabold leading-tight mb-6 text-foreground mt-[60px] md:mt-0">
              Desenvolvedor Web
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-xl">
              Olá! 👋 me chamo{" "}
              <span className="text-primary font-semibold">Gustavo</span>.
              <br />
              Crio e otimizo soluções web inteligentes, escaláveis e de alta
              performance, incluindo sites, whitelabels e plataformas SaaS.
              Explore meus projetos e veja como posso transformar ideias em
              experiências digitais.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                aria-label="Ver meus projetos"
                className="bg-primary hover:bg-primary/90 px-8 py-6 text-base"
                onClick={() => handleScroll("projects")}
              >
                Ver meus projetos <ArrowDown className="h-6 w-6" />
              </Button>
              <Button
                aria-label="Saber mais"
                variant="outline"
                className="px-8 py-6 text-base"
                onClick={() => handleScroll("about")}
              >
                Sobre mim <ArrowDown className="h-6 w-6" />
              </Button>
            </div>

            <div className="flex gap-4 mt-8">
              <a
                href="https://wa.me/5548998155981"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Chamar no WhatsApp"
                className="p-3 rounded-full bg-card hover:bg-[#25D366] hover:text-primary-foreground transition-all duration-300 hover:scale-110 shadow-lg hover:shadow-primary/25"
              >
                <img src={whatsappLogo} alt="WhatsApp" className="h-6 w-6" />
              </a>
              <a
                href="https://www.instagram.com/gu_lg/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Acessar perfil no Instagram"
                className="p-3 rounded-full bg-card hover:bg-primary hover:text-primary-foreground transition-all duration-300 hover:scale-110 shadow-lg hover:shadow-primary/25"
              >
                <Instagram className="h-6 w-6" />
              </a>
            </div>
          </div>

          <div className="relative flex justify-center lg:justify-end items-end  xl:translate-x-0 mr-[80px]">
            <div className="flex items-end">
              <img
                src={macbook}
                alt="Mockup de laptop"
                className="w-[520px] md:w-[580px] lg:w-[620px] xl:w-[680px] 2xl:w-[740px] max-w-full lg:-rotate-1"
              />
              <img
                src={iphone}
                alt="Mockup de smartphone"
                className="hidden md:block md:w-32 lg:w-36 xl:w-40 2xl:w-44 lg:-rotate-1 md:-ml-10 lg:-ml-16 xl:-ml-20 2xl:-ml-18"
              />
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 -bottom-6 w-2/3 h-6 bg-black/10 blur-xl rounded-full pointer-events-none" />
          </div>
        </div>
      </div>
    </section>
  );
}
