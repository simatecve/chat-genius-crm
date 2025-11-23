'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isUserAuthenticated } from '@/utils/auth';

// Tipos para los emails
interface Email {
  id: number;
  de: string;
  para: string;
  asunto: string;
  contenido: string;
  fecha: string;
  leido: boolean;
  destacado: boolean;
  etiqueta?: string;
  adjuntos?: number;
}

// Datos de ejemplo - en producción vendrían de la API
const emailsData: Email[] = [];

export default function EmailsPage() {
  const [emails, setEmails] = useState<Email[]>(emailsData);
  const [selectedEmails, setSelectedEmails] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFolder, setActiveFolder] = useState('entrada');
  const [showNewEmailModal, setShowNewEmailModal] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!isUserAuthenticated()) {
      router.push('/login');
      return;
    }
  }, [router]);

  const handleSelectAll = () => {
    if (selectedEmails.length === emails.length) {
      setSelectedEmails([]);
    } else {
      setSelectedEmails(emails.map(email => email.id));
    }
  };

  const handleSelectEmail = (emailId: number) => {
    if (selectedEmails.includes(emailId)) {
      setSelectedEmails(selectedEmails.filter(id => id !== emailId));
    } else {
      setSelectedEmails([...selectedEmails, emailId]);
    }
  };

  const filteredEmails = emails.filter(email =>
    email.asunto.toLowerCase().includes(searchQuery.toLowerCase()) ||
    email.de.toLowerCase().includes(searchQuery.toLowerCase()) ||
    email.para.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      {/* Header de Emails */}
      <div className="bg-[var(--bg-primary)] border-b border-[var(--border-primary)] px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left Section */}
          <div className="flex items-center space-x-4">
            <button className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-2 rounded">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-[var(--text-primary)] font-semibold text-2xl">Emails</h1>
          </div>

          {/* Right Section */}
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => setShowNewEmailModal(true)}
              className="flex items-center space-x-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white px-4 py-2 rounded text-sm font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>Nuevo Email</span>
            </button>

            {/* Notification Bell */}
            <button className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-2 rounded relative">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7H6a2 2 0 00-2 2v9a2 2 0 002 2h8a2 2 0 002-2V9a2 2 0 00-2-2h-3" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Sidebar de carpetas */}
        <div className="w-64 bg-[var(--bg-primary)] border-r border-[var(--border-primary)] p-4">
          {/* Dropdown de cuenta */}
          <div className="mb-6">
            <button className="w-full flex items-center justify-between bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded px-3 py-2 text-[var(--text-primary)] text-sm">
              <span>Selecciona una cuenta</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {/* Filtros de carpeta */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setActiveFolder('entrada')}
                className={`flex items-center space-x-2 px-3 py-2 rounded w-full text-left ${
                  activeFolder === 'entrada' 
                    ? 'bg-[var(--accent-primary)] text-white' 
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
                }`}
              >
                <span className="w-2 h-2 bg-[var(--accent-primary)] rounded-full"></span>
                <span>Bandeja de entrada</span>
              </button>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setActiveFolder('destacados')}
                className={`flex items-center space-x-2 px-3 py-2 rounded w-full text-left ${
                  activeFolder === 'destacados' 
                    ? 'bg-[var(--accent-primary)] text-white' 
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
                }`}
              >
                <span>⭐</span>
                <span>Destacados</span>
              </button>
            </div>
          </div>
        </div>

        {/* Contenido principal */}
        <div className="flex-1 bg-[var(--bg-primary)]">
          {/* Toolbar */}
          <div className="border-b border-[var(--border-primary)] px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {/* Dropdown con contador */}
                <div className="flex items-center space-x-2">
                  <button className="flex items-center space-x-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <span className="flex items-center space-x-1 bg-[var(--bg-secondary)] text-[var(--text-primary)] px-2 py-1 rounded text-sm">
                    <span>📧</span>
                    <span>0</span>
                  </span>
                </div>

                {/* Botones de acción */}
                <div className="flex items-center space-x-2">
                  <button className="flex items-center space-x-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] px-3 py-1 rounded text-sm">
                    <span className="w-2 h-2 bg-[var(--accent-primary)] rounded-full"></span>
                    <span>Bandeja de entrada</span>
                  </button>
                  
                  <button className="flex items-center space-x-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] px-3 py-1 rounded text-sm">
                    <span>⭐</span>
                    <span>Destacados</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Lista de emails */}
          <div className="flex-1">
            {filteredEmails.length === 0 ? (
              /* Estado vacío */
              <div className="flex flex-col items-center justify-center h-96 text-center">
                <div className="text-[var(--text-muted)] text-lg mb-2">No se encontraron emails</div>
                <div className="text-[var(--text-muted)] text-sm">
                  {searchQuery ? 'Intenta con otros términos de búsqueda' : 'Tu bandeja de entrada está vacía'}
                </div>
              </div>
            ) : (
              /* Lista de emails */
              <div className="divide-y divide-[var(--border-primary)]">
                {filteredEmails.map((email) => (
                  <div
                    key={email.id}
                    className={`flex items-center px-4 py-3 hover:bg-[var(--bg-secondary)] cursor-pointer transition-colors ${
                      !email.leido ? 'bg-[var(--bg-tertiary)]' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedEmails.includes(email.id)}
                      onChange={() => handleSelectEmail(email.id)}
                      className="w-4 h-4 text-[var(--accent-primary)] bg-[var(--bg-primary)] border-[var(--border-primary)] rounded focus:ring-[var(--accent-primary)] focus:ring-2 mr-3"
                    />
                    
                    <button className="text-[var(--text-muted)] hover:text-yellow-400 mr-3">
                      {email.destacado ? '⭐' : '☆'}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 min-w-0 flex-1">
                          <span className={`text-sm truncate ${!email.leido ? 'text-[var(--text-primary)] font-semibold' : 'text-[var(--text-secondary)]'}`}>
                            {email.de}
                          </span>
                          <span className={`text-sm truncate ${!email.leido ? 'text-[var(--text-primary)] font-medium' : 'text-[var(--text-muted)]'}`}>
                            {email.asunto}
                          </span>
                          {email.adjuntos && (
                            <span className="text-[var(--text-muted)]">
                              📎
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-[var(--text-muted)] ml-4">
                          {formatDate(email.fecha)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Nuevo Email */}
      {showNewEmailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)] w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden">
            {/* Header del modal */}
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-primary)]">
              <div className="flex items-center space-x-2">
                <span className="text-[var(--text-primary)] font-medium">📧</span>
                <span className="text-[var(--text-primary)] font-medium">Nuevo Email</span>
              </div>
              <div className="flex items-center space-x-2">
                <button className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  </svg>
                </button>
                <button className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                </button>
                <button 
                  onClick={() => setShowNewEmailModal(false)}
                  className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Contenido del modal */}
            <div className="p-4 space-y-4">
              {/* Campo De */}
              <div className="flex items-center space-x-3">
                <label className="text-[var(--text-muted)] text-sm w-12">De</label>
                <select className="flex-1 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded px-3 py-2 text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)]">
                  <option>Selecciona una cuenta</option>
                </select>
              </div>

              {/* Campo Para */}
              <div className="flex items-center space-x-3">
                <label className="text-[var(--text-muted)] text-sm w-12">Para</label>
                <input
                  type="email"
                  placeholder="Escribir..."
                  className="flex-1 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded px-3 py-2 text-[var(--text-primary)] placeholder-[var(--text-muted)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)]"
                />
                <div className="flex items-center space-x-2">
                  <button className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm">CC</button>
                  <button className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm">CCO</button>
                </div>
              </div>

              {/* Campo Asunto */}
              <div className="flex items-center space-x-3">
                <label className="text-[var(--text-muted)] text-sm w-12">Asunto</label>
                <input
                  type="text"
                  placeholder="Introduce el asunto aquí..."
                  className="flex-1 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded px-3 py-2 text-[var(--text-primary)] placeholder-[var(--text-muted)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)]"
                />
              </div>

              {/* Editor de contenido */}
              <div className="border border-[var(--border-primary)] rounded">
                <div className="border-b border-[var(--border-primary)] p-2 flex items-center space-x-2">
                  {/* Toolbar del editor */}
                  <button className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                  <button className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1">A</button>
                  <button className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1">🔗</button>
                  <button className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1">😊</button>
                  <button className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1">📎</button>
                </div>
                <textarea
                  className="w-full h-64 bg-[var(--bg-primary)] text-[var(--text-primary)] p-4 resize-none focus:outline-none placeholder-[var(--text-muted)]"
                  placeholder="Escribe tu mensaje aquí..."
                />
              </div>

              {/* Botones de acción */}
              <div className="flex items-center justify-between pt-4">
                <div className="flex items-center space-x-4">
                  <button className="flex items-center space-x-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white px-6 py-2 rounded text-sm font-medium transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    <span>Enviar</span>
                  </button>
                  <button className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm">
                    A
                  </button>
                  <button className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm">
                    🔗
                  </button>
                  <button className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm">
                    😊
                  </button>
                  <button className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm">
                    📎
                  </button>
                </div>
                <button className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm">
                  Más opciones
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
