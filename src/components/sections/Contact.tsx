import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mail, MapPin, Phone, Instagram } from "lucide-react";
import { useInView } from "@/hooks/use-in-view";
import { useState } from "react";
import whatsappLogo from "@/assets/whatsapp-logo.png";
import whatsappBlackLogo from "@/assets/whatsapp-logo-black.png";

export function Contact() {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const { name, email, subject, message } = formData;
    const text = `Olá, meu nome é ${name}. Email: ${email}. Assunto: ${subject}. Mensagem: ${message}`;
    const url = `https://wa.me/5548998155981?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
    setFormData({ name: "", email: "", subject: "", message: "" });
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <section
      ref={ref}
      id="contact"
      className="relative overflow-hidden py-20 px-4"
    >
      <div
        className={`max-w-6xl mx-auto transition-all duration-1000 ${
          isInView
            ? "animate-fade-in opacity-100 translate-y-0"
            : "opacity-0 translate-y-10"
        }`}
      >
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">
            Entre em Contato
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Vamos conversar sobre seu próximo projeto. Estou sempre aberto a
            novas oportunidades!
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Contact Info */}
          <div
            className={`space-y-8 transition-all duration-700 ${
              isInView
                ? "animate-scale-in opacity-100 translate-y-0"
                : "opacity-0 translate-y-10"
            }`}
          >
            <div>
              <h3 className="text-2xl font-semibold mb-6 text-foreground">
                Informações de Contato
              </h3>

              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-card rounded-lg hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Mail className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Email</p>
                    <p className="text-muted-foreground">
                      guto_leandro95@hotmail.com
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 bg-card rounded-lg hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Phone className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Telefone</p>
                    <p className="text-muted-foreground">+55 (48) 99815-5981</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 bg-card rounded-lg hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <MapPin className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Localização</p>
                    <p className="text-muted-foreground">
                      Santa Catarina, Brasil
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Social Links */}
            <div>
              <h4 className="text-lg font-semibold mb-4 text-foreground">
                Redes Sociais
              </h4>
              <div className="flex gap-4">
                <a
                  href="https://wa.me/5548998155981"
                  target="_blank"
                  aria-label="Chamar no WhatsApp"
                  rel="noopener noreferrer"
                  className="p-3 bg-card rounded-lg hover:bg-[#25D366] hover:text-primary-foreground transition-all duration-300 hover:scale-110 shadow-md"
                >
                  <img
                    src={whatsappBlackLogo}
                    alt="WhatsApp"
                    className="h-6 w-6"
                  />
                </a>
                <a
                  href="https://www.instagram.com/gu_lg/"
                  target="_blank"
                  aria-label="Acessar perfil no Instagram"
                  rel="noopener noreferrer"
                  className="p-3 bg-card rounded-lg hover:bg-primary hover:text-primary-foreground transition-all duration-300 hover:scale-110 shadow-md"
                >
                  <Instagram className="h-6 w-6" />
                </a>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <Card
            className={`transition-all duration-700 ${
              isInView
                ? "animate-scale-in opacity-100 translate-y-0"
                : "opacity-0 translate-y-10"
            }`}
            style={{ animationDelay: "300ms" }}
          >
            <CardHeader>
              <CardTitle>Envie uma Mensagem</CardTitle>
              <CardDescription>
                Preencha o formulário abaixo e entrarei em contato o mais breve
                possível.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome</Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Seu nome completo"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="seu.email@exemplo.com"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Assunto</Label>
                  <Input
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    placeholder="Assunto da mensagem"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Mensagem</Label>
                  <Textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Descreva seu projeto ou dúvida..."
                    className="min-h-[120px]"
                    required
                  />
                </div>

                <Button
                  aria-label="Chamar no Whatsapp"
                  type="submit"
                  className="w-full bg-[#25D366] hover:bg-primary/90"
                >
                  <img
                    src={whatsappLogo}
                    alt="WhatsApp"
                    className="h-5 w-5 mr-2"
                  />
                  Chamar no Whatsapp
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
