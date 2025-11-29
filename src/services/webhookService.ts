const WEBHOOK_URL = 'https://n8n2025.nocodeveloper.site/webhook/guardar_contacto';

export const webhookService = {
  /**
   * Envía datos al webhook de n8n de forma asíncrona y no bloqueante
   * Si falla, solo registra el error sin interrumpir el flujo principal
   */
  async sendToWebhook(data: any): Promise<void> {
    try {
      console.log('Sending data to webhook:', WEBHOOK_URL);
      
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        console.error('Webhook response not OK:', response.status, response.statusText);
      } else {
        console.log('Webhook called successfully');
      }
    } catch (error) {
      console.error('Error calling webhook:', error);
      // No lanzamos el error para que no bloquee la operación principal
    }
  },

  /**
   * Envía datos de contacto creado manualmente (formulario simple)
   */
  async sendContactCreated(contactData: {
    id: string;
    name: string;
    phone_number: string;
    email?: string | null;
    user_id: string;
    contact_list_id?: string | null;
    created_at?: string;
  }): Promise<void> {
    const payload = {
      type: 'contact',
      source: 'manual_simple',
      timestamp: new Date().toISOString(),
      data: contactData,
    };

    await this.sendToWebhook(payload);
  },

  /**
   * Envía datos de contacto creado con formulario completo
   */
  async sendFullContactCreated(contactData: {
    id: string;
    first_name: string;
    last_name?: string | null;
    name: string;
    phone_number: string;
    email?: string | null;
    address?: string | null;
    website?: string | null;
    notes?: string | null;
    gender?: string | null;
    birth_date?: string | null;
    origin?: string | null;
    is_blocked?: boolean | null;
    user_id: string;
    created_at?: string;
    updated_at?: string;
  }): Promise<void> {
    const payload = {
      type: 'contact',
      source: 'manual_complete',
      timestamp: new Date().toISOString(),
      data: contactData,
    };

    await this.sendToWebhook(payload);
  },
};
