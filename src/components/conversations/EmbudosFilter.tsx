import React from 'react';
import { EmbudoResponse } from '@/services/embudoServices';

interface EmbudosFilterProps {
    embudos: EmbudoResponse[];
    selectedEmbudo: EmbudoResponse | null;
    onEmbudoSelect: (embudo: EmbudoResponse | null) => void;
}

export default function EmbudosFilter({
    embudos,
    selectedEmbudo,
    onEmbudoSelect
}: EmbudosFilterProps) {

    return (
        <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className="px-4 py-3">
                <div
                    className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-hide"
                    style={{
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none',
                    }}
                >
                    {/* Opción "Todos" */}
                    <button
                        onClick={() => onEmbudoSelect(null)}
                        className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap shadow-sm ${selectedEmbudo === null
                                ? 'bg-blue-600 text-white shadow-md scale-105'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-blue-100 dark:hover:bg-blue-900 border border-gray-200 dark:border-gray-600 hover:scale-105'
                            }`}
                    >
                        <span className="flex items-center space-x-2">
                            <span>Todos</span>
                        </span>
                    </button>

                    {/* Lista de embudos */}
                    {embudos.map((embudo) => {
                        const isSelected = selectedEmbudo?.id === embudo.id;

                        return (
                            <button
                                key={embudo.id}
                                onClick={() => onEmbudoSelect(embudo)}
                                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap shadow-sm ${isSelected
                                        ? 'bg-blue-600 text-white shadow-md scale-105'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-blue-100 dark:hover:bg-blue-900 border border-gray-200 dark:border-gray-600 hover:scale-105'
                                    }`}
                                title={embudo.descripcion || embudo.nombre}
                            >
                                <span className="flex items-center space-x-2">
                                    <span>{embudo.nombre}</span>
                                </span>
                            </button>
                        );
                    })}

                    {/* Mensaje cuando no hay embudos */}
                    {embudos.length === 0 && (
                        <div className="text-gray-500 text-sm py-2">
                            No hay embudos configurados
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
