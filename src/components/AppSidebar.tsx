import { Home, User, Briefcase, Code, Mail, ExternalLink } from "lucide-react";
import { NavLink } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const navigation = [
  { title: "Início", url: "#home", icon: Home },
  { title: "Sobre", url: "#about", icon: User },
  { title: "Projetos", url: "#projects", icon: Briefcase },
  { title: "Contato", url: "#contact", icon: Mail },
];

export function AppSidebar() {
  const { state, isMobile, openMobile, setOpenMobile } = useSidebar();
  // No mobile, o colapso é controlado por openMobile; no desktop, por state
  const isCollapsed = isMobile ? !openMobile : state === "collapsed";

  const handleScroll = (id: string) => {
    const element = document.getElementById(id.replace("#", ""));
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
  <Sidebar className={cn(isCollapsed ? "w-16" : "w-64", "fixed left-0 top-0 h-screen z-30 md:flex")} collapsible="icon" >
      {isMobile && (
        <button
          onClick={() => setOpenMobile(!openMobile)}
          className="absolute top-4 right-4 z-50 p-2 rounded-full bg-sidebar-accent text-sidebar-accent-foreground shadow-md md:hidden"
          aria-label={openMobile ? "Recolher menu" : "Expandir menu"}
        >
          {openMobile ? (
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-chevron-left"><polyline points="15 18 9 12 15 6"/></svg>
          ) : (
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-chevron-right"><polyline points="9 18 15 12 9 6"/></svg>
          )}
        </button>
      )}
      <SidebarContent className="bg-sidebar">
        {/* Profile Section */}
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            
            {!isCollapsed && (
              <div>
                <h3 className="font-semibold text-sidebar-foreground">
                  Gustavo Gonçalves
                </h3>
                <p className="text-xs text-sidebar-foreground/70">
                  Desenvolvedor Web
                </p>
              </div>
            )}
          </div>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/70">
            {!isCollapsed && "Navegação"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <button
                      onClick={() => handleScroll(item.url)}
                      className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-sidebar-accent text-sidebar-foreground hover:text-sidebar-accent-foreground transition-colors"
                    >
                      <item.icon className="h-4 w-4" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      
    </Sidebar>
  );
}
