import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, MessageSquare, Users, UserPlus, Send, Settings, Menu, X, Bot, Phone, ShoppingCart, MessagesSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useConversations } from '@/hooks/useConversations';
import { useTheme } from 'next-themes';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
interface SidebarItem {
  label: string;
  icon: React.ComponentType<{
    className?: string;
  }>;
  href: string;
  badge?: number;
}
interface SidebarGroup {
  label: string;
  items: SidebarItem[];
}
export const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();
  const currentPath = location.pathname;
  const {
    user
  } = useAuth();
  const {
    unreadCount
  } = useConversations();
  const { resolvedTheme } = useTheme();
  const logoLightUrl = 'http://nocodeveloper.site/capibet/logocapinegro.png';
  const logoDarkUrl = 'https://nocodeveloper.site/capibet/logocapi.png';

  // Función para detectar si una ruta está activa
  const isActiveRoute = (href: string) => {
    if (href === '/') {
      return currentPath === '/';
    }
    return currentPath.startsWith(href);
  };

  // Crear grupos de sidebar dinámicamente con el contador de conversaciones
  const sidebarGroups: SidebarGroup[] = [{
    label: 'Principal',
    items: [{
      label: 'Panel Principal',
      icon: LayoutDashboard,
      href: '/'
    }]
  }, {
    label: 'Comunicaciones',
    items: [{
      label: 'Conversaciones',
      icon: MessageSquare,
      href: '/conversaciones',
      badge: unreadCount > 0 ? unreadCount : undefined
    }, {
      label: 'Chat Interno',
      icon: MessagesSquare,
      href: '/chat-interno'
    }, {
      label: 'Campañas Masivas',
      icon: Send,
      href: '/campanas-masivas'
    }]
  }, {
    label: 'Gestión',
    items: [{
      label: 'Embudos',
      icon: UserPlus,
      href: '/leads'
    }, {
      label: 'Contactos',
      icon: Users,
      href: '/contactos'
    }, {
      label: 'Listas de Contactos',
      icon: Users,
      href: '/listas-contactos'
    }, {
      label: 'Asistente IA',
      icon: Bot,
      href: '/asistente-ia'
    }, {
      label: 'Ventas',
      icon: ShoppingCart,
      href: '/ventas'
    }]
  }, {
    label: 'Sistema',
    items: [{
      label: 'Configuración',
      icon: Settings,
      href: '/configuracion'
    }]
  }];
  return <TooltipProvider delayDuration={300}>
      {/* Mobile overlay */}
      {isMobileOpen && <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden" onClick={() => setIsMobileOpen(false)} />}

      {/* Mobile menu button */}
      <button onClick={() => setIsMobileOpen(true)} className="fixed top-4 left-4 z-50 md:hidden p-2 bg-card rounded-lg shadow-lg border border-border">
        <Menu className="h-5 w-5" />
      </button>

      {/* Sidebar */}
      <div className={cn("fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border z-50 transition-all duration-300", "md:relative md:translate-x-0", isCollapsed ? "w-16" : "w-64", isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0")}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
            {!isCollapsed && <div className="flex items-center space-x-3">
                <img src={resolvedTheme === 'dark' ? logoDarkUrl : logoLightUrl} alt="CAPIBET" className="h-12 w-auto" />
              </div>}
            <button onClick={() => setIsCollapsed(!isCollapsed)} className="hidden md:flex p-2 hover:bg-sidebar-accent rounded-lg transition-colors">
              {isCollapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
            </button>
            <button onClick={() => setIsMobileOpen(false)} className="md:hidden p-2 hover:bg-sidebar-accent rounded-lg transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4">
            {sidebarGroups.map((group, groupIndex) => <div key={groupIndex} className="mb-6">
                {!isCollapsed && <h3 className="text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider mb-3 px-3">
                    {group.label}
                  </h3>}
                <div className="space-y-1">
                  {group.items.map((item, itemIndex) => isCollapsed ? (
                    <Tooltip key={itemIndex}>
                      <TooltipTrigger asChild>
                        <Link
                          to={item.href}
                          className={cn(
                            "group flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-200 hover:bg-sidebar-accent relative",
                            isActiveRoute(item.href) && "bg-sidebar-accent shadow-md"
                          )}
                        >
                          <item.icon className={cn("h-6 w-6 transition-colors", isActiveRoute(item.href) ? "text-sidebar-primary" : "text-sidebar-foreground group-hover:text-sidebar-primary")} />
                          {item.badge && (
                            <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs w-5 h-5 flex items-center justify-center rounded-full">
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>{item.label}</p>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <Link key={itemIndex} to={item.href} className={cn("group flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 hover:bg-sidebar-accent", isActiveRoute(item.href) && "bg-sidebar-accent border border-sidebar-border shadow-sm")}>
                      <item.icon className={cn("h-5 w-5 transition-colors", isActiveRoute(item.href) ? "text-sidebar-primary" : "text-sidebar-foreground group-hover:text-sidebar-primary")} />
                      
                      <div className="flex items-center justify-between w-full">
                        <span className={cn("font-medium transition-colors", isActiveRoute(item.href) ? "text-sidebar-primary" : "text-sidebar-foreground group-hover:text-sidebar-primary")}>
                          {item.label}
                        </span>
                        
                        {item.badge && <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
                            {item.badge}
                          </span>}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>)}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-sidebar-border">
            <div className={cn("flex items-center space-x-3 p-3 rounded-lg bg-sidebar-accent", isCollapsed && "justify-center")}>
              <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center text-white text-sm font-semibold">
                {user?.email?.charAt(0).toUpperCase()}
              </div>
              {!isCollapsed && <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-sidebar-foreground truncate">
                    {user?.email}
                  </p>
                  <p className="text-xs text-sidebar-foreground/60">Usuario</p>
                </div>}
            </div>
            {!isCollapsed && <div className="text-xs text-muted-foreground text-center mt-3">
                Versión 2.2 (01-12)
              </div>}
          </div>
        </div>
      </div>
    </TooltipProvider>;
};
