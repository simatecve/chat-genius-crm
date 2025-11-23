'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import { performLogout, isUserAuthenticated, getUserData, getOrganizationData } from '@/utils/auth';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const router = useRouter();

  useEffect(() => {
    // Verificar autenticación usando la utilidad centralizada
    if (!isUserAuthenticated()) {
      router.push('/login');
      return;
    }
    
    // Cargar datos de usuario desde la nueva estructura
    const userData = getUserData();
    const organizationData = getOrganizationData();
    
    if (!userData) {
      router.push('/login');
      return;
    }
    
    // Si es un usuario Cliente, redirigir a su página específica
    if (userData.rol === 'Cliente') {
      router.push('/cliente');
      return;
    }
    
    setUserEmail(userData.correo_electronico || '');
    setUserName(userData.nombre || '');
    setUserRole(userData.rol || '');
    setOrganizationName(organizationData?.nombre || '');
  }, [router]);

  const handleLogout = () => {
    // Usar la función centralizada y segura de logout
    performLogout();
  };

  if (!userEmail) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="text-[var(--text-primary)]">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[var(--bg-primary)] flex overflow-hidden">
      {/* Sidebar */}
      <Sidebar 
        isOpen={isSidebarOpen} 
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)} 
      />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-[var(--bg-primary)] min-w-0">
        {/* Header */}
        <Header 
          userEmail={userEmail}
          userName={userName}
          userRole={userRole}
          agencyName={organizationName}
          onLogout={handleLogout}
          onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        />
        
        {/* Page Content */}
        <main className="flex-1 min-h-0 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
