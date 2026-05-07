import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Phone, Upload, X, FileText, FileAudio, Paperclip, Loader2 } from 'lucide-react';
import Papa from 'papaparse';

interface AttachmentFile {
  file: File;
  name: string;
}

export default function LlamadasIA() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [contactsText, setContactsText] = useState('');
  const [knowledgeBaseText, setKnowledgeBaseText] = useState('');
  const [knowledgeBaseFiles, setKnowledgeBaseFiles] = useState<AttachmentFile[]>([]);

  // Parsear texto a un array de contactos (separados por comas o saltos de línea)
  const parseContacts = (text: string) => {
    if (!text.trim()) return [];
    return text.split(/[\n,]+/).map(s => s.trim()).filter(s => s.length > 0);
  };

  const handleContactsFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.endsWith('.csv')) {
      Papa.parse(file, {
        complete: (results) => {
          const numbers = results.data.map((row: any) => row[0]).filter(Boolean);
          setContactsText(prev => prev ? `${prev}\n${numbers.join('\n')}` : numbers.join('\n'));
        }
      });
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setContactsText(prev => prev ? `${prev}\n${text}` : text);
      };
      reader.readAsText(file);
    }
    
    // Reset input
    e.target.value = '';
  };

  const handleKBFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).map(file => ({
        file,
        name: file.name
      }));
      setKnowledgeBaseFiles(prev => [...prev, ...newFiles]);
    }
    // Reset input
    e.target.value = '';
  };

  const handleRemoveKBFile = (index: number) => {
    setKnowledgeBaseFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast({ title: "Error", description: "El nombre es requerido.", variant: "destructive" });
      return;
    }

    const contactsList = parseContacts(contactsText);
    if (contactsList.length === 0) {
      toast({ title: "Error", description: "Debes agregar al menos un contacto.", variant: "destructive" });
      return;
    }

    if (!knowledgeBaseText.trim() && knowledgeBaseFiles.length === 0) {
      toast({ title: "Error", description: "Debes agregar base de conocimiento (texto o archivos).", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      // Subir archivos de base de conocimiento a Storage (opcional, si existe bucket 'kb-attachments')
      const uploadedFileUrls: string[] = [];
      
      for (const kbFile of knowledgeBaseFiles) {
        const fileExt = kbFile.file.name.split('.').pop();
        const fileName = `${user?.id}/kb-${Date.now()}-${Math.random()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('chat-attachments') // Usando chat-attachments por simplicidad o crear uno nuevo
          .upload(fileName, kbFile.file);

        if (uploadError) {
          console.error("Error uploading file:", uploadError);
          // throw uploadError; // Descomentar si el bucket es estricto
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('chat-attachments')
            .getPublicUrl(fileName);
          uploadedFileUrls.push(publicUrl);
        }
      }

      const { error } = await supabase
        .from('ia_calls')
        .insert({
          user_id: user?.id,
          name: name,
          contacts: contactsList,
          knowledge_base_text: knowledgeBaseText,
          knowledge_base_files: uploadedFileUrls,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: "Llamada IA creada",
        description: "Se ha configurado la llamada correctamente.",
      });

      // Limpiar formulario o redirigir
      setName('');
      setContactsText('');
      setKnowledgeBaseText('');
      setKnowledgeBaseFiles([]);
      
    } catch (error: any) {
      console.error('Error creating IA call:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo crear la llamada IA.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Phone className="h-8 w-8 text-primary" />
              Llamadas IA
            </h1>
            <p className="text-muted-foreground mt-1">Configura llamadas automatizadas con Inteligencia Artificial</p>
          </div>
        </div>

        <Card className="border-border">
          <CardHeader>
            <CardTitle>Configuración de Llamada</CardTitle>
            <CardDescription>Define el nombre, contactos y la base de conocimiento para la IA.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Nombre */}
            <div className="space-y-2">
              <Label>Nombre de la campaña / llamada</Label>
              <Input 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="Ej. Llamadas de prospección Marzo" 
              />
            </div>

            {/* Contactos */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Contactos (Números de teléfono)</Label>
                <div className="flex gap-2">
                  <input
                    id="contacts-upload"
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleContactsFileUpload}
                    className="hidden"
                  />
                  <label htmlFor="contacts-upload">
                    <Button variant="outline" size="sm" asChild className="cursor-pointer">
                      <span>
                        <Upload className="h-4 w-4 mr-2" />
                        Subir CSV/TXT
                      </span>
                    </Button>
                  </label>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Pega los números separados por comas o saltos de línea, escríbelos manualmente o sube un archivo.</p>
              <Textarea 
                value={contactsText} 
                onChange={(e) => setContactsText(e.target.value)} 
                placeholder="Ej: +34600000000, +525555555555" 
                className="min-h-[120px]"
              />
              {parseContacts(contactsText).length > 0 && (
                <p className="text-sm font-medium text-primary">
                  {parseContacts(contactsText).length} contactos detectados
                </p>
              )}
            </div>

            {/* Base de Conocimiento */}
            <div className="space-y-4 pt-4 border-t border-border">
              <div>
                <Label className="text-lg">Base de Conocimiento</Label>
                <p className="text-sm text-muted-foreground">Proporciona el texto o documentos que la IA usará para responder y guiar la llamada.</p>
              </div>

              <div className="space-y-2">
                <Label>Texto de instrucciones o información</Label>
                <Textarea 
                  value={knowledgeBaseText} 
                  onChange={(e) => setKnowledgeBaseText(e.target.value)} 
                  placeholder="Instrucciones: Eres un asistente de ventas para la empresa X. Tu objetivo es agendar una cita. Aquí están los detalles del producto..." 
                  className="min-h-[150px]"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>Archivos adjuntos (PDF, DOC, TXT)</Label>
                  <input
                    id="kb-upload"
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.txt"
                    onChange={handleKBFileUpload}
                    className="hidden"
                  />
                  <label htmlFor="kb-upload">
                    <Button variant="outline" size="sm" asChild className="cursor-pointer">
                      <span>
                        <Paperclip className="h-4 w-4 mr-2" />
                        Adjuntar Archivo
                      </span>
                    </Button>
                  </label>
                </div>
                
                {knowledgeBaseFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {knowledgeBaseFiles.map((file, index) => (
                      <div key={index} className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-md border border-border">
                        <FileText className="h-4 w-4 text-primary" />
                        <span className="text-sm text-foreground">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveKBFile(index)}
                          className="text-muted-foreground hover:text-destructive ml-1"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <Button 
                onClick={handleSubmit} 
                disabled={loading}
                className="bg-primary hover:bg-primary/90 text-white min-w-[200px]"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  'Crear Llamada IA'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
