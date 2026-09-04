import { useState } from "react";
import { Instagram, Linkedin, Mail, MapPin, MessageSquare, Phone } from "lucide-react";
import { contactInfo } from "@/content/contact";

export function buildWhatsappUrl(
  whatsapp: string,
  data: { name: string; email: string; subject: string; message: string },
) {
  const text = `Olá, meu nome é ${data.name}. Email: ${data.email}. Assunto: ${data.subject}. Mensagem: ${data.message}`;
  return `https://wa.me/${whatsapp}?text=${encodeURIComponent(text)}`;
}

const EMPTY = { name: "", email: "", subject: "", message: "" };

export function ContactView() {
  const [form, setForm] = useState(EMPTY);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    window.open(buildWhatsappUrl(contactInfo.whatsapp, form), "_blank");
    setForm(EMPTY);
  };

  const onChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  return (
    <div className="grid gap-6 sm:gap-8 lg:grid-cols-2">
      {/* Coluna de informações */}
      <div className="flex flex-col justify-between space-y-6 rounded-2xl border border-border/80 bg-card/35 p-5 backdrop-blur-md transition-all duration-300 sm:p-7">
        <div>
          {/* Badge de disponibilidade */}
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Disponível para novas conexões
          </div>

          <h2 className="mt-5 text-base font-semibold text-foreground">
            Vamos conversar?
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            Sinta-se à vontade para enviar uma mensagem sobre projetos, colaboração técnica ou automações.
          </p>

          <ul className="mt-6 space-y-4">
            <li className="group flex items-center gap-3.5 text-sm text-foreground/85">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-background/60 text-primary transition-colors duration-200 group-hover:border-primary/40 group-hover:bg-primary/10">
                <Mail className="h-4 w-4" aria-hidden />
              </div>
              <div className="flex flex-col">
                <span className="text-[0.7rem] uppercase tracking-wider text-muted-foreground">
                  E-mail
                </span>
                <a
                  href={`mailto:${contactInfo.email}`}
                  className="font-medium transition-colors hover:text-primary"
                >
                  {contactInfo.email}
                </a>
              </div>
            </li>

            <li className="group flex items-center gap-3.5 text-sm text-foreground/85">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-background/60 text-primary transition-colors duration-200 group-hover:border-primary/40 group-hover:bg-primary/10">
                <Phone className="h-4 w-4" aria-hidden />
              </div>
              <div className="flex flex-col">
                <span className="text-[0.7rem] uppercase tracking-wider text-muted-foreground">
                  Telefone / WhatsApp
                </span>
                <span className="font-medium">{contactInfo.phone}</span>
              </div>
            </li>

            <li className="group flex items-center gap-3.5 text-sm text-foreground/85">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-background/60 text-primary transition-colors duration-200 group-hover:border-primary/40 group-hover:bg-primary/10">
                <MapPin className="h-4 w-4" aria-hidden />
              </div>
              <div className="flex flex-col">
                <span className="text-[0.7rem] uppercase tracking-wider text-muted-foreground">
                  Localização
                </span>
                <span className="font-medium">{contactInfo.location}</span>
              </div>
            </li>

            <li className="group flex items-center gap-3.5 text-sm text-foreground/85">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-background/60 text-primary transition-colors duration-200 group-hover:border-primary/40 group-hover:bg-primary/10">
                <Linkedin className="h-4 w-4" aria-hidden />
              </div>
              <div className="flex flex-col">
                <span className="text-[0.7rem] uppercase tracking-wider text-muted-foreground">
                  LinkedIn
                </span>
                <a
                  href={contactInfo.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium transition-colors hover:text-primary"
                >
                  Gustavo Gonçalves
                </a>
              </div>
            </li>

            <li className="group flex items-center gap-3.5 text-sm text-foreground/85">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-background/60 text-primary transition-colors duration-200 group-hover:border-primary/40 group-hover:bg-primary/10">
                <Instagram className="h-4 w-4" aria-hidden />
              </div>
              <div className="flex flex-col">
                <span className="text-[0.7rem] uppercase tracking-wider text-muted-foreground">
                  Instagram
                </span>
                <a
                  href={contactInfo.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium transition-colors hover:text-primary"
                >
                  @gu_lg
                </a>
              </div>
            </li>
          </ul>
        </div>
      </div>

      {/* Formulário envelopado em Card Glassmorphism */}
      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-2xl border border-border/80 bg-card/35 p-5 backdrop-blur-md transition-all duration-300 sm:p-7"
      >
        <label className="block text-sm">
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Nome
          </span>
          <input
            name="name"
            value={form.name}
            onChange={onChange}
            required
            placeholder="Ex: Gustavo"
            className="min-h-11 w-full rounded-lg border border-border/80 bg-background/80 px-3.5 py-2.5 text-base text-foreground placeholder:text-muted-foreground/40 backdrop-blur-md transition-all duration-200 hover:border-foreground/20 focus:border-primary focus:bg-background/95 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:shadow-[0_0_15px_hsl(var(--primary)/0.15)] sm:text-sm"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Email
          </span>
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={onChange}
            required
            placeholder="seu@email.com"
            className="min-h-11 w-full rounded-lg border border-border/80 bg-background/80 px-3.5 py-2.5 text-base text-foreground placeholder:text-muted-foreground/40 backdrop-blur-md transition-all duration-200 hover:border-foreground/20 focus:border-primary focus:bg-background/95 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:shadow-[0_0_15px_hsl(var(--primary)/0.15)] sm:text-sm"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Assunto
          </span>
          <input
            name="subject"
            value={form.subject}
            onChange={onChange}
            required
            placeholder="Ex: Parceria em projeto / Ideia de automação"
            className="min-h-11 w-full rounded-lg border border-border/80 bg-background/80 px-3.5 py-2.5 text-base text-foreground placeholder:text-muted-foreground/40 backdrop-blur-md transition-all duration-200 hover:border-foreground/20 focus:border-primary focus:bg-background/95 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:shadow-[0_0_15px_hsl(var(--primary)/0.15)] sm:text-sm"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Mensagem
          </span>
          <textarea
            name="message"
            value={form.message}
            onChange={onChange}
            required
            rows={4}
            placeholder="Descreva brevemente como posso ajudar ou o que deseja conversar..."
            className="min-h-[104px] w-full resize-y rounded-lg border border-border/80 bg-background/80 px-3.5 py-2.5 text-base text-foreground placeholder:text-muted-foreground/40 backdrop-blur-md transition-all duration-200 hover:border-foreground/20 focus:border-primary focus:bg-background/95 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:shadow-[0_0_15px_hsl(var(--primary)/0.15)] sm:min-h-[110px] sm:text-sm"
          />
        </label>

        <button
          type="submit"
          className="group relative flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold tracking-wider text-primary-foreground shadow-sm transition-all duration-300 ease-out hover:scale-[1.015] hover:bg-primary/95 hover:shadow-[0_0_28px_hsl(var(--primary)/0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.98]"
        >
          <MessageSquare className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" aria-hidden />
          <span>Chamar no WhatsApp</span>
        </button>
      </form>
    </div>
  );
}
