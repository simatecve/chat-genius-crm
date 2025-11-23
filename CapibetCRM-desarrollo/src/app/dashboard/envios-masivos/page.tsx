'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isUserAuthenticated } from '@/utils/auth';

// Tipos para envíos masivos
interface BulkMessage {
  id: number;
  progreso: number;
  totalMensajes: number;
  entregado: number;
  fallido: number;
  creador: string;
  estado: 'pendiente' | 'enviando' | 'completado' | 'fallido';
  fechaCreacion: string;
  sesiones: string[];
  contactos: string[];
  mensaje: string;
}

// Datos de ejemplo
const bulkMessagesData: BulkMessage[] = [];

export default function EnviosMasivosPage() {
  const [activeTab, setActiveTab] = useState<'nuevo' | 'lista'>('nuevo');
  const [bulkMessages, setBulkMessages] = useState<BulkMessage[]>(bulkMessagesData);
  const [selectedSessions, setSelectedSessions] = useState<string[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [phoneNumbers, setPhoneNumbers] = useState('');
  const [waitTime, setWaitTime] = useState(5);
  const [messagesPerRound, setMessagesPerRound] = useState(10);
  const [enableWaitTime, setEnableWaitTime] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!isUserAuthenticated()) {
      router.push('/login');
      return;
    }
  }, [router]);

  // Manejar envío masivo
  const handleStartBulkSend = () => {
    if (!message.trim()) {
      alert('Por favor ingresa un mensaje');
      return;
    }

    if (!phoneNumbers.trim() && selectedContacts.length === 0) {
      alert('Por favor ingresa números de teléfono o selecciona contactos');
      return;
    }

    // Crear nuevo envío masivo
    const newBulkMessage: BulkMessage = {
      id: Date.now(),
      progreso: 0,
      totalMensajes: phoneNumbers.split(',').filter(n => n.trim()).length,
      entregado: 0,
      fallido: 0,
      creador: 'Usuario Actual',
      estado: 'pendiente',
      fechaCreacion: new Date().toISOString(),
      sesiones: selectedSessions,
      contactos: selectedContacts,
      mensaje: message
    };

    setBulkMessages([newBulkMessage, ...bulkMessages]);
    
    // Limpiar formulario
    setMessage('');
    setPhoneNumbers('');
    setSelectedSessions([]);
    setSelectedContacts([]);
    
    // Cambiar a la pestaña de lista
    setActiveTab('lista');
    
    alert('Envío masivo iniciado');
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES');
    } catch {
      return '-';
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Header de Envíos Masivos */}
      <div className="bg-[var(--bg-primary)] border-b border-[var(--border-primary)] px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left Section */}
          <div className="flex items-center space-x-4">
            <button className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-2 rounded">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-[var(--text-primary)] font-semibold text-2xl">Envíos masivos</h1>
          </div>

          {/* Right Section */}
          <div className="flex items-center space-x-4">
            <button className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-2 rounded">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-[var(--bg-primary)] border-b border-[var(--border-primary)] px-6">
        <div className="flex items-center space-x-8">
          <button
            onClick={() => setActiveTab('nuevo')}
            className={`flex items-center space-x-2 py-3 border-b-2 transition-colors ${
              activeTab === 'nuevo'
                ? 'border-[var(--accent-primary)] text-[var(--accent-primary)]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <span>📤</span>
            <span className="font-medium">+ Nuevo envío masivo</span>
          </button>

          <button
            onClick={() => setActiveTab('lista')}
            className={`flex items-center space-x-2 py-3 border-b-2 transition-colors ${
              activeTab === 'lista'
                ? 'border-[var(--accent-primary)] text-[var(--accent-primary)]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <span>📋</span>
            <span className="font-medium">Lista de envíos masivos</span>
          </button>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="flex-1 bg-[var(--bg-primary)] p-6">
        {/* Sección Nuevo Envío Masivo */}
        {activeTab === 'nuevo' && (
          <div>
            <h2 className="text-[var(--text-primary)] font-semibold text-xl mb-6">Nuevo envío masivo</h2>
            
            <div className="grid grid-cols-2 gap-6">
              {/* Columna izquierda */}
              <div className="space-y-6">
                {/* Buscar sesión */}
                <div>
                  <label className="block text-[var(--text-muted)] text-sm mb-2">Buscar sesión</label>
                  <select className="w-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)]">
                    <option value="">Seleccionar sesión</option>
                    <option value="sesion1">Sesión 1</option>
                    <option value="sesion2">Sesión 2</option>
                  </select>
                </div>

                {/* Números de teléfono */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[var(--text-muted)] text-sm">Ingresa números de teléfono separados por comas</label>
                    <div className="flex items-center space-x-2">
                      <button className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                      <button className="bg-[var(--bg-secondary)] text-[var(--text-primary)] px-3 py-1 rounded text-sm hover:bg-[var(--bg-tertiary)] transition-colors">
                        CSV
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={phoneNumbers}
                    onChange={(e) => setPhoneNumbers(e.target.value)}
                    className="w-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded px-3 py-2 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] resize-none"
                    rows={4}
                    placeholder="Ej: +1234567890, +0987654321"
                  />
                </div>

                {/* Agregar otra sesión */}
                <button className="text-[var(--accent-primary)] hover:text-[var(--accent-hover)] text-sm font-medium transition-colors">
                  + AGREGAR OTRA SESIÓN
                </button>

                {/* Mensaje */}
                <div className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)] p-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-8 h-8 bg-[var(--bg-primary)] rounded-full flex items-center justify-center">
                      <span className="text-[var(--text-muted)]">😊</span>
                    </div>
                    <button className="w-6 h-6 bg-[var(--accent-primary)] rounded-full flex items-center justify-center text-white text-sm">
                      +
                    </button>
                    <span className="text-[var(--text-primary)] font-medium">Mensaje</span>
                  </div>
                  
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded px-3 py-2 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] resize-none"
                    rows={4}
                    placeholder="Escribe tu mensaje aquí..."
                  />
                  
                  <button className="text-[var(--accent-primary)] hover:text-[var(--accent-hover)] text-sm font-medium mt-2 transition-colors">
                    + AGREGAR VARIACIONES DE MENSAJE
                  </button>
                </div>
              </div>

              {/* Columna derecha */}
              <div className="space-y-6">
                {/* Buscar contacto */}
                <div>
                  <label className="block text-[var(--text-muted)] text-sm mb-2">Buscar contacto</label>
                  <select className="w-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)]">
                    <option value="">Seleccionar contacto</option>
                    <option value="contacto1">Contacto 1</option>
                    <option value="contacto2">Contacto 2</option>
                  </select>
                </div>

                {/* Configuración de envío */}
                <div className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)] p-4">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-8 h-8 bg-[var(--bg-primary)] rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <span className="text-[var(--text-primary)] font-medium">Mensajes por ronda y sesión</span>
                  </div>
                  
                  <p className="text-[var(--text-muted)] text-sm mb-4">Mensajes enviados por sesión antes del standby</p>
                  
                  <input
                    type="number"
                    value={messagesPerRound}
                    onChange={(e) => setMessagesPerRound(parseInt(e.target.value) || 10)}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] mb-4"
                  />

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[var(--text-primary)] font-medium mb-1">Tiempo de espera (segundos)</div>
                      <div className="text-[var(--text-muted)] text-sm">Tiempo de espera tras enviar los mensajes</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enableWaitTime}
                        onChange={(e) => setEnableWaitTime(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent-primary)]"></div>
                    </label>
                  </div>
                  
                  {enableWaitTime && (
                    <input
                      type="number"
                      value={waitTime}
                      onChange={(e) => setWaitTime(parseInt(e.target.value) || 5)}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] mt-3"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Botón de envío */}
            <div className="mt-8">
              <button
                onClick={handleStartBulkSend}
                className="w-full bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white py-3 rounded-lg font-medium text-lg transition-colors"
              >
                INICIAR ENVÍO MASIVO
              </button>
            </div>
          </div>
        )}

        {/* Sección Lista de Envíos Masivos */}
        {activeTab === 'lista' && (
          <div>
            {/* Header de tabla */}
            <div className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)]">
              <div className="grid grid-cols-6 gap-4 p-4 border-b border-[var(--border-primary)] text-[var(--text-muted)] text-sm font-medium">
                <div>Progreso</div>
                <div>Total Mensajes</div>
                <div>Entregado</div>
                <div>Fallido</div>
                <div>Creador</div>
                <div>Estado</div>
              </div>

              {/* Contenido de tabla */}
              {bulkMessages.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="text-blue-400 text-center mb-4">Sin datos</div>
                  <div className="flex items-center justify-between text-[var(--text-muted)] text-sm">
                    <div className="flex items-center space-x-2">
                      <button className="bg-gray-600 text-white px-3 py-1 rounded text-sm cursor-not-allowed">
                        Anterior
                      </button>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span>Página 1 de</span>
                      <select className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded px-2 py-1">
                        <option>1</option>
                      </select>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button className="bg-gray-600 text-white px-3 py-1 rounded text-sm cursor-not-allowed">
                        Siguiente
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-[var(--border-primary)]">
                  {bulkMessages.map((bulk) => (
                    <div key={bulk.id} className="grid grid-cols-6 gap-4 p-4 hover:bg-[var(--bg-tertiary)] transition-colors">
                      <div className="text-[var(--text-primary)]">
                        <div className="w-full bg-[var(--bg-primary)] rounded-full h-2 mb-1">
                          <div 
                            className="bg-[var(--accent-primary)] h-2 rounded-full transition-all"
                            style={{ width: `${bulk.progreso}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-[var(--text-muted)]">{bulk.progreso}%</span>
                      </div>
                      <div className="text-[var(--text-primary)]">{bulk.totalMensajes}</div>
                      <div className="text-green-400">{bulk.entregado}</div>
                      <div className="text-red-400">{bulk.fallido}</div>
                      <div className="text-[var(--text-secondary)]">{bulk.creador}</div>
                      <div>
                        <span className={`px-2 py-1 rounded text-xs ${
                          bulk.estado === 'completado' ? 'bg-green-600 text-white' :
                          bulk.estado === 'enviando' ? 'bg-blue-600 text-white' :
                          bulk.estado === 'fallido' ? 'bg-red-600 text-white' :
                          'bg-gray-600 text-white'
                        }`}>
                          {bulk.estado}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
