'use client';

import { MessageSquareOff } from 'lucide-react';

export default function ClientChatPage() {
  return (
    <div className="h-full flex flex-col bg-[#1a1d23]">
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="mb-6 flex justify-center">
            <div className="w-24 h-24 bg-[#2a2d35] rounded-full flex items-center justify-center border border-[#3a3d45]">
              <MessageSquareOff size={48} className="text-gray-400" />
            </div>
          </div>
          <h2 className="text-2xl font-bold mb-3 text-white">Soporte No Disponible</h2>
          <p className="text-gray-400 mb-6">
            El sistema de chat de soporte al cliente no está disponible en este momento. 
            Por favor, intentá más tarde o contactanos por otros medios.
          </p>
          <div className="bg-[#2a2d35] border border-[#3a3d45] rounded-lg p-4">
            <p className="text-sm text-gray-300">
              💡 <strong>Nota:</strong> Estamos trabajando para mejorar nuestro servicio de atención. 
              Disculpá las molestias.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}