import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useToast } from '@/hooks/use-toast';
import logo from '@/assets/supercrm-logo.png';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, user } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !profileLoading && profile) {
      // Redirect based on profile_type
      if (profile.profile_type === 'superadmin') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    }
  }, [user, profile, profileLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!email || !password) {
      toast({
        title: "Error",
        description: "Por favor, completa todos los campos",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    const { error } = await signIn(email, password);

    if (error) {
      toast({
        title: "Error de autenticación",
        description: error.message === 'Invalid login credentials' 
          ? "Email o contraseña incorrectos" 
          : "Error al iniciar sesión. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Bienvenido",
        description: "Has iniciado sesión correctamente",
      });
      // Navigation will be handled by useEffect based on profile_type
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Columna izquierda - Formulario */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Iniciar Sesión
            </h1>
            <p className="text-muted-foreground">
              Accede a tu cuenta de SUPERCRM
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@empresa.com"
                className="w-full"
                disabled={isLoading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Contraseña
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full"
                disabled={isLoading}
              />
            </div>

            <Button 
              type="submit" 
              className="w-full bg-gradient-primary hover:opacity-90 transition-all duration-200 shadow-glow"
              disabled={isLoading}
            >
              {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-border">
            <p className="text-xs text-muted-foreground text-center">
              Versión 2.0 (21 noviembre 2025)
            </p>
          </div>
        </div>
      </div>

      {/* Columna derecha - Logo */}
      <div className="hidden lg:flex flex-1 items-center justify-center bg-muted/30">
        <div className="max-w-md p-8 text-center">
          <img 
            src={logo} 
            alt="SUPERCRM" 
            className="w-full max-w-sm mx-auto mb-8"
          />
          <h2 className="text-2xl font-semibold text-foreground mb-4">
            Gestión de clientes y conversaciones
          </h2>
          <p className="text-muted-foreground">
            La plataforma CRM más completa para gestionar tus leads, 
            conversaciones de WhatsApp y campañas de marketing.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;