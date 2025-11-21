import React from 'react';
import { Bell, Sun, Moon, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
export const Header = () => {
  const {
    signOut,
    user
  } = useAuth();
  const {
    toast
  } = useToast();
  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Sesión cerrada",
      description: "Has cerrado sesión correctamente"
    });
  };
  return <header className="h-16 bg-card/50 backdrop-blur-sm border-b border-border sticky top-0 z-30">
      <div className="flex items-center justify-between h-full px-6">
        {/* Right section - Actions */}
        <div className="flex items-center space-x-3 ml-auto">

          {/* Notifications */}
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs w-5 h-5 rounded-full flex items-center justify-center">
              3
            </span>
          </Button>

          {/* Theme toggle */}
          

          {/* Logout */}
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="h-5 w-5" />
          </Button>

          {/* User avatar */}
          <div className="flex items-center space-x-3 pl-3 border-l border-border">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium">{user?.email}</p>
              <p className="text-xs text-muted-foreground">Usuario</p>
            </div>
            <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center text-white font-semibold shadow-lg">
              {user?.email?.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>
      </div>
    </header>;
};