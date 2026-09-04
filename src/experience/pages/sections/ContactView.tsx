import { useState } from "react";
import { Instagram, Mail, MapPin, Phone } from "lucide-react";
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
    <div className="grid gap-10 lg:grid-cols-2">
      <div>
        <ul className="space-y-5 rounded-2xl border border-border/80 bg-card/35 p-6 backdrop-blur-md">
          <li className="flex items-center gap-3 text-sm text-foreground/85">
            <Mail className="h-5 w-5 shrink-0 text-primary" aria-hidden /> {contactInfo.email}
          </li>
          <li className="flex items-center gap-3 text-sm text-foreground/85">
            <Phone className="h-5 w-5 shrink-0 text-primary" aria-hidden /> {contactInfo.phone}
          </li>
          <li className="flex items-center gap-3 text-sm text-foreground/85">
            <MapPin className="h-5 w-5 shrink-0 text-primary" aria-hidden />{" "}
            {contactInfo.location}
          </li>
          <li>
            <a
              href={contactInfo.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 text-sm text-foreground/85 transition-colors hover:text-primary"
            >
              <Instagram className="h-5 w-5 shrink-0 text-primary" aria-hidden /> Instagram
            </a>
          </li>
        </ul>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block text-sm">
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Nome</span>
          <input
            name="name"
            value={form.name}
            onChange={onChange}
            required
            className="w-full rounded-lg border border-border/80 bg-background/80 px-3.5 py-2 text-foreground backdrop-blur-md transition-all duration-200 focus:border-primary focus:bg-background/95 focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Email</span>
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={onChange}
            required
            className="w-full rounded-lg border border-border/80 bg-background/80 px-3.5 py-2 text-foreground backdrop-blur-md transition-all duration-200 focus:border-primary focus:bg-background/95 focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Assunto</span>
          <input
            name="subject"
            value={form.subject}
            onChange={onChange}
            required
            className="w-full rounded-lg border border-border/80 bg-background/80 px-3.5 py-2 text-foreground backdrop-blur-md transition-all duration-200 focus:border-primary focus:bg-background/95 focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Mensagem</span>
          <textarea
            name="message"
            value={form.message}
            onChange={onChange}
            required
            className="min-h-[120px] w-full rounded-lg border border-border/80 bg-background/80 px-3.5 py-2 text-foreground backdrop-blur-md transition-all duration-200 focus:border-primary focus:bg-background/95 focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </label>
        <button
          type="submit"
          className="group relative w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold tracking-wider text-primary-foreground shadow-sm transition-all duration-300 ease-out hover:scale-[1.015] hover:bg-primary/95 hover:shadow-[0_0_28px_hsl(var(--primary)/0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.98]"
        >
          Chamar no WhatsApp
        </button>
      </form>

    </div>
  );
}
