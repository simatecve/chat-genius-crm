import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook para cargar archivos media con autenticación de WAHA
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

    // Si no es una URL de WAHA, usarla directamente
    if (!url.includes('/api/files/')) {
      setBlobUrl(url);
      return;
    }

    let isMounted = true;

    const loadAuthenticatedMedia = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Invocar edge function para obtener el archivo con autenticación
        const { data, error: invokeError } = await supabase.functions.invoke('waha-get-file', {
          body: { fileUrl: url }
        });

        if (invokeError) throw invokeError;
        if (!data?.file) throw new Error('No se recibió el archivo');

        // Convertir base64 a blob
        const base64Data = data.file.split(',')[1] || data.file;
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: data.mimeType || 'application/octet-stream' });
        
        const blobUrl = URL.createObjectURL(blob);
        
        if (isMounted) {
          setBlobUrl(blobUrl);
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
