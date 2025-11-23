// Manejar respuesta de Supabase
export const handleResponse = async (response: Response): Promise<Record<string, unknown> | null> => {
  let data = null;
  const contentType = response.headers.get('content-type');
  
  if (contentType && contentType.includes('application/json')) {
    const responseText = await response.text();
    if (responseText) {
      try {
        data = JSON.parse(responseText);
      } catch {
        data = { message: 'Operation completed successfully' };
      }
    } else {
      data = { message: 'Operation completed successfully' };
    }
  } else {
    data = { message: 'Operation completed successfully' };
  }
  
  return data;
};