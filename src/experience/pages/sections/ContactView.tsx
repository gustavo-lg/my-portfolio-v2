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
      <ul className="space-y-4">
        <li className="flex items-center gap-3 text-sm text-muted-foreground">
          <Mail className="h-5 w-5 text-primary" aria-hidden /> {contactInfo.email}
        </li>
        <li className="flex items-center gap-3 text-sm text-muted-foreground">
          <Phone className="h-5 w-5 text-primary" aria-hidden /> {contactInfo.phone}
        </li>
        <li className="flex items-center gap-3 text-sm text-muted-foreground">
          <MapPin className="h-5 w-5 text-primary" aria-hidden />{" "}
          {contactInfo.location}
        </li>
        <li>
          <a
            href={contactInfo.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 text-sm text-muted-foreground hover:text-primary"
          >
            <Instagram className="h-5 w-5 text-primary" aria-hidden /> Instagram
          </a>
        </li>
      </ul>

      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block text-sm">
          <span className="mb-1 block text-muted-foreground">Nome</span>
          <input
            name="name"
            value={form.name}
            onChange={onChange}
            required
            className="w-full rounded border border-border bg-background px-3 py-2 text-foreground"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-muted-foreground">Email</span>
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={onChange}
            required
            className="w-full rounded border border-border bg-background px-3 py-2 text-foreground"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-muted-foreground">Assunto</span>
          <input
            name="subject"
            value={form.subject}
            onChange={onChange}
            required
            className="w-full rounded border border-border bg-background px-3 py-2 text-foreground"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-muted-foreground">Mensagem</span>
          <textarea
            name="message"
            value={form.message}
            onChange={onChange}
            required
            className="min-h-[120px] w-full rounded border border-border bg-background px-3 py-2 text-foreground"
          />
        </label>
        <button
          type="submit"
          className="w-full rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Chamar no WhatsApp
        </button>
      </form>
    </div>
  );
}
