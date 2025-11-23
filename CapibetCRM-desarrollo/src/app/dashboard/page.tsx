'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { contactoServices } from '@/services/contactoServices';
import { Users, MessageCircle, Inbox, Send, HelpCircle } from 'lucide-react';

export default function DashboardPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [contactsCount, setContactsCount] = useState(0);
  const [loadingContacts, setLoadingContacts] = useState(false);

  // Función para cargar la cantidad de contactos
  const loadContactsCount = async () => {
    setLoadingContacts(true);
    try {
      const response = await contactoServices.getContactosCount();
      if (response.success && response.data !== undefined) {
        setContactsCount(response.data);
      }
    } catch (error) {
      console.error('Error loading contacts count:', error);
    } finally {
      setLoadingContacts(false);
    }
  };

  useEffect(() => {
    if (!isLoading && user) {
      if (user.rol === 'Cliente') {
        router.push('/cliente');
        return;
      }
      loadContactsCount();
    }
  }, [user, isLoading, router]);

  if (user?.rol === 'Cliente') {
    return null;
  }

  return (
    <div className="flex-1 flex flex-col bg-[#111827] p-6 overflow-y-auto">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {/* Clientes Activos */}
        <div className="bg-[#1F2937] rounded-xl p-6 border border-gray-800 relative">
          <div className="absolute top-4 right-4 text-gray-500 hover:text-gray-300 cursor-pointer">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-gray-400 text-sm mb-1">Clientes Activos</span>
            <div className="flex items-center mt-2">
              <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center mr-4">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="text-3xl font-bold text-white">{loadingContacts ? '...' : contactsCount}</span>
                <div className="flex items-center mt-1">
                  <span className="text-red-500 text-xs font-medium">-100%</span>
                  <span className="text-gray-500 text-xs ml-1">Esta semana</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Total de Mensajes */}
        <div className="bg-[#1F2937] rounded-xl p-6 border border-gray-800 relative">
          <div className="absolute top-4 right-4 text-gray-500 hover:text-gray-300 cursor-pointer">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-gray-400 text-sm mb-1">Total de Mensajes</span>
            <div className="flex items-center mt-2">
              <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center mr-4">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="text-3xl font-bold text-white">0</span>
                <div className="flex items-center mt-1">
                  <span className="text-red-500 text-xs font-medium">-100%</span>
                  <span className="text-gray-500 text-xs ml-1">Esta semana</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Total Mensajes Recibidos */}
        <div className="bg-[#1F2937] rounded-xl p-6 border border-gray-800 relative">
          <div className="absolute top-4 right-4 text-gray-500 hover:text-gray-300 cursor-pointer">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-gray-400 text-sm mb-1">Total Mensajes Recibidos</span>
            <div className="flex items-center mt-2">
              <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center mr-4">
                <Inbox className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="text-3xl font-bold text-white">0</span>
                <div className="flex items-center mt-1">
                  <span className="text-red-500 text-xs font-medium">-100%</span>
                  <span className="text-gray-500 text-xs ml-1">Esta semana</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Total Mensajes Enviados */}
        <div className="bg-[#1F2937] rounded-xl p-6 border border-gray-800 relative">
          <div className="absolute top-4 right-4 text-gray-500 hover:text-gray-300 cursor-pointer">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-gray-400 text-sm mb-1">Total Mensajes Enviados</span>
            <div className="flex items-center mt-2">
              <div className="w-12 h-12 rounded-full bg-purple-500 flex items-center justify-center mr-4">
                <Send className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="text-3xl font-bold text-white">0</span>
                <div className="flex items-center mt-1">
                  <span className="text-red-500 text-xs font-medium">-100%</span>
                  <span className="text-gray-500 text-xs ml-1">Esta semana</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Mensajes por Día */}
        <div className="bg-[#1F2937] rounded-xl p-6 border border-gray-800">
          <div className="flex items-center space-x-2 mb-6">
            <h3 className="text-white font-medium">Mensajes por Día</h3>
            <HelpCircle className="w-4 h-4 text-gray-500" />
          </div>
          <div className="h-64 w-full relative">
            {/* Mock Chart */}
            <svg className="w-full h-full" viewBox="0 0 400 200" preserveAspectRatio="none">
              {/* Grid lines */}
              <line x1="0" y1="160" x2="400" y2="160" stroke="#374151" strokeWidth="1" />
              <line x1="0" y1="120" x2="400" y2="120" stroke="#374151" strokeWidth="1" strokeDasharray="4 4" />
              <line x1="0" y1="80" x2="400" y2="80" stroke="#374151" strokeWidth="1" strokeDasharray="4 4" />
              <line x1="0" y1="40" x2="400" y2="40" stroke="#374151" strokeWidth="1" strokeDasharray="4 4" />

              {/* Y Axis Labels */}
              <text x="10" y="160" fill="#9CA3AF" fontSize="10">0</text>
              <text x="10" y="120" fill="#9CA3AF" fontSize="10">4</text>
              <text x="10" y="80" fill="#9CA3AF" fontSize="10">8</text>
              <text x="10" y="40" fill="#9CA3AF" fontSize="10">12</text>
              <text x="10" y="10" fill="#9CA3AF" fontSize="10">16</text>

              {/* X Axis Labels */}
              <text x="20" y="180" fill="#9CA3AF" fontSize="10">Dom</text>
              <text x="380" y="180" fill="#9CA3AF" fontSize="10">Mar</text>

              {/* Lines */}
              {/* Blue Line (Enviados) */}
              <path d="M 20 50 Q 200 180 380 100" fill="none" stroke="#3B82F6" strokeWidth="2" />
              <circle cx="20" cy="50" r="3" fill="#3B82F6" stroke="#1F2937" strokeWidth="2" />
              <circle cx="200" cy="155" r="3" fill="#3B82F6" stroke="#1F2937" strokeWidth="2" />
              <circle cx="380" cy="100" r="3" fill="#3B82F6" stroke="#1F2937" strokeWidth="2" />

              {/* Green Line (Recibidos) */}
              <path d="M 20 40 Q 200 100 380 105" fill="none" stroke="#10B981" strokeWidth="2" />
              <circle cx="20" cy="40" r="3" fill="#10B981" stroke="#1F2937" strokeWidth="2" />
              <circle cx="200" cy="95" r="3" fill="#10B981" stroke="#1F2937" strokeWidth="2" />
              <circle cx="380" cy="105" r="3" fill="#10B981" stroke="#1F2937" strokeWidth="2" />
            </svg>

            {/* Legend */}
            <div className="flex justify-center mt-2 space-x-4">
              <div className="flex items-center">
                <div className="w-2 h-2 rounded-full bg-blue-500 mr-2"></div>
                <span className="text-blue-500 text-xs">Enviados</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                <span className="text-green-500 text-xs">Recibidos</span>
              </div>
            </div>
          </div>
        </div>

        {/* Crecimiento de Clientes */}
        <div className="bg-[#1F2937] rounded-xl p-6 border border-gray-800">
          <div className="flex items-center space-x-2 mb-6">
            <h3 className="text-white font-medium">Crecimiento de Clientes</h3>
            <HelpCircle className="w-4 h-4 text-gray-500" />
          </div>
          <div className="h-64 w-full relative">
            <svg className="w-full h-full" viewBox="0 0 400 200" preserveAspectRatio="none">
              {/* Grid lines */}
              <line x1="30" y1="160" x2="400" y2="160" stroke="#374151" strokeWidth="1" />
              <line x1="30" y1="120" x2="400" y2="120" stroke="#374151" strokeWidth="1" strokeDasharray="4 4" />
              <line x1="30" y1="80" x2="400" y2="80" stroke="#374151" strokeWidth="1" strokeDasharray="4 4" />
              <line x1="30" y1="40" x2="400" y2="40" stroke="#374151" strokeWidth="1" strokeDasharray="4 4" />

              {/* Y Axis Labels */}
              <text x="0" y="160" fill="#9CA3AF" fontSize="10">0</text>
              <text x="0" y="120" fill="#9CA3AF" fontSize="10">350</text>
              <text x="0" y="80" fill="#9CA3AF" fontSize="10">700</text>
              <text x="0" y="40" fill="#9CA3AF" fontSize="10">1050</text>
              <text x="0" y="10" fill="#9CA3AF" fontSize="10">1400</text>

              {/* X Axis Labels */}
              <text x="50" y="180" fill="#9CA3AF" fontSize="10">Jun</text>
              <text x="120" y="180" fill="#9CA3AF" fontSize="10">Jul</text>
              <text x="190" y="180" fill="#9CA3AF" fontSize="10">Aug</text>
              <text x="260" y="180" fill="#9CA3AF" fontSize="10">Sep</text>
              <text x="330" y="180" fill="#9CA3AF" fontSize="10">Oct</text>
              <text x="380" y="180" fill="#9CA3AF" fontSize="10">Nov</text>

              {/* Bar */}
              <rect x="360" y="60" width="40" height="100" fill="#F97316" rx="2" />
            </svg>

            {/* Legend */}
            <div className="flex justify-center mt-2">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-orange-500 mr-2 rounded-sm"></div>
                <span className="text-orange-500 text-xs">Clientes</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mensajes por Canal */}
        <div className="bg-[#1F2937] rounded-xl p-6 border border-gray-800 h-80">
          <div className="flex items-center space-x-2 mb-6">
            <h3 className="text-white font-medium">Mensajes por Canal</h3>
            <HelpCircle className="w-4 h-4 text-gray-500" />
          </div>
          <div className="h-full flex items-center justify-center">
            <span className="text-gray-500 text-sm">No hay datos disponibles</span>
          </div>
        </div>

        {/* Distribución Operador vs IA */}
        <div className="bg-[#1F2937] rounded-xl p-6 border border-gray-800 h-80">
          <div className="flex items-center space-x-2 mb-6">
            <h3 className="text-white font-medium">Distribución Operador vs IA</h3>
            <HelpCircle className="w-4 h-4 text-gray-500" />
          </div>
          <div className="h-full flex items-center justify-center">
            {/* Placeholder for future chart */}
          </div>
        </div>
      </div>
    </div>
  );
}
