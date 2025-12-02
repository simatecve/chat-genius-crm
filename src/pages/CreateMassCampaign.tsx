import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Paperclip, Smile, Clock, Plus, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
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
  const [contactLists, setContactLists] = useState<any[]>([]);
  const [aiAgents, setAiAgents] = useState<any[]>([]);
  
  const [selectedConnection, setSelectedConnection] = useState('');
  const [selectedContactList, setSelectedContactList] = useState('');
  const [selectedAiAgent, setSelectedAiAgent] = useState('');
  const [phoneNumbers, setPhoneNumbers] = useState('');
  const [message, setMessage] = useState('');
  const [messagesPerRound, setMessagesPerRound] = useState('10');
  const [waitTime, setWaitTime] = useState('30');
  const [waitTimeEnabled, setWaitTimeEnabled] = useState(true);
  const [editWithAi, setEditWithAi] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);

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

      // Cargar listas de contactos
      const { data: lists } = await supabase
        .from('contact_lists')
        .select('id, name')
        .eq('user_id', user.id)
        .order('name');
      
      setContactLists(lists || []);

      // Cargar AI Agents
      const { data: agents } = await supabase
        .from('ai_agents')
        .select('id, name')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('name');
      
      setAiAgents(agents || []);

    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments(Array.from(e.target.files));
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!selectedConnection || !message) {
      toast({
        title: "Error",
        description: "Por favor selecciona una sesión y escribe un mensaje",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Upload attachments if any
      let attachmentUrls: string[] = [];
      let attachmentNames: string[] = [];
      
      if (attachments.length > 0) {
        for (const file of attachments) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${user!.id}/${Date.now()}-${Math.random()}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage
            .from('campaign-attachments')
            .upload(fileName, file);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('campaign-attachments')
            .getPublicUrl(fileName);

          attachmentUrls.push(publicUrl);
          attachmentNames.push(file.name);
        }
      }

      // Crear campaña
      const { data: campaign, error } = await supabase
        .from('mass_campaigns')
        .insert({
          user_id: user!.id,
          name: `Campaña ${new Date().toLocaleDateString()}`,
          message: message,
          whatsapp_connection_id: selectedConnection,
          contact_list_id: selectedContactList || null,
          min_delay: waitTimeEnabled ? parseInt(waitTime) : 0,
          max_delay: waitTimeEnabled ? parseInt(waitTime) + 10 : 10,
          edit_with_ai: editWithAi,
          attachment_urls: attachmentUrls.length > 0 ? attachmentUrls : null,
          attachment_names: attachmentNames.length > 0 ? attachmentNames : null,
          status: 'pending',
          channel_type: 'whatsapp',
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

        {/* Selección de sesión y lista de contactos */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <Select value={selectedConnection} onValueChange={setSelectedConnection}>
            <SelectTrigger className="bg-[#2a3942] border-[#3d4d57] text-white">
              <SelectValue placeholder="Buscar sesión de WhatsApp" />
            </SelectTrigger>
            <SelectContent>
              {connections.map((conn) => (
                <SelectItem key={conn.id} value={conn.id}>
                  {conn.name} - {conn.phone_number}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedContactList} onValueChange={setSelectedContactList}>
            <SelectTrigger className="bg-[#2a3942] border-[#3d4d57] text-white">
              <SelectValue placeholder="Buscar lista de contactos" />
            </SelectTrigger>
            <SelectContent>
              {contactLists.map((list) => (
                <SelectItem key={list.id} value={list.id}>
                  {list.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* AI Agent y modificar con IA */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-[#2a3942] border border-[#3d4d57] rounded-md p-4">
            <Label className="text-white mb-2 block">Agente de IA (opcional)</Label>
            <Select value={selectedAiAgent} onValueChange={setSelectedAiAgent}>
              <SelectTrigger className="bg-[#1f2c34] border-[#3d4d57] text-white">
                <SelectValue placeholder="Seleccionar agente de IA" />
              </SelectTrigger>
              <SelectContent>
                {aiAgents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="bg-[#2a3942] border border-[#3d4d57] rounded-md p-4">
            <div className="flex items-center justify-between">
              <Label className="text-white">Personalizar con IA</Label>
              <Switch
                checked={editWithAi}
                onCheckedChange={setEditWithAi}
              />
            </div>
            <p className="text-sm text-gray-400 mt-2">
              La IA personalizará cada mensaje para que sea único
            </p>
          </div>
        </div>

        {/* Área de mensaje */}
        <div className="mb-4">
          <div className="bg-[#2a3942] border border-[#3d4d57] rounded-md p-3">
            <div className="flex items-start gap-2 mb-2">
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white hover:bg-transparent">
                <Smile className="h-5 w-5" />
              </Button>
              <label htmlFor="file-upload">
                <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white hover:bg-transparent" asChild>
                  <span>
                    <Paperclip className="h-5 w-5" />
                  </span>
                </Button>
              </label>
              <input
                id="file-upload"
                type="file"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Escriba su mensaje"
                className="flex-1 bg-transparent border-none text-white placeholder:text-gray-400 focus-visible:ring-0 resize-none min-h-[100px]"
              />
            </div>
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {attachments.map((file, index) => (
                  <div key={index} className="flex items-center gap-2 bg-[#1f2c34] px-3 py-1 rounded-md">
                    <span className="text-sm text-gray-300">{file.name}</span>
                    <button
                      onClick={() => handleRemoveAttachment(index)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
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
