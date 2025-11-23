'use client';

import { UsuarioResponse } from '@/app/api/usuarios/domain/usuario';

interface ConfirmActivateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  usuario: UsuarioResponse | null;
  isLoading: boolean;
}

export default function ConfirmActivateModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  usuario, 
  isLoading 
}: ConfirmActivateModalProps) {
  if (!isOpen || !usuario) return null;

  const handleConfirm = () => {
    onConfirm();
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-[#1a1d23] rounded-lg w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#3a3d45]">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">✅</span>
            </div>
            <div>
              <h2 className="text-white text-lg font-semibold">Confirmar Activación de Usuario</h2>
              <p className="text-gray-400 text-sm">Reactivar acceso al sistema</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-6">
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-12 h-12 rounded-full overflow-hidden">
                <img 
                  src="https://pbs.twimg.com/profile_images/1118644090420322304/5SFmHCl-_400x400.jpg" 
                  alt="User Avatar"
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h3 className="text-white font-medium">{usuario.nombre}</h3>
                <p className="text-gray-400 text-sm">{usuario.correo_electronico}</p>
                <p className="text-gray-500 text-xs">{usuario.nombre_agencia}</p>
              </div>
            </div>

            <div className="bg-[#2a2d35] border border-[#3a3d45] rounded-lg p-4 mb-4">
              <p className="text-gray-300 text-sm mb-2">
                ¿Estás seguro de que deseas reactivar a este usuario?
              </p>
              <ul className="text-gray-400 text-xs space-y-1">
                <li>• El usuario podrá iniciar sesión nuevamente</li>
                <li>• Tendrá acceso completo al sistema</li>
                <li>• Sus datos y configuraciones se mantienen</li>
              </ul>
            </div>

            {usuario.activo ? (
              <div className="flex items-center space-x-2 text-green-400 text-sm">
                <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                <span>Estado actual: Activo</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2 text-red-400 text-sm">
                <span className="w-2 h-2 bg-red-400 rounded-full"></span>
                <span>Estado actual: Inactivo</span>
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isLoading}
              className="bg-green-500 hover:bg-green-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
            >
              {isLoading && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              )}
              <span>{isLoading ? 'Procesando...' : 'Reactivar Usuario'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
