import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook para cargar archivos media con autenticación de WAHA o Twilio
 * Convierte URLs protegidas en blob URLs para mostrar en el navegador
 */
export const useAuthenticatedMedia = (url: string | null) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!url) {
      setBlobUrl(null);
      return;
    }

    const isWahaUrl = url.includes('/api/files/');
    const isTwilioUrl = url.includes('api.twilio.com') || url.includes('media.twiliocdn.com');

    // Si no es una URL protegida, usarla directamente
    if (!isWahaUrl && !isTwilioUrl) {
      setBlobUrl(url);
      return;
    }

    let isMounted = true;

    const loadAuthenticatedMedia = async () => {
      setIsLoading(true);
      setError(null);

      try {
        let data: { file: string; mimeType: string } | null = null;

        if (isWahaUrl) {
          // Usar edge function de WAHA
          const { data: wahaData, error: invokeError } = await supabase.functions.invoke('waha-get-file', {
            body: { fileUrl: url }
          });

          if (invokeError) throw invokeError;
          if (!wahaData?.file) throw new Error('No se recibió el archivo');
          data = wahaData;
        } else if (isTwilioUrl) {
          // Usar edge function de Twilio
          const { data: twilioData, error: invokeError } = await supabase.functions.invoke('twilio-get-file', {
            body: { mediaUrl: url }
          });

          if (invokeError) throw invokeError;
          if (!twilioData?.file) throw new Error('No se recibió el archivo');
          data = twilioData;
        }

        if (!data) {
          setBlobUrl(url);
          return;
        }

        // Convertir base64 a blob
        const base64Data = data.file.split(',')[1] || data.file;
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: data.mimeType || 'application/octet-stream' });
        
        const newBlobUrl = URL.createObjectURL(blob);
        
        if (isMounted) {
          setBlobUrl(newBlobUrl);
        }
      } catch (err) {
        console.error('Error loading authenticated media:', err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Error al cargar el archivo');
          // Fallback: intentar cargar directamente
          setBlobUrl(url);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadAuthenticatedMedia();

    // Cleanup: revocar blob URL cuando el componente se desmonte
    return () => {
      isMounted = false;
      if (blobUrl && blobUrl.startsWith('blob:')) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [url]);

  return { blobUrl, isLoading, error };
};
