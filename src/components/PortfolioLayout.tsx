import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Hero } from "@/components/sections/Hero";
import { About } from "@/components/sections/About";
import { Projects } from "@/components/sections/Projects";
import { Skills } from "@/components/sections/Skills";
import { Contact } from "@/components/sections/Contact";
import { Menu } from "lucide-react";

export function PortfolioLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        
        {/* Main Content */}
        <div className="flex-1 relative">
          {/* Mobile Menu Trigger */}
          <div className="md:hidden fixed top-4 left-4 z-50">
            <SidebarTrigger className="bg-sidebar text-sidebar-foreground p-2 rounded-lg shadow-lg">
              <Menu className="h-5 w-5" />
            </SidebarTrigger>
          </div>

          <main className="w-full">
            <Hero />
            <About />
            <Projects />
            <Skills />
            <Contact />
          </main>
          
          {/* Footer */}
          <footer className="bg-sidebar text-sidebar-foreground py-8 px-4">
            <div className="max-w-6xl mx-auto text-center">
              <p className="text-sm">
                © 2025 Portfolio. Desenvolvido com ❤️ usando React, TS e Tailwind CSS.
              </p>
            </div>
          </footer>
        </div>
      </div>
    </SidebarProvider>
  );
}