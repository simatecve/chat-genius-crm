'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Tag, Zap, User, Edit2, Trash2, Calendar, AlertTriangle } from 'lucide-react';
import { isUserAuthenticated, getUserRole, getCurrentUserId } from '@/utils/auth';
import { tareasServices } from '@/services/tareasServices';
import { userServices } from '@/services/userServices';
import { UsuarioResponse } from '@/app/api/usuarios/domain/usuario';

// Tipos para las tareas (basado en la API de Supabase)
interface Task {
  id: number;
  created_at?: string;
  titulo: string;
  descripion?: string; // Nota: en la API viene como "descripion" (sin c)
  fecha: string;
  hora?: string; // Hora de la tarea
  asignada?: number; // ID del usuario asignado (en la API viene como "asignada")
  creado_por?: number;
  categoria: string;
  prioridad: string;
  // Campos locales adicionales para UI
  completada?: boolean;
  color?: string;
  asignado_nombre?: string;
}

interface Usuario {
  id: number;
  nombre: string;
  rol: string;
}

const categorias = [
  { id: 'Trabajo', label: 'Trabajo', color: '#4ecdc4' },
  { id: 'Personal', label: 'Personal', color: '#45b7d1' },
  { id: 'Reunion', label: 'Reunión', color: '#ff6b6b' },
  { id: 'Llamada', label: 'Llamada', color: '#96ceb4' },
  { id: 'Otro', label: 'Otro', color: '#a8e6cf' }
];

const prioridades = [
  { id: 'Alta', label: 'Alta', color: '#ff6b6b' },
  { id: 'Media', label: 'Media', color: '#feca57' },
  { id: 'Baja', label: 'Baja', color: '#96ceb4' }
];

export default function CalendarioPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const router = useRouter();

  // Form state para nueva tarea
  const [formData, setFormData] = useState({
    titulo: '',
    descripion: '', // Cambiar a "descripion" para coincidir con la API
    fecha: '',
    categoria: 'Trabajo',
    prioridad: 'Media',
    asignada: 0
  });

  useEffect(() => {
    if (!isUserAuthenticated()) {
      router.push('/login');
      return;
    }
    loadUsuarios();
    loadTareas();
  }, [router]);

  // Cargar usuarios para el select
  const loadUsuarios = async () => {
    try {
      const result = await userServices.getAllUsuarios();
      if (result.success && result.data) {
        setUsuarios(result.data);
      } else {
        console.error('Error al cargar usuarios:', result.error);
      }
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
    }
  };

  // Cargar tareas desde la API
  const loadTareas = async () => {
    setLoading(true);
    try {
      const result = await tareasServices.getAllTareas();
      if (result.success && result.data) {
        // Obtener el rol del usuario actual
        const currentUserRole = getUserRole();
        const currentUserId = getCurrentUserId();
        
        // Enriquecer tareas con información de usuarios y colores
        let enrichedTasks = result.data.map((task: Task) => {
          const categoria = categorias.find(c => c.id === task.categoria);
          const usuario = usuarios.find(u => u.id === task.asignada);
          
          return {
            ...task,
            hora: task.hora || '09:00', // Hora por defecto si no se especifica
            color: categoria?.color || '#4ecdc4',
            completada: false, // Por defecto, las tareas no están completadas
            asignado_nombre: usuario?.nombre || undefined
          };
        });

        // Filtrar tareas según el rol del usuario
        if (currentUserRole === 'Comercial') {
          // Los usuarios Comercial solo ven tareas asignadas a ellos
          enrichedTasks = enrichedTasks.filter(task => task.asignada === currentUserId);
        }
        // Los usuarios Admin ven todas las tareas (sin filtro)

        setTasks(enrichedTasks);
      } else {
        console.error('Error al cargar tareas:', result.error);
      }
    } catch (error) {
      console.error('Error al cargar tareas:', error);
    } finally {
      setLoading(false);
    }
  };

  // Obtener días del mes actual
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days = [];
    for (let i = 0; i < 42; i++) {
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + i);
      days.push(day);
    }
    return days;
  };

  // Obtener días de la semana actual
  const getDaysInWeek = (date: Date) => {
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Ajustar para que lunes sea el primer día
    startOfWeek.setDate(diff);
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    
    return days;
  };

  // Obtener día actual
  const getCurrentDay = (date: Date) => {
    return [new Date(date)];
  };

  // Obtener tareas para una fecha específica
  const getTasksForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return tasks.filter(task => task.fecha === dateStr);
  };

  // Manejar navegación según la vista actual
  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    
    if (viewMode === 'month') {
      newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1));
    } else if (viewMode === 'week') {
      newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
    } else if (viewMode === 'day') {
      newDate.setDate(currentDate.getDate() + (direction === 'next' ? 1 : -1));
    }
    
    setCurrentDate(newDate);
  };

  // Seleccionar día para mostrar tareas
  const selectDay = (date: string) => {
    setSelectedDate(date);
    // Filtrar tareas para el día seleccionado
    const dayTasks = tasks.filter(task => task.fecha === date);
    // Las tareas ya se filtran automáticamente en el render
  };

  // Abrir modal para nueva tarea
  const openNewTaskModal = (date?: string) => {
    setEditingTask(null);
    setFormData({
      titulo: '',
      descripion: '',
      fecha: date || selectedDate || '',
      categoria: 'Trabajo',
      prioridad: 'Media',
      asignada: 0
    });
    setShowTaskModal(true);
  };

  // Abrir modal para editar tarea
  const openEditTaskModal = (task: Task) => {
    setEditingTask(task);
    setFormData({
      titulo: task.titulo,
      descripion: task.descripion || '',
      fecha: task.fecha,
      categoria: task.categoria,
      prioridad: task.prioridad,
      asignada: task.asignada || 0
    });
    setShowTaskModal(true);
  };

  // Guardar tarea
  const handleSaveTask = async () => {
    if (!formData.titulo || !formData.fecha) {
      alert('Por favor completa todos los campos requeridos');
      return;
    }

    setLoading(true);
    
    try {
      const currentUserId = getCurrentUserId();
      
      const tareaData = {
        titulo: formData.titulo,
        descripion: formData.descripion,
        fecha: formData.fecha,
        categoria: formData.categoria,
        prioridad: formData.prioridad,
        asignada: formData.asignada || null,
        creado_por: currentUserId
      };

      if (editingTask) {
        // Actualizar tarea existente
        const result = await tareasServices.updateTarea(editingTask.id, tareaData);
        if (result.success) {
          // Recargar tareas para obtener datos actualizados
          await loadTareas();
          setShowTaskModal(false);
        } else {
          alert('Error al actualizar la tarea: ' + result.error);
        }
      } else {
        // Crear nueva tarea
        const result = await tareasServices.createTarea(tareaData);
        if (result.success) {
          // Recargar tareas para obtener datos actualizados
          await loadTareas();
          setShowTaskModal(false);
        } else {
          alert('Error al crear la tarea: ' + result.error);
        }
      }
    } catch (error) {
      console.error('Error al guardar tarea:', error);
      alert('Error inesperado al guardar la tarea');
    } finally {
      setLoading(false);
    }
  };

  // Abrir modal de confirmación para eliminar tarea
  const openDeleteModal = (task: Task) => {
    setTaskToDelete(task);
    setShowDeleteModal(true);
  };

  // Eliminar tarea confirmada
  const confirmDeleteTask = async () => {
    if (!taskToDelete) return;

    setLoading(true);
    try {
      const result = await tareasServices.deleteTarea(taskToDelete.id);
      if (result.success) {
        // Recargar tareas para obtener datos actualizados
        await loadTareas();
        setShowDeleteModal(false);
        setTaskToDelete(null);
      } else {
        alert('Error al eliminar la tarea: ' + result.error);
      }
    } catch (error) {
      console.error('Error al eliminar tarea:', error);
      alert('Error inesperado al eliminar la tarea');
    } finally {
      setLoading(false);
    }
  };

  // Marcar tarea como completada
  const toggleTaskComplete = (taskId: number) => {
    setTasks(tasks.map(t => 
      t.id === taskId ? { ...t, completada: !t.completada } : t
    ));
  };

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  const days = getDaysInMonth(currentDate);
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  return (
    <div className="flex-1 flex flex-col">
      {/* Header del Calendario */}
      <div className="bg-[var(--bg-primary)] border-b border-[var(--border-primary)] px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left Section */}
          <div className="flex items-center space-x-4">
            <h1 className="text-[var(--text-primary)] font-semibold text-2xl">Calendario</h1>
          </div>

          {/* Right Section */}
          <div className="flex items-center space-x-4">
            {/* Botones de vista */}
            <div className="flex items-center bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)]">
              {(['month', 'week', 'day'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
                    viewMode === mode
                      ? 'bg-[var(--accent-primary)] text-white'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {mode === 'month' ? 'Mes' : mode === 'week' ? 'Semana' : 'Día'}
                </button>
              ))}
            </div>

            {getUserRole() !== 'Comercial' && (
              <button 
                onClick={() => openNewTaskModal(selectedDate)}
                className="flex items-center space-x-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white px-4 py-2 rounded text-sm font-medium transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>Nueva Tarea</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Navegación del calendario */}
      <div className="bg-[var(--bg-primary)] border-b border-[var(--border-primary)] px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigateDate('prev')}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-2 rounded cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <h2 className="text-[var(--text-primary)] font-semibold text-xl">
              {viewMode === 'month' 
                ? `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`
                : viewMode === 'week'
                ? (() => {
                    const startOfWeek = new Date(currentDate);
                    const day = startOfWeek.getDay();
                    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
                    startOfWeek.setDate(diff);
                    
                    const endOfWeek = new Date(startOfWeek);
                    endOfWeek.setDate(startOfWeek.getDate() + 6);
                    
                    if (startOfWeek.getMonth() === endOfWeek.getMonth()) {
                      return `${startOfWeek.getDate()} - ${endOfWeek.getDate()} de ${monthNames[startOfWeek.getMonth()]} ${startOfWeek.getFullYear()}`;
                    } else {
                      return `${startOfWeek.getDate()} ${monthNames[startOfWeek.getMonth()]} - ${endOfWeek.getDate()} ${monthNames[endOfWeek.getMonth()]} ${endOfWeek.getFullYear()}`;
                    }
                  })()
                : currentDate.toLocaleDateString('es-ES', { 
                    weekday: 'long',
                    year: 'numeric', 
                    month: 'long',
                    day: 'numeric'
                  })
              }
            </h2>
            
            <button
              onClick={() => navigateDate('next')}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-2 rounded cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <button
            onClick={() => setCurrentDate(new Date())}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm px-3 py-1 rounded border border-[var(--border-primary)] hover:border-[var(--text-muted)] cursor-pointer"
          >
            Hoy
          </button>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="flex-1 bg-[var(--bg-primary)] p-6">
        {/* Vista de mes */}
        {viewMode === 'month' && (
          <div className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)]">
            {/* Header de días */}
            <div className="grid grid-cols-7 border-b border-[var(--border-primary)]">
              {dayNames.map((day) => (
                <div key={day} className="p-4 text-center text-[var(--text-muted)] font-medium text-sm">
                  {day}
                </div>
              ))}
            </div>

            {/* Grid de días */}
            <div className="grid grid-cols-7">
              {days.map((day, index) => {
                const dayStr = day.toISOString().split('T')[0];
                const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                const isToday = dayStr === todayStr;
                const dayTasks = getTasksForDate(day);

                return (
                  <div
                    key={index}
                    className={`min-h-[120px] border-r border-b border-[var(--border-primary)] p-2 ${
                      !isCurrentMonth ? 'bg-[var(--bg-primary)] opacity-50' : 'hover:bg-[var(--bg-tertiary)]'
                    } ${
                      selectedDate === dayStr ? 'bg-[var(--accent-primary)] bg-opacity-20 border-[var(--accent-primary)]' : ''
                    } transition-colors cursor-pointer`}
                    onClick={() => selectDay(dayStr)}
                  >
                    <div className={`text-sm font-medium mb-2 ${
                      isToday 
                        ? 'bg-[var(--accent-primary)] text-white w-6 h-6 rounded-full flex items-center justify-center' 
                        : isCurrentMonth 
                          ? 'text-[var(--text-primary)]' 
                          : 'text-[var(--text-muted)]'
                    }`}>
                      {day.getDate()}
                    </div>
                    
                    {/* Tareas del día */}
                    <div className="space-y-1">
                      {dayTasks.slice(0, 3).map((task) => (
                        <div
                          key={task.id}
                          className={`text-xs p-1 rounded truncate cursor-pointer transition-opacity ${
                            task.completada ? 'opacity-50 line-through' : ''
                          }`}
                          style={{ 
                            backgroundColor: task.color + '20', 
                            color: selectedDate === dayStr ? 'black' : task.color 
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditTaskModal(task);
                          }}
                          title={`${task.hora} - ${task.titulo}`}
                        >
                          {task.hora} {task.titulo}
                        </div>
                      ))}
                      {dayTasks.length > 3 && (
                        <div className="text-xs text-[var(--text-muted)] text-center">
                          +{dayTasks.length - 3} más
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Vista de semana */}
        {viewMode === 'week' && (
          <div className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)]">
            {/* Header de días */}
            <div className="grid grid-cols-7 border-b border-[var(--border-primary)]">
              {dayNames.map((day) => (
                <div key={day} className="p-4 text-center text-[var(--text-muted)] font-medium text-sm">
                  {day}
                </div>
              ))}
            </div>

            {/* Grid de días de la semana */}
            <div className="grid grid-cols-7">
              {getDaysInWeek(currentDate).map((day, index) => {
                const dayStr = day.toISOString().split('T')[0];
                const isToday = dayStr === todayStr;
                const dayTasks = getTasksForDate(day);

                return (
                  <div
                    key={index}
                    className={`min-h-[200px] border-r border-b border-[var(--border-primary)] p-3 hover:bg-[var(--bg-tertiary)] ${
                      selectedDate === dayStr ? 'bg-[var(--accent-primary)] bg-opacity-20 border-[var(--accent-primary)]' : ''
                    } transition-colors cursor-pointer`}
                    onClick={() => selectDay(dayStr)}
                  >
                    <div className={`text-sm font-medium mb-3 ${
                      isToday 
                        ? 'bg-[var(--accent-primary)] text-white w-8 h-8 rounded-full flex items-center justify-center' 
                        : 'text-[var(--text-primary)]'
                    }`}>
                      {day.getDate()}
                    </div>
                    
                    {/* Tareas del día */}
                    <div className="space-y-2">
                      {dayTasks.map((task) => (
                        <div
                          key={task.id}
                          className={`text-xs p-2 rounded cursor-pointer transition-opacity ${
                            task.completada ? 'opacity-50 line-through' : ''
                          }`}
                          style={{ 
                            backgroundColor: task.color + '20', 
                            color: selectedDate === dayStr ? 'black' : task.color 
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditTaskModal(task);
                          }}
                          title={`${task.titulo}`}
                        >
                          {task.titulo}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Vista de día */}
        {viewMode === 'day' && (
          <div className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)] p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${
                  new Date().toISOString().split('T')[0] === currentDate.toISOString().split('T')[0] 
                    ? 'bg-[var(--accent-primary)]' 
                    : 'bg-[var(--bg-primary)] text-[var(--text-primary)]'
                }`}>
                  {currentDate.getDate()}
                </div>
                <div>
                  <h3 className="text-[var(--text-primary)] font-semibold text-lg">
                    {currentDate.toLocaleDateString('es-ES', { weekday: 'long' })}
                  </h3>
                  <p className="text-[var(--text-muted)] text-sm">
                    {currentDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>
            </div>

            {/* Tareas del día */}
            <div className="space-y-3">
              {getTasksForDate(currentDate).map((task) => (
                <div
                  key={task.id}
                  className={`flex items-center justify-between p-4 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-primary)] ${
                    task.completada ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: task.color }}
                    />
                    <div>
                      <h4 className={`text-[var(--text-primary)] font-medium ${task.completada ? 'line-through' : ''}`}>
                        {task.titulo}
                      </h4>
                      <p className="text-[var(--text-muted)] text-sm">
                        {task.descripion || 'Sin descripción'}
                      </p>
                      <div className="flex items-center space-x-4 mt-1 text-xs text-[var(--text-muted)]">
                        <span><Tag className="w-3 h-3 inline mr-1" /> {task.categoria}</span>
                        <span><Zap className="w-3 h-3 inline mr-1" /> {task.prioridad}</span>
                        {task.asignado_nombre && <span><User className="w-3 h-3 inline mr-1" /> {task.asignado_nombre}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => openEditTaskModal(task)}
                      className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm cursor-pointer"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {getUserRole() !== 'Comercial' && (
                      <button
                        onClick={() => openDeleteModal(task)}
                        className="text-[var(--text-muted)] hover:text-red-400 text-sm cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              
              {getTasksForDate(currentDate).length === 0 && (
                <div className="text-center py-8 text-[var(--text-muted)]">
                  <div className="text-4xl mb-2"><Calendar className="w-4 h-4" /></div>
                  <p>
                    {getUserRole() === 'Comercial' 
                      ? 'No tienes tareas asignadas para este día'
                      : 'No hay tareas para este día'
                    }
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Lista de tareas para el día seleccionado */}
        <div className="mt-6">
          <div className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)] p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[var(--text-primary)] font-semibold">
                {selectedDate ? `Tareas del ${new Date(selectedDate).toLocaleDateString('es-ES', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}` : 'Selecciona un día para ver las tareas'}
              </h3>
              
              {/* Indicador de filtrado por rol */}
              {localStorage.getItem('userRole') === 'Comercial' && (
                <div className="flex items-center space-x-2 text-xs text-[var(--text-muted)] bg-[var(--bg-primary)] px-3 py-1 rounded-full border border-[var(--border-primary)]">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
                  </svg>
                  <span>Solo mis tareas</span>
                </div>
              )}
            </div>
            <div className="space-y-3">
              {selectedDate && getTasksForDate(new Date(selectedDate)).length > 0 ? (
                getTasksForDate(new Date(selectedDate)).map((task) => (
                  <div
                    key={task.id}
                    className={`flex items-center justify-between p-3 bg-[var(--bg-primary)] rounded border border-[var(--border-primary)] ${
                      task.completada ? 'opacity-50' : ''
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={task.completada}
                        onChange={() => toggleTaskComplete(task.id)}
                        className="w-4 h-4 text-[var(--accent-primary)] bg-[var(--bg-primary)] border-[var(--border-primary)] rounded focus:ring-[var(--accent-primary)] focus:ring-2"
                      />
                      <div>
                        <div className={`text-[var(--text-primary)] font-medium ${task.completada ? 'line-through' : ''}`}>
                          {task.titulo}
                        </div>
                        <div className="text-[var(--text-muted)] text-sm">
                          {task.hora} • {categorias.find(c => c.id === task.categoria)?.label}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: task.color }}
                      />
                      <button
                        onClick={() => openEditTaskModal(task)}
                        className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm cursor-pointer"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {getUserRole() !== 'Comercial' && (
                        <button
                          onClick={() => openDeleteModal(task)}
                          className="text-[var(--text-muted)] hover:text-red-400 text-sm cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : selectedDate ? (
                <div className="text-[var(--text-muted)] text-center py-4">
                  {localStorage.getItem('userRole') === 'Comercial' 
                    ? 'No tienes tareas asignadas para este día'
                    : 'No hay tareas programadas para este día'
                  }
                </div>
              ) : (
                <div className="text-[var(--text-muted)] text-center py-4">
                  Haz clic en un día del calendario para ver sus tareas
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal Nueva/Editar Tarea */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)] w-full max-w-md mx-4">
            {/* Header del modal */}
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-primary)]">
              <div>
                <h3 className="text-[var(--text-primary)] font-semibold">
                  {editingTask ? 'Editar Tarea' : 'Nueva Tarea'}
                </h3>
                {localStorage.getItem('userRole') === 'Comercial' && (
                  <p className="text-sm text-[var(--text-muted)] mt-1">
                    Puedes editar el título, descripción, fecha, categoría y prioridad
                  </p>
                )}
              </div>
              <button 
                onClick={() => setShowTaskModal(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Contenido del modal */}
            <div className="p-4 space-y-4">
              {/* Título */}
              <div>
                <label className="block text-[var(--text-muted)] text-sm mb-2">Título *</label>
                <input
                  type="text"
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded px-3 py-2 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)]"
                  placeholder="Título de la tarea"
                />
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-[var(--text-muted)] text-sm mb-2">Descripción</label>
                <textarea
                  value={formData.descripion}
                  onChange={(e) => setFormData({ ...formData, descripion: e.target.value })}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded px-3 py-2 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] resize-none"
                  rows={3}
                  placeholder="Descripción de la tarea"
                />
              </div>

              {/* Fecha */}
              <div>
                <label className="block text-[var(--text-muted)] text-sm mb-2">Fecha *</label>
                <input
                  type="date"
                  value={formData.fecha}
                  onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)]"
                />
              </div>

              {/* Asignar a Usuario */}
              <div>
                <label className="block text-[var(--text-muted)] text-sm mb-2">Asignar a</label>
                {localStorage.getItem('userRole') === 'Comercial' ? (
                  <div className="w-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded px-3 py-2 text-[var(--text-muted)] cursor-not-allowed">
                    {usuarios.find(u => u.id === formData.asignada)?.nombre || 'Sin asignar'} (Solo lectura)
                  </div>
                ) : (
                  <select
                    value={formData.asignada}
                    onChange={(e) => setFormData({ ...formData, asignada: parseInt(e.target.value) })}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)]"
                  >
                    <option value={0}>Sin asignar</option>
                    {usuarios
                      .filter(usuario => usuario.rol !== 'Cliente')
                      .map((usuario) => (
                        <option key={usuario.id} value={usuario.id}>
                          {usuario.nombre} ({usuario.rol})
                        </option>
                      ))}
                  </select>
                )}
              </div>

              {/* Categoría y Prioridad */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[var(--text-muted)] text-sm mb-2">Categoría</label>
                  <select
                    value={formData.categoria}
                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)]"
                  >
                    {categorias.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[var(--text-muted)] text-sm mb-2">Prioridad</label>
                  <select
                    value={formData.prioridad}
                    onChange={(e) => setFormData({ ...formData, prioridad: e.target.value })}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)]"
                  >
                    {prioridades.map((pri) => (
                      <option key={pri.id} value={pri.id}>
                        {pri.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Footer del modal */}
            <div className="flex items-center justify-end space-x-3 p-4 border-t border-[var(--border-primary)]">
              <button
                onClick={() => setShowTaskModal(false)}
                className="px-4 py-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveTask}
                className="px-4 py-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white rounded transition-colors cursor-pointer"
              >
                {editingTask ? 'Actualizar' : 'Crear'} Tarea
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación para eliminar tarea */}
      {showDeleteModal && taskToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Eliminar Tarea</h3>
              <button 
                onClick={() => setShowDeleteModal(false)} 
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="mb-6">
              <p className="text-[var(--text-secondary)] mb-4">
                ¿Estás seguro de que quieres eliminar esta tarea?
              </p>
              
              <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: taskToDelete.color }}
                  />
                  <div className="flex-1">
                    <h4 className="text-[var(--text-primary)] font-medium">
                      {taskToDelete.titulo}
                    </h4>
                    <p className="text-[var(--text-muted)] text-sm">
                      {taskToDelete.descripion || 'Sin descripción'}
                    </p>
                    <div className="flex items-center space-x-4 mt-2 text-xs text-[var(--text-muted)]">
                      <span><Calendar className="w-4 h-4" /> {new Date(taskToDelete.fecha).toLocaleDateString('es-ES')}</span>
                      <span>🏷️ {taskToDelete.categoria}</span>
                      <span><Zap className="w-4 h-4" /> {taskToDelete.prioridad}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <p className="text-red-400 text-sm mt-3">
                ⚠️ Esta acción no se puede deshacer.
              </p>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 border border-[var(--border-primary)] text-[var(--text-primary)] rounded-md hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeleteTask}
                disabled={loading}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-md transition-colors flex items-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Eliminando...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Eliminar Tarea
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
