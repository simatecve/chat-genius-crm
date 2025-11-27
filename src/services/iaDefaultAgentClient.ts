import { supabase } from '@/integrations/supabase/client';

export interface DefaultAgentRequest {
  userId: string;
  messageContent: string;
}

export interface DefaultAgentResponse {
  isActivated: boolean;
  intencionCargaFichas: boolean;
  comprobanteDetectado: boolean;
  respuesta: string;
}

export const iaDefaultAgentClient = {
  async respond(input: DefaultAgentRequest): Promise<DefaultAgentResponse> {
    const { data, error } = await supabase.functions.invoke('ia-default-agent', {
      body: input,
    });

    if (error) {
      console.error('Error invoking ia-default-agent:', error);
      throw error;
    }

    return data as DefaultAgentResponse;
  }
};