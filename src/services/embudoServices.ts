import { supabase } from '@/integrations/supabase/client';

export interface EmbudoData {
    nombre: string;
    descripcion?: string;
    espacio_id: string;
    orden?: number;
    color?: string;
}

export interface EmbudoResponse {
    id: string;
    nombre: string;
    descripcion?: string;
    creado_por?: string;
    creado_en: string;
    espacio_id: string;
    orden: number;
    color: string;
}

class EmbudoServices {
    /**
     * Obtiene todos los embudos de un espacio de trabajo
     */
    async getEmbudosByEspacio(espacioId: string): Promise<{ success: boolean; data?: EmbudoResponse[]; error?: string }> {
        try {
            const { data, error } = await supabase
                .from('embudos')
                .select('*')
                .eq('espacio_id', espacioId)
                .order('orden', { ascending: true });

            if (error) {
                console.error('Error al obtener embudos:', error);
                return {
                    success: false,
                    error: error.message
                };
            }

            return {
                success: true,
                data: data as EmbudoResponse[]
            };
        } catch (error) {
            console.error('Error al obtener embudos:', error);
            return {
                success: false,
                error: 'Error de conexión al obtener embudos'
            };
        }
    }

    /**
     * Crea un nuevo embudo
     */
    async createEmbudo(embudoData: EmbudoData): Promise<{ success: boolean; data?: EmbudoResponse; error?: string }> {
        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                return { success: false, error: 'Usuario no autenticado' };
            }

            const { data, error } = await supabase
                .from('embudos')
                .insert([{
                    ...embudoData,
                    creado_por: user.id
                }])
                .select()
                .single();

            if (error) {
                console.error('Error al crear embudo:', error);
                return {
                    success: false,
                    error: error.message
                };
            }

            return {
                success: true,
                data: data as EmbudoResponse
            };
        } catch (error) {
            console.error('Error al crear embudo:', error);
            return {
                success: false,
                error: 'Error de conexión al crear embudo'
            };
        }
    }

    /**
     * Actualiza un embudo
     */
    async updateEmbudo(id: string, embudoData: Partial<EmbudoData>): Promise<{ success: boolean; data?: EmbudoResponse; error?: string }> {
        try {
            const { data, error } = await supabase
                .from('embudos')
                .update(embudoData)
                .eq('id', id)
                .select()
                .single();

            if (error) {
                console.error('Error al actualizar embudo:', error);
                return {
                    success: false,
                    error: error.message
                };
            }

            return {
                success: true,
                data: data as EmbudoResponse
            };
        } catch (error) {
            console.error('Error al actualizar embudo:', error);
            return {
                success: false,
                error: 'Error de conexión al actualizar embudo'
            };
        }
    }

    /**
     * Elimina un embudo
     */
    async deleteEmbudo(id: string): Promise<{ success: boolean; error?: string }> {
        try {
            const { error } = await supabase
                .from('embudos')
                .delete()
                .eq('id', id);

            if (error) {
                console.error('Error al eliminar embudo:', error);
                return {
                    success: false,
                    error: error.message
                };
            }

            return { success: true };
        } catch (error) {
            console.error('Error al eliminar embudo:', error);
            return {
                success: false,
                error: 'Error de conexión al eliminar embudo'
            };
        }
    }
}

export const embudoServices = new EmbudoServices();
export default EmbudoServices;
