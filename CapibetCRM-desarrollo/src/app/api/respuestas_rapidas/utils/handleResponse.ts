export async function handleResponse(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type');
  
  if (contentType && contentType.includes('application/json')) {
    return await response.json();
  }
  
  return await response.text();
}
