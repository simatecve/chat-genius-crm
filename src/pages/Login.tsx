import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useToast } from '@/hooks/use-toast';
import logo2 from '@/assets/logo2.png';

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md shadow-elegant">
        <CardHeader className="text-center space-y-6">
          <div className="flex justify-center">
            <img 
              src={logo2} 
              alt="KanbanPRO" 
              className="h-16 w-auto"
            />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">
            Iniciar Sesión
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
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
              <Label htmlFor="password">Contraseña</Label>
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
          <div className="text-center mt-6 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Versión 1.6.0 (3 noviembre 2025)
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;