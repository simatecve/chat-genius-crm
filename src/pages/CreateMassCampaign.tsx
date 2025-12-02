import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Paperclip, Smile, Clock, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export default function CreateMassCampaign() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [connections, setConnections] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  
  const [selectedConnection, setSelectedConnection] = useState('');
  const [selectedContact, setSelectedContact] = useState('');
  const [phoneNumbers, setPhoneNumbers] = useState('');
  const [message, setMessage] = useState('');
  const [messagesPerRound, setMessagesPerRound] = useState('10');
  const [waitTime, setWaitTime] = useState('30');
  const [waitTimeEnabled, setWaitTimeEnabled] = useState(true);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    try {
      // Cargar conexiones de WhatsApp
      const { data: conns } = await supabase
        .from('whatsapp_connections')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'connected');
      
      setConnections(conns || []);

      // Cargar contactos
      const { data: contactsData } = await supabase
        .from('contacts')
        .select('id, name, phone_number')
        .eq('user_id', user.id)
        .order('name');
      
      setContacts(contactsData || []);

    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleSubmit = async () => {
    if (!selectedConnection || !message) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos requeridos",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Crear campaña
      const { data: campaign, error } = await supabase
        .from('mass_campaigns')
        .insert({
          user_id: user!.id,
          name: `Campaña ${new Date().toLocaleDateString()}`,
          message: message,
          whatsapp_connection_id: selectedConnection,
          min_delay: waitTimeEnabled ? parseInt(waitTime) : 0,
          max_delay: waitTimeEnabled ? parseInt(waitTime) + 10 : 10,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Campaña creada correctamente",
      });

      navigate('/mass-campaigns');
    } catch (error: any) {
      console.error('Error creating campaign:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo crear la campaña",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1f2c34] p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/mass-campaigns')}
            className="text-white hover:bg-[#2a3942]"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-semibold text-white">Nuevo envío masivo</h1>
        </div>

        {/* Selección de sesión y contacto */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <Select value={selectedConnection} onValueChange={setSelectedConnection}>
            <SelectTrigger className="bg-[#2a3942] border-[#3d4d57] text-white">
              <SelectValue placeholder="Buscar sesión" />
            </SelectTrigger>
            <SelectContent>
              {connections.map((conn) => (
                <SelectItem key={conn.id} value={conn.id}>
                  {conn.name} - {conn.phone_number}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedContact} onValueChange={setSelectedContact}>
            <SelectTrigger className="bg-[#2a3942] border-[#3d4d57] text-white">
              <SelectValue placeholder="Buscar contacto" />
            </SelectTrigger>
            <SelectContent>
              {contacts.map((contact) => (
                <SelectItem key={contact.id} value={contact.id}>
                  {contact.name} - {contact.phone_number}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Campo de teléfonos */}
        <div className="mb-4">
          <div className="flex items-center gap-2 bg-[#2a3942] border border-[#3d4d57] rounded-md px-3 py-2">
            <Input
              value={phoneNumbers}
              onChange={(e) => setPhoneNumbers(e.target.value)}
              placeholder="Ingresa números de teléfono separados por comas"
              className="flex-1 bg-transparent border-none text-white placeholder:text-gray-400 focus-visible:ring-0"
            />
            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white hover:bg-transparent">
              <Paperclip className="h-5 w-5" />
            </Button>
            <Button variant="outline" className="border-[#00a884] text-[#00a884] hover:bg-[#00a884] hover:text-white">
              CSV
            </Button>
          </div>
        </div>

        {/* Botón agregar sesión */}
        <div className="mb-6">
          <Button variant="outline" className="border-[#00a884] text-[#00a884] hover:bg-[#00a884] hover:text-white">
            <Plus className="h-4 w-4 mr-2" />
            AGREGAR OTRA SESIÓN
          </Button>
        </div>

        {/* Área de mensaje */}
        <div className="mb-4">
          <div className="bg-[#2a3942] border border-[#3d4d57] rounded-md p-3">
            <div className="flex items-start gap-2 mb-2">
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white hover:bg-transparent">
                <Smile className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white hover:bg-transparent">
                <Paperclip className="h-5 w-5" />
              </Button>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Escriba su mensaje"
                className="flex-1 bg-transparent border-none text-white placeholder:text-gray-400 focus-visible:ring-0 resize-none min-h-[100px]"
              />
            </div>
          </div>
          <button className="text-[#00a884] text-sm mt-2 hover:underline flex items-center gap-1">
            <Plus className="h-4 w-4" />
            AGREGAR VARIACIONES DE MENSAJE
          </button>
        </div>

        {/* Configuración de envío */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-[#2a3942] border border-[#3d4d57] rounded-md p-4">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-[#00a884] mt-1" />
              <div className="flex-1">
                <h3 className="text-white font-medium mb-1">Mensajes por ronda y sesión</h3>
                <p className="text-sm text-gray-400 mb-3">
                  Número de mensajes para enviar por cada ronda de envío
                </p>
                <Input
                  type="number"
                  value={messagesPerRound}
                  onChange={(e) => setMessagesPerRound(e.target.value)}
                  className="bg-[#1f2c34] border-[#3d4d57] text-white"
                />
              </div>
            </div>
          </div>

          <div className="bg-[#2a3942] border border-[#3d4d57] rounded-md p-4">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-[#00a884] mt-1" />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-white font-medium">Tiempo de espera (segundos)</h3>
                  <Switch
                    checked={waitTimeEnabled}
                    onCheckedChange={setWaitTimeEnabled}
                  />
                </div>
                <p className="text-sm text-gray-400 mb-3">
                  Tiempo de espera entre cada mensaje enviado
                </p>
                <Input
                  type="number"
                  value={waitTime}
                  onChange={(e) => setWaitTime(e.target.value)}
                  disabled={!waitTimeEnabled}
                  className="bg-[#1f2c34] border-[#3d4d57] text-white disabled:opacity-50"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Botón de envío */}
        <Button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-[#00a884] hover:bg-[#00a884]/90 text-white font-semibold py-6 text-lg"
        >
          {loading ? 'PROCESANDO...' : 'INICIAR ENVÍO MASIVO'}
        </Button>
      </div>
    </div>
  );
}
