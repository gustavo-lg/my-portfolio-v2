import { Home, User, Briefcase, Code, Mail, ExternalLink } from "lucide-react"
import { NavLink } from "react-router-dom"
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
} from "@/components/ui/sidebar"

const navigation = [
  { title: "Início", url: "#home", icon: Home },
  { title: "Sobre", url: "#about", icon: User },
  { title: "Projetos", url: "#projects", icon: Briefcase },
  { title: "Habilidades", url: "#skills", icon: Code },
  { title: "Contato", url: "#contact", icon: Mail },
]

export function AppSidebar() {
  const { state } = useSidebar()
  const isCollapsed = state === "collapsed"

  const handleScroll = (id: string) => {
    const element = document.getElementById(id.replace('#', ''))
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <Sidebar
      className={isCollapsed ? "w-16" : "w-64"}
      collapsible="icon"
    >
      <SidebarContent className="bg-sidebar">
        {/* Profile Section */}
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">
                {isCollapsed ? "D" : "DEV"}
              </span>
            </div>
            {!isCollapsed && (
              <div>
                <h3 className="font-semibold text-sidebar-foreground">Dev Portfolio</h3>
                <p className="text-xs text-sidebar-foreground/70">Frontend Developer</p>
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

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-2">
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg hover:bg-sidebar-accent text-sidebar-foreground hover:text-primary transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
          {!isCollapsed && (
            <span className="text-xs text-sidebar-foreground/70 ml-2">
              © 2024 Portfolio
            </span>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}