'use client';

import { useEffect } from 'react';

export function HydrationHandler() {
  useEffect(() => {
    // Suprimir warnings de hidratación específicos para extensiones del navegador
    const originalError = console.error;
    
    console.error = (...args) => {
      const message = args[0];
      
      // Ignorar errores de hidratación causados por extensiones del navegador
      if (
        typeof message === 'string' && (
          message.includes('cz-shortcut-listen') ||
          message.includes('A tree hydrated but some attributes') ||
          message.includes('browser extension')
        )
      ) {
        return;
      }
      
      // Mostrar otros errores normalmente
      originalError.apply(console, args);
    };

    // Cleanup: restaurar console.error original cuando el componente se desmonte
    return () => {
      console.error = originalError;
    };
  }, []);

  return null;
}
