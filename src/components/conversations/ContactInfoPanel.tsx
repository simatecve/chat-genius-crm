import React, { useState, useEffect } from 'react';
import { User, Calendar, MapPin, Users, Filter, FileText, DollarSign, ChevronDown, ChevronUp, Plus, Edit2, Coins, TrendingUp, TrendingDown, UserPlus, Key, RefreshCw, Bot, BotOff, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { contactDetailsService, ContactDetail, ContactSale } from '@/services/contactDetailsService';
import { useEffectiveUserId } from '@/hooks/useEffectiveUserId';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { casinoApiService } from '@/services/casinoApiService';
import { supabase } from '@/integrations/supabase/client';
import { useBotBlock } from '@/hooks/useBotBlock';
import { embudoServices, EmbudoResponse } from '@/services/embudoServices';

interface ContactInfoPanelProps {
  conversationId: string;
  contactName: string;
  phoneNumber: string;
}

export const ContactInfoPanel: React.FC<ContactInfoPanelProps> = ({
  conversationId,
  contactName,
  phoneNumber,
}) => {
  const { effectiveUserId } = useEffectiveUserId();
  const { toast } = useToast();
  const { isBlocked, isLoading: isBotToggling, toggleBotBlock } = useBotBlock(phoneNumber, contactName);
  
  const [contactDetails, setContactDetails] = useState<ContactDetail | null>(null);
  const [sales, setSales] = useState<ContactSale[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [embudos, setEmbudos] = useState<EmbudoResponse[]>([]);
  const [currentEmbudo, setCurrentEmbudo] = useState<EmbudoResponse | null>(null);
  const [expandedSections, setExpandedSections] = useState({
    info: true,
    bot: true,
    personal: true,
    agent: true,
    funnel: true,
    notes: true,
    sales: true,
    casino: true,
  });

  // Casino states
  const [casinoPlayer, setCasinoPlayer] = useState<any>(null);
  const [casinoBalance, setCasinoBalance] = useState<number | null>(null);
  const [casinoLoading, setCasinoLoading] = useState(false);
  const [casinoTransaction, setCasinoTransaction] = useState({
    amount: '',
    type: 'deposit' as 'deposit' | 'withdraw',
  });
  const [casinoPassword, setCasinoPassword] = useState({
    username: '',
    password: 'Capibet1234',
  });
  const [showCasinoPassword, setShowCasinoPassword] = useState(true);

  const [formData, setFormData] = useState({
    gender: '',
    origin: '',
    birth_date: '',
    agent_id: '',
    funnel_stage: '',
    notes: '',
    phone_number: '',
  });

  const [newSale, setNewSale] = useState({
    amount: '',
    description: '',
  });

  useEffect(() => {
    loadContactDetails();
    loadEmbudos();
  }, [conversationId]);

  const loadEmbudos = async () => {
    try {
      // Cargar workspaces del usuario
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: workspacesData } = await supabase
        .from('workspaces')
        .select('*')
        .eq('user_id', user.id)
        .order('position');

      if (workspacesData && workspacesData.length > 0) {
        // Cargar embudos de todos los workspaces
        const allEmbudos: EmbudoResponse[] = [];
        for (const workspace of workspacesData) {
          const response = await embudoServices.getEmbudosByEspacio(workspace.id);
          if (response.success && response.data) {
            allEmbudos.push(...response.data);
          }
        }
        setEmbudos(allEmbudos);

        // Cargar embudo actual de la conversación
        const { data: convData } = await supabase
          .from('conversations')
          .select('lead_id')
          .eq('id', conversationId)
          .single();

        if (convData?.lead_id) {
          const { data: leadData } = await supabase
            .from('leads')
            .select('column_id')
            .eq('id', convData.lead_id)
            .single();

          if (leadData?.column_id) {
            const { data: columnData } = await supabase
              .from('lead_columns')
              .select('workspace_id')
              .eq('id', leadData.column_id)
              .single();

            if (columnData?.workspace_id) {
              const response = await embudoServices.getEmbudosByEspacio(columnData.workspace_id);
              if (response.success && response.data && response.data.length > 0) {
                setCurrentEmbudo(response.data[0]);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error loading embudos:', error);
    }
  };

  const loadContactDetails = async () => {
    const details = await contactDetailsService.getByConversation(conversationId);
    if (details) {
      setContactDetails(details);
      setFormData({
        gender: details.gender || '',
        origin: details.origin || '',
        birth_date: details.birth_date || '',
        agent_id: details.agent_id || '',
        funnel_stage: details.funnel_stage || '',
        notes: details.notes || '',
        phone_number: phoneNumber || '',
      });
      
      const salesData = await contactDetailsService.getSales(details.id);
      setSales(salesData);
    }
  };

  const handleSave = async () => {
    if (!effectiveUserId) return;

    try {
      // Actualizar detalles del contacto
      await contactDetailsService.upsert(
        {
          gender: formData.gender as any || null,
          origin: formData.origin || null,
          birth_date: formData.birth_date || null,
          agent_id: formData.agent_id || null,
          funnel_stage: formData.funnel_stage || null,
          notes: formData.notes || null,
        },
        conversationId,
        effectiveUserId
      );

      // Actualizar número de teléfono en la conversación si cambió
      if (formData.phone_number && formData.phone_number !== phoneNumber) {
        const { error: conversationError } = await supabase
          .from('conversations')
          .update({ phone_number: formData.phone_number })
          .eq('id', conversationId);

        if (conversationError) throw conversationError;
      }

      toast({
        title: 'Guardado exitoso',
        description: 'La información del contacto se ha actualizado.',
      });

      setIsEditing(false);
      loadContactDetails();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo guardar la información.',
        variant: 'destructive',
      });
    }
  };

  const handleCreateSale = async () => {
    if (!effectiveUserId || !contactDetails) return;

    try {
      await contactDetailsService.createSale({
        contact_detail_id: contactDetails.id,
        user_id: effectiveUserId,
        amount: parseFloat(newSale.amount) || 0,
        description: newSale.description || null,
        sale_date: new Date().toISOString(),
        status: 'completed',
      });

      toast({
        title: 'Venta registrada',
        description: 'La venta se ha registrado exitosamente.',
      });

      setNewSale({ amount: '', description: '' });
      loadContactDetails();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo registrar la venta.',
        variant: 'destructive',
      });
    }
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const totalSales = sales.reduce((sum, sale) => sum + parseFloat(sale.amount.toString()), 0);

  // Casino functions
  const loadCasinoBalance = async (username: string) => {
    setCasinoLoading(true);
    try {
      const response = await casinoApiService.getAgentInfo(username);
      if (response.success && response.result) {
        setCasinoPlayer(response.result);
        setCasinoBalance(response.result.balance);
        toast({
          title: 'Balance actualizado',
          description: `Balance actual: $${response.result.balance}`,
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo obtener el balance del casino.',
        variant: 'destructive',
      });
    } finally {
      setCasinoLoading(false);
    }
  };

  const handleCasinoDeposit = async () => {
    if (!casinoPassword.username || !casinoTransaction.amount) {
      toast({
        title: 'Error',
        description: 'Complete todos los campos requeridos.',
        variant: 'destructive',
      });
      return;
    }

    setCasinoLoading(true);
    try {
      const response = await casinoApiService.doDeposit(
        casinoPassword.username,
        parseFloat(casinoTransaction.amount)
      );

      if (response.success) {
        toast({
          title: 'Depósito exitoso',
          description: `Se depositaron $${casinoTransaction.amount}`,
        });
        setCasinoTransaction({ ...casinoTransaction, amount: '' });
        await loadCasinoBalance(casinoPassword.username);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo realizar el depósito.',
        variant: 'destructive',
      });
    } finally {
      setCasinoLoading(false);
    }
  };

  const handleCasinoWithdraw = async () => {
    if (!casinoPassword.username || !casinoTransaction.amount) {
      toast({
        title: 'Error',
        description: 'Complete todos los campos requeridos.',
        variant: 'destructive',
      });
      return;
    }

    setCasinoLoading(true);
    try {
      const response = await casinoApiService.doWithdraw(
        casinoPassword.username,
        parseFloat(casinoTransaction.amount)
      );

      if (response.success) {
        toast({
          title: 'Retiro exitoso',
          description: `Se retiraron $${casinoTransaction.amount}`,
        });
        setCasinoTransaction({ ...casinoTransaction, amount: '' });
        await loadCasinoBalance(casinoPassword.username);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo realizar el retiro.',
        variant: 'destructive',
      });
    } finally {
      setCasinoLoading(false);
    }
  };

  const handleCreateCasinoPlayer = async () => {
    if (!casinoPassword.username || !casinoPassword.password) {
      toast({
        title: 'Error',
        description: 'Complete username y contraseña.',
        variant: 'destructive',
      });
      return;
    }

    setCasinoLoading(true);
    try {
      const response = await casinoApiService.addPlayer(
        casinoPassword.username,
        casinoPassword.password
      );

      if (response.success) {
        toast({
          title: 'Jugador creado',
          description: `Usuario ${response.result.userName} creado exitosamente.`,
        });
        await loadCasinoBalance(casinoPassword.username);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo crear el jugador.',
        variant: 'destructive',
      });
    } finally {
      setCasinoLoading(false);
    }
  };

  return (
    <div className="h-full w-full min-w-0 border-l border-border/20 bg-[#111b21] overflow-y-auto">
      <div className="p-4 space-y-4">
        {/* Header con botón de editar */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#e9edef]">Información</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
            className="text-[#8696a0] hover:text-[#e9edef]"
          >
            <Edit2 className="h-4 w-4" />
          </Button>
        </div>

        {/* INFORMACIÓN */}
        <Card className="p-3 bg-[#202c33] border-border/20">
          <button
            onClick={() => toggleSection('info')}
            className="flex items-center justify-between w-full text-left"
          >
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-[#00a884]" />
              <h3 className="font-medium text-sm text-[#e9edef]">INFORMACIÓN</h3>
            </div>
            {expandedSections.info ? <ChevronUp className="h-4 w-4 text-[#8696a0]" /> : <ChevronDown className="h-4 w-4 text-[#8696a0]" />}
          </button>

          {expandedSections.info && (
            <div className="mt-3 space-y-3 text-sm">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-[#8696a0]" />
                <div className="w-full">
                  <p className="text-xs text-[#8696a0]">Nombre</p>
                  <p className="font-medium text-[#e9edef]">{contactName}</p>
                </div>
              </div>
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <Users className="h-4 w-4 text-[#8696a0]" />
                  <p className="text-xs text-[#8696a0]">Teléfono</p>
                </div>
                {isEditing ? (
                  <Input
                    value={formData.phone_number}
                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                    placeholder="Ej: 593983859723"
                    className="h-8 ml-6"
                  />
                ) : (
                  <p className="font-medium ml-6">{formData.phone_number || phoneNumber}</p>
                )}
              </div>
            </div>
          )}
        </Card>

        {/* CONTROL DE BOT */}
        <Card className="p-3 bg-[#202c33] border-border/20">
          <button
            onClick={() => toggleSection('bot')}
            className="flex items-center justify-between w-full text-left"
          >
            <div className="flex items-center space-x-2">
              {isBlocked ? (
                <BotOff className="h-4 w-4 text-destructive" />
              ) : (
                <Bot className="h-4 w-4 text-green-500" />
              )}
              <h3 className="font-medium text-sm text-[#e9edef]">CONTROL DE BOT</h3>
            </div>
            {expandedSections.bot ? <ChevronUp className="h-4 w-4 text-[#8696a0]" /> : <ChevronDown className="h-4 w-4 text-[#8696a0]" />}
          </button>

          {expandedSections.bot && (
            <div className="mt-3 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#e9edef] font-medium">
                    Estado: {isBlocked ? 'Desactivado' : 'Activo'}
                  </p>
                  <p className="text-xs text-[#8696a0] mt-1">
                    {isBlocked 
                      ? 'El bot no responderá a este contacto' 
                      : 'El bot puede responder automáticamente'}
                  </p>
                </div>
              </div>
              <Button
                onClick={toggleBotBlock}
                disabled={isBotToggling}
                variant={isBlocked ? 'default' : 'destructive'}
                className="w-full"
                size="sm"
              >
                {isBotToggling ? (
                  'Procesando...'
                ) : isBlocked ? (
                  <>
                    <Bot className="h-4 w-4 mr-2" />
                    Activar Bot
                  </>
                ) : (
                  <>
                    <BotOff className="h-4 w-4 mr-2" />
                    Desactivar Bot
                  </>
                )}
              </Button>
            </div>
          )}
        </Card>

        {/* DATOS PERSONALES */}
        <Card className="p-3 bg-[#202c33] border-border/20">
          <button
            onClick={() => toggleSection('personal')}
            className="flex items-center justify-between w-full text-left"
          >
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-[#00a884]" />
              <h3 className="font-medium text-sm text-[#e9edef]">DATOS PERSONALES</h3>
            </div>
            {expandedSections.personal ? <ChevronUp className="h-4 w-4 text-[#8696a0]" /> : <ChevronDown className="h-4 w-4 text-[#8696a0]" />}
          </button>

          {expandedSections.personal && (
            <div className="mt-3 space-y-3">
              <div>
                <Label className="text-xs">Género</Label>
                {isEditing ? (
                  <Select value={formData.gender} onValueChange={(value) => setFormData({ ...formData, gender: value })}>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Masculino">Masculino</SelectItem>
                      <SelectItem value="Femenino">Femenino</SelectItem>
                      <SelectItem value="Otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm mt-1">{formData.gender || 'No especificado'}</p>
                )}
              </div>

              <div>
                <Label className="text-xs">Origen</Label>
                {isEditing ? (
                  <Input
                    value={formData.origin}
                    onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                    placeholder="Describe el origen..."
                    className="h-8"
                  />
                ) : (
                  <p className="text-sm mt-1">{formData.origin || 'No especificado'}</p>
                )}
              </div>

              <div>
                <Label className="text-xs">Fecha de Nacimiento</Label>
                {isEditing ? (
                  <Input
                    type="date"
                    value={formData.birth_date}
                    onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                    className="h-8"
                  />
                ) : (
                  <p className="text-sm mt-1">
                    {formData.birth_date ? format(new Date(formData.birth_date), 'dd/MM/yyyy') : 'No especificado'}
                  </p>
                )}
              </div>
            </div>
          )}
        </Card>

        {/* AGENTE */}
        <Card className="p-3 bg-[#202c33] border-border/20">
          <button
            onClick={() => toggleSection('agent')}
            className="flex items-center justify-between w-full text-left"
          >
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-[#00a884]" />
              <h3 className="font-medium text-sm text-[#e9edef]">AGENTE</h3>
            </div>
            {expandedSections.agent ? <ChevronUp className="h-4 w-4 text-[#8696a0]" /> : <ChevronDown className="h-4 w-4 text-[#8696a0]" />}
          </button>

          {expandedSections.agent && (
            <div className="mt-3">
              {isEditing ? (
                <Input
                  value={formData.agent_id}
                  onChange={(e) => setFormData({ ...formData, agent_id: e.target.value })}
                  placeholder="Seleccionar agente..."
                  className="h-8"
                />
              ) : (
                <p className="text-sm">{formData.agent_id || 'Sin agente asignado'}</p>
              )}
            </div>
          )}
        </Card>

        {/* EMBUDO */}
        <Card className="p-3 bg-[#202c33] border-border/20">
          <button
            onClick={() => toggleSection('funnel')}
            className="flex items-center justify-between w-full text-left"
          >
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-[#00a884]" />
              <h3 className="font-medium text-sm text-[#e9edef]">EMBUDO</h3>
            </div>
            {expandedSections.funnel ? <ChevronUp className="h-4 w-4 text-[#8696a0]" /> : <ChevronDown className="h-4 w-4 text-[#8696a0]" />}
          </button>

          {expandedSections.funnel && (
            <div className="mt-3">
              <p className="text-sm text-[#e9edef]">
                {currentEmbudo ? currentEmbudo.name : formData.funnel_stage || 'PRIMER CONTACTO'}
              </p>
            </div>
          )}
        </Card>

        {/* CASINO */}
        <Card className="p-3 bg-[#202c33] border-[#00a884]">
          <button
            onClick={() => toggleSection('casino')}
            className="flex items-center justify-between w-full text-left"
          >
            <div className="flex items-center space-x-2">
              <Coins className="h-4 w-4 text-[#00a884]" />
              <h3 className="font-medium text-sm text-[#00a884]">CASINO / BALANCE</h3>
            </div>
            {expandedSections.casino ? <ChevronUp className="h-4 w-4 text-[#8696a0]" /> : <ChevronDown className="h-4 w-4 text-[#8696a0]" />}
          </button>

          {expandedSections.casino && (
            <div className="mt-3 space-y-3">
              <div className="space-y-2">
                <Label className="text-xs">Usuario del Casino</Label>
                <Input
                  value={casinoPassword.username}
                  onChange={(e) => setCasinoPassword({ ...casinoPassword, username: e.target.value })}
                  placeholder="Ingrese username..."
                  className="h-8"
                />
              </div>

              {casinoBalance !== null && (
                <div className="text-center p-4 bg-[#22c55e]/10 border border-[#22c55e] rounded-lg">
                  <Coins className="h-8 w-8 mx-auto mb-2 text-[#22c55e]" />
                  <p className="text-2xl font-bold text-[#22c55e]">${casinoBalance.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">Balance actual</p>
                  {casinoPlayer && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {casinoPlayer.userName} - {casinoPlayer.rolename}
                    </p>
                  )}
                </div>
              )}

              <Button
                onClick={() => casinoPassword.username && loadCasinoBalance(casinoPassword.username)}
                disabled={!casinoPassword.username || casinoLoading}
                variant="outline"
                size="sm"
                className="w-full"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${casinoLoading ? 'animate-spin' : ''}`} />
                Consultar Balance
              </Button>

              <Separator />

              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Crear Jugador
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Crear Nuevo Jugador</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div>
                      <Label>Username</Label>
                      <Input
                        value={casinoPassword.username}
                        onChange={(e) => setCasinoPassword({ ...casinoPassword, username: e.target.value })}
                        placeholder="Username del jugador"
                      />
                    </div>
                    <div>
                      <Label>Contraseña</Label>
                      <div className="relative">
                        <Input
                          type={showCasinoPassword ? 'text' : 'password'}
                          value={casinoPassword.password}
                          onChange={(e) => setCasinoPassword({ ...casinoPassword, password: e.target.value })}
                          placeholder="Contraseña"
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCasinoPassword(!showCasinoPassword)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8696a0] hover:text-[#e9edef]"
                          aria-label={showCasinoPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        >
                          {showCasinoPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                    <Button
                      onClick={handleCreateCasinoPlayer}
                      disabled={casinoLoading}
                      className="w-full"
                    >
                      {casinoLoading ? 'Creando...' : 'Crear Jugador'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="default"
                    size="sm"
                    className="w-full bg-[#22c55e] hover:bg-[#16a34a]"
                    disabled={!casinoPassword.username}
                  >
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Depositar
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Realizar Depósito</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div>
                      <Label>Usuario</Label>
                      <Input
                        value={casinoPassword.username}
                        disabled
                        className="bg-muted"
                      />
                    </div>
                    <div>
                      <Label>Monto a Depositar</Label>
                      <Input
                        type="number"
                        value={casinoTransaction.amount}
                        onChange={(e) => setCasinoTransaction({ ...casinoTransaction, amount: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>
                    <Button
                      onClick={handleCasinoDeposit}
                      disabled={casinoLoading || !casinoTransaction.amount}
                      className="w-full bg-[#22c55e] hover:bg-[#16a34a]"
                    >
                      {casinoLoading ? 'Procesando...' : 'Confirmar Depósito'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full"
                    disabled={!casinoPassword.username}
                  >
                    <TrendingDown className="h-4 w-4 mr-2" />
                    Retirar
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Realizar Retiro</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div>
                      <Label>Usuario</Label>
                      <Input
                        value={casinoPassword.username}
                        disabled
                        className="bg-muted"
                      />
                    </div>
                    <div>
                      <Label>Monto a Retirar</Label>
                      <Input
                        type="number"
                        value={casinoTransaction.amount}
                        onChange={(e) => setCasinoTransaction({ ...casinoTransaction, amount: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>
                    <Button
                      onClick={handleCasinoWithdraw}
                      disabled={casinoLoading || !casinoTransaction.amount}
                      variant="destructive"
                      className="w-full"
                    >
                      {casinoLoading ? 'Procesando...' : 'Confirmar Retiro'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <p className="text-xs text-center text-muted-foreground">
                Gestiona depósitos y retiros del casino
              </p>
            </div>
          )}
        </Card>

        {/* VENTAS */}
        <Card className="p-3 bg-[#202c33] border-border/20">
          <button
            onClick={() => toggleSection('sales')}
            className="flex items-center justify-between w-full text-left"
          >
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-[#00a884]" />
              <h3 className="font-medium text-sm text-[#e9edef]">VENTAS</h3>
            </div>
            {expandedSections.sales ? <ChevronUp className="h-4 w-4 text-[#8696a0]" /> : <ChevronDown className="h-4 w-4 text-[#8696a0]" />}
          </button>

          {expandedSections.sales && (
            <div className="mt-3 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{sales.length} ventas registradas</p>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="h-7">
                      <Plus className="h-3 w-3 mr-1" />
                      Nueva
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Registrar Venta</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div>
                        <Label>Monto</Label>
                        <Input
                          type="number"
                          value={newSale.amount}
                          onChange={(e) => setNewSale({ ...newSale, amount: e.target.value })}
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <Label>Descripción</Label>
                        <Textarea
                          value={newSale.description}
                          onChange={(e) => setNewSale({ ...newSale, description: e.target.value })}
                          placeholder="Detalles de la venta..."
                        />
                      </div>
                      <Button onClick={handleCreateSale} className="w-full">
                        Registrar Venta
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="text-center p-4 bg-muted rounded-lg">
                <DollarSign className="h-8 w-8 mx-auto mb-2 text-success" />
                <p className="text-2xl font-bold">${totalSales.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Total en ventas</p>
              </div>

              {sales.length === 0 && (
                <p className="text-xs text-center text-muted-foreground py-4">
                  No hay ventas registradas
                </p>
              )}

              {sales.map((sale) => (
                <div key={sale.id} className="p-2 bg-muted/50 rounded text-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">${parseFloat(sale.amount.toString()).toFixed(2)}</p>
                      {sale.description && (
                        <p className="text-xs text-muted-foreground">{sale.description}</p>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(sale.sale_date), 'dd/MM/yy')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* NOTAS */}
        <Card className="p-3 bg-[#202c33] border-border/20">
          <button
            onClick={() => toggleSection('notes')}
            className="flex items-center justify-between w-full text-left"
          >
            <div className="flex items-center space-x-2">
              <FileText className="h-4 w-4 text-[#00a884]" />
              <h3 className="font-medium text-sm text-[#e9edef]">NOTAS</h3>
            </div>
            {expandedSections.notes ? <ChevronUp className="h-4 w-4 text-[#8696a0]" /> : <ChevronDown className="h-4 w-4 text-[#8696a0]" />}
          </button>

          {expandedSections.notes && (
            <div className="mt-3">
              {isEditing ? (
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Añade notas sobre este contacto..."
                  className="min-h-20"
                />
              ) : (
                <p className="text-sm whitespace-pre-wrap">{formData.notes || 'Sin notas'}</p>
              )}
            </div>
          )}
        </Card>

        {isEditing && (
          <Button onClick={handleSave} className="w-full">
            Guardar Cambios
          </Button>
        )}
      </div>
    </div>
  );
};
