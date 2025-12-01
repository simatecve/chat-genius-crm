import React from 'react';
import { Bell, LogOut, MessageSquare, Trash2, ChevronDown, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { ThemeToggle } from '@/components/ThemeToggle';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { dashboardService, ActiveConversation } from '@/services/dashboardService';
import { useProfile } from '@/hooks/useProfile';
export const Header = () => {
  const { signOut, user } = useAuth();
  const { profile } = useProfile();
  const { toast } = useToast();
  const [activeConversations, setActiveConversations] = React.useState<ActiveConversation[]>([]);
  const unreadCount = React.useMemo(() => activeConversations.reduce((sum, c) => sum + (c.unread_count || 0), 0), [activeConversations]);
  const [alertsOpen, setAlertsOpen] = React.useState(false);
  const clearAlerts = React.useCallback(() => {
    setActiveConversations([]);
  }, []);
  const fetchActive = React.useCallback(async () => {
    if (!user?.id) return;
    const list = await dashboardService.getActiveConversations(user.id, 5);
    setActiveConversations(list);
  }, [user?.id]);
  React.useEffect(() => {
    fetchActive();
  }, [fetchActive]);
  React.useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`realtime-alerts-${user.id}`)
      .on('postgres_changes', {
        schema: 'public',
        table: 'messages',
        event: 'INSERT',
        filter: `user_id=eq.${user.id}`,
      }, async () => {
        await fetchActive();
      })
      .on('postgres_changes', {
        schema: 'public',
        table: 'leads',
        event: 'INSERT',
        filter: `user_id=eq.${user.id}`,
      }, async () => {
        await fetchActive();
      })
      .subscribe();
    return () => {
      try { supabase.removeChannel(channel); } catch {}
    };
  }, [user?.id, fetchActive]);
  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Sesión cerrada",
      description: "Has cerrado sesión correctamente"
    });
  };
  const userRole = profile?.profile_type === 'superadmin' ? 'Super Admin' : 
                   profile?.profile_type === 'client' ? 'Admin' : 
                   profile?.profile_type === 'cajero' ? 'Cajero' : 'Usuario';

  return <header className="h-16 bg-[#1a1f2e] border-b border-border/50 sticky top-0 z-30">
      <div className="flex items-center justify-between h-full px-6">
        {/* Right section - Actions */}
        <div className="flex items-center space-x-4 ml-auto">

          {/* Notifications */}
          <DropdownMenu open={alertsOpen} onOpenChange={setAlertsOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="relative hover:bg-white/10" onClick={() => setAlertsOpen((o) => !o)}>
                <Bell className="h-5 w-5 text-muted-foreground" />
                {unreadCount > 0 && <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center">
                   {unreadCount}
                 </span>}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-96" align="end">
              <DropdownMenuLabel className="flex items-center justify-between">
                <span>Mensajes</span>
                <span className="text-xs text-muted-foreground">{unreadCount} sin leer</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {activeConversations.length === 0 && <DropdownMenuItem className="text-muted-foreground">No hay mensajes</DropdownMenuItem>}
              {activeConversations.length > 0 && <ScrollArea className="h-64">
                <div className="space-y-1">
                  {activeConversations.map(c => (
                    <div key={c.id} className="px-2 py-2 rounded-md hover:bg-muted/50">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <MessageSquare className="h-4 w-4" />
                          <div>
                            <div className="text-sm font-medium">{c.pushname || c.whatsapp_number}</div>
                            {c.last_message && <div className="text-xs text-muted-foreground">{c.last_message}</div>}
                            {c.last_message_time && <div className="text-xs text-muted-foreground">{new Date(c.last_message_time).toLocaleString()}</div>}
                          </div>
                        </div>
                        {c.unread_count > 0 && <span className="text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded">{c.unread_count}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>}
              <DropdownMenuSeparator />
              <div className="flex items-center justify-end px-2 py-1.5">
                <Button variant="ghost" size="sm" onClick={clearAlerts} className="gap-2">
                  <Trash2 className="h-4 w-4" />
                  Limpiar
                </Button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center space-x-3 hover:bg-white/10 h-auto py-2 px-3">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-foreground">{user?.email}</p>
                  <p className="text-xs text-muted-foreground">{userRole}</p>
                </div>
                <div className="w-9 h-9 bg-gradient-primary rounded-full flex items-center justify-center text-white font-semibold shadow-lg">
                  {user?.email?.charAt(0).toUpperCase()}
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{user?.email}</p>
                  <p className="text-xs text-muted-foreground">{userRole}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <div className="flex items-center justify-between w-full cursor-pointer">
                  <span className="text-sm">Tema</span>
                  <ThemeToggle />
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive cursor-pointer">
                <LogOut className="h-4 w-4 mr-2" />
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>;
};
