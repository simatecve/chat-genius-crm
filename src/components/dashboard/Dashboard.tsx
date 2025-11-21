import React from 'react';
import { 
  Users, 
  MessageSquare, 
  TrendingUp, 
  Target,
  Clock,
  CheckCircle,
  AlertTriangle,
  Zap,
  Phone,
  Send
} from 'lucide-react';
import { StatsCard } from './StatsCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useDashboard } from '@/hooks/useDashboard';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export const Dashboard = () => {
  const { stats, recentLeads, activeConversations, isLoading } = useDashboard();

  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('nuevo')) return 'bg-blue-500 hover:bg-blue-600';
    if (statusLower.includes('contactado') || statusLower.includes('en proceso')) return 'bg-yellow-500 hover:bg-yellow-600';
    if (statusLower.includes('calificado') || statusLower.includes('interesado')) return 'bg-green-500 hover:bg-green-600';
    if (statusLower.includes('propuesta') || statusLower.includes('negociacion')) return 'bg-purple-500 hover:bg-purple-600';
    if (statusLower.includes('ganado') || statusLower.includes('cerrado')) return 'bg-emerald-500 hover:bg-emerald-600';
    return 'bg-gray-500 hover:bg-gray-600';
  };

  const formatTimeAgo = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { 
        addSuffix: true, 
        locale: es 
      });
    } catch {
      return 'hace poco';
    }
  };

  const formatPhoneNumber = (phone: string | null) => {
    if (!phone) return 'Sin teléfono';
    // Formatear número de teléfono si es necesario
    return phone.startsWith('+') ? phone : `+${phone}`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Panel Principal</h1>
            <p className="text-muted-foreground mt-2">
              Cargando datos de tu actividad comercial...
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="h-32">
              <CardContent className="p-6">
                <Skeleton className="h-4 w-24 mb-4" />
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Panel Principal</h1>
          <p className="text-muted-foreground mt-2">
            Bienvenido de vuelta. Aquí tienes un resumen de tu actividad comercial.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Clock className="h-4 w-4 mr-2" />
            Último sync: hace 2 min
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Leads Totales"
          value={stats.totalLeads.toString()}
          change={{ value: 0, trend: 'up' }}
          icon={Target}
          gradient
        />
        <StatsCard
          title="Conversaciones Activas"
          value={stats.activeConversations.toString()}
          change={{ value: 0, trend: 'up' }}
          icon={MessageSquare}
        />
        <StatsCard
          title="Tasa de Conversión"
          value={`${stats.conversionRate}%`}
          change={{ value: 0, trend: 'up' }}
          icon={TrendingUp}
        />
        <StatsCard
          title="Conexiones WhatsApp"
          value={stats.whatsappConnections.toString()}
          change={{ value: 0, trend: 'up' }}
          icon={Phone}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Leads */}
        <Card className="transition-all duration-300 hover:shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center">
                <Target className="h-5 w-5 mr-2 text-primary" />
                Leads Recientes
              </span>
              <Button variant="ghost" size="sm">
                Ver todos
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentLeads.length > 0 ? recentLeads.map((lead) => (
                <div key={lead.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-foreground">{lead.name}</h4>
                      <span className="text-xs text-muted-foreground">{formatTimeAgo(lead.created_at)}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{lead.company || 'Sin empresa'}</p>
                    <p className="text-xs text-muted-foreground mt-1">{formatPhoneNumber(lead.phone)}</p>
                  </div>
                  <Badge className={getStatusColor(lead.column_name)}>
                    {lead.column_name}
                  </Badge>
                </div>
              )) : (
                <div className="text-center py-8">
                  <Target className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No hay leads recientes</p>
                  <p className="text-xs text-muted-foreground mt-1">Los nuevos leads aparecerán aquí</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Active Conversations */}
        <Card className="transition-all duration-300 hover:shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center">
                <MessageSquare className="h-5 w-5 mr-2 text-accent" />
                Conversaciones Activas
              </span>
              <Button variant="ghost" size="sm">
                Ver chat
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeConversations.length > 0 ? activeConversations.map((conv) => (
                <div key={conv.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer">
                  <div className="flex items-center space-x-3 flex-1">
                    <div className="w-10 h-10 bg-gradient-success rounded-full flex items-center justify-center text-white font-medium">
                      {(conv.pushname || conv.whatsapp_number || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-foreground truncate">{conv.pushname || conv.whatsapp_number || 'Contacto desconocido'}</h4>
                        <span className="text-xs text-muted-foreground">
                          {conv.last_message_at ? formatTimeAgo(conv.last_message_at) : 'Sin fecha'}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {conv.last_message || 'Sin mensajes'}
                      </p>
                    </div>
                  </div>
                  {conv.unread_count > 0 && (
                    <Badge className="bg-destructive text-destructive-foreground ml-2">
                      {conv.unread_count}
                    </Badge>
                  )}
                </div>
              )) : (
                <div className="text-center py-8">
                  <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No hay conversaciones activas</p>
                  <p className="text-xs text-muted-foreground mt-1">Las conversaciones aparecerán aquí</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions & AI Assistant */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Zap className="h-5 w-5 mr-2 text-warning" />
              Acciones Rápidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button variant="outline" className="h-20 flex flex-col items-center justify-center space-y-2">
                <Users className="h-6 w-6" />
                <span className="text-sm">Nuevo Contacto</span>
              </Button>
              <Button variant="outline" className="h-20 flex flex-col items-center justify-center space-y-2">
                <MessageSquare className="h-6 w-6" />
                <span className="text-sm">Enviar Mensaje</span>
              </Button>
              <Button variant="outline" className="h-20 flex flex-col items-center justify-center space-y-2">
                <Target className="h-6 w-6" />
                <span className="text-sm">Crear Campaña</span>
              </Button>
              <Button variant="outline" className="h-20 flex flex-col items-center justify-center space-y-2">
                <CheckCircle className="h-6 w-6" />
                <span className="text-sm">Reportes</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* AI Assistant */}
        <Card className="bg-gradient-hero text-white border-0 shadow-glow">
          <CardHeader>
            <CardTitle className="flex items-center text-white">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Asistente IA
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-white/10 rounded-lg p-3">
                <p className="text-sm text-white/90">
                  <strong>Estado:</strong> {stats.totalLeads > 0 
                    ? `Tienes ${stats.totalLeads} leads en tu sistema`
                    : 'No tienes leads actualmente. ¡Comienza a agregar algunos!'
                  }
                </p>
              </div>
              <div className="bg-white/10 rounded-lg p-3">
                <p className="text-sm text-white/90">
                  <strong>Conexiones:</strong> {stats.whatsappConnections > 0 
                    ? `${stats.whatsappConnections} conexión${stats.whatsappConnections > 1 ? 'es' : ''} WhatsApp activa${stats.whatsappConnections > 1 ? 's' : ''}`
                    : 'Configura tu primera conexión WhatsApp'
                  }
                </p>
              </div>
              <div className="bg-white/10 rounded-lg p-3">
                <p className="text-sm text-white/90">
                  <strong>Conversión:</strong> {stats.conversionRate > 0 
                    ? `Tasa actual del ${stats.conversionRate}%`
                    : 'Sin datos de conversión aún'
                  }
                </p>
              </div>
              <Button variant="secondary" size="sm" className="w-full bg-white/20 hover:bg-white/30 text-white border-white/30">
                Ver más insights
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};