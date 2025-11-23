import React, { useState, useEffect } from 'react';
import { Tag, Search, Edit2, Trash2, Plus, X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { tagsServices, EtiquetaResponse, EtiquetaData } from '@/services/tagsServices';

export default function TagsTab() {
    const [etiquetas, setEtiquetas] = useState<EtiquetaResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [editingEtiqueta, setEditingEtiqueta] = useState<EtiquetaResponse | null>(null);
    const [etiquetaToDelete, setEtiquetaToDelete] = useState<EtiquetaResponse | null>(null);
    const [formData, setFormData] = useState<EtiquetaData>({
        nombre: '',
        color: '#F29A1F',
        descripcion: ''
    });
    const [searchTerm, setSearchTerm] = useState('');
    const { toast } = useToast();

    // Colores predefinidos para las etiquetas
    const coloresPredefinidos = [
        '#F29A1F', '#00cec9', '#0984e3', '#6c5ce7', '#fd79a8',
        '#fdcb6e', '#e17055', '#d63031', '#2d3436', '#636e72'
    ];

    const loadEtiquetas = async () => {
        setLoading(true);
        try {
            const response = await tagsServices.getAllEtiquetas();
            if (response.success && response.data) {
                setEtiquetas(response.data);
            } else {
                toast({
                    title: "Error",
                    description: "No se pudieron cargar las etiquetas",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error('Error al cargar etiquetas:', error);
            toast({
                title: "Error",
                description: "Error inesperado al cargar etiquetas",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadEtiquetas();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.nombre.trim()) {
            toast({
                title: "Error",
                description: "El nombre de la etiqueta es obligatorio",
                variant: "destructive",
            });
            return;
        }

        try {
            if (editingEtiqueta) {
                const response = await tagsServices.updateEtiqueta(editingEtiqueta.id, formData);
                if (response.success) {
                    toast({
                        title: "Éxito",
                        description: "Etiqueta actualizada correctamente",
                    });
                    cerrarModal();
                    loadEtiquetas();
                } else {
                    throw new Error(response.error);
                }
            } else {
                const response = await tagsServices.createEtiqueta(formData);
                if (response.success) {
                    toast({
                        title: "Éxito",
                        description: "Etiqueta creada correctamente",
                    });
                    cerrarModal();
                    loadEtiquetas();
                } else {
                    throw new Error(response.error);
                }
            }
        } catch (error) {
            console.error('Error al guardar etiqueta:', error);
            toast({
                title: "Error",
                description: "No se pudo guardar la etiqueta",
                variant: "destructive",
            });
        }
    };

    const handleDelete = (etiqueta: EtiquetaResponse) => {
        setEtiquetaToDelete(etiqueta);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!etiquetaToDelete) return;

        try {
            const response = await tagsServices.deleteEtiqueta(etiquetaToDelete.id);
            if (response.success) {
                toast({
                    title: "Éxito",
                    description: "Etiqueta eliminada correctamente",
                });
                setShowDeleteModal(false);
                setEtiquetaToDelete(null);
                loadEtiquetas();
            } else {
                throw new Error(response.error);
            }
        } catch (error) {
            console.error('Error al eliminar etiqueta:', error);
            toast({
                title: "Error",
                description: "No se pudo eliminar la etiqueta",
                variant: "destructive",
            });
        }
    };

    const abrirModal = (etiqueta?: EtiquetaResponse) => {
        if (etiqueta) {
            setEditingEtiqueta(etiqueta);
            setFormData({
                nombre: etiqueta.nombre,
                color: etiqueta.color,
                descripcion: etiqueta.descripcion || ''
            });
        } else {
            setEditingEtiqueta(null);
            setFormData({
                nombre: '',
                color: '#F29A1F',
                descripcion: ''
            });
        }
        setShowModal(true);
    };

    const cerrarModal = () => {
        setShowModal(false);
        setEditingEtiqueta(null);
        setFormData({
            nombre: '',
            color: '#F29A1F',
            descripcion: ''
        });
    };

    const etiquetasFiltradas = etiquetas.filter(etiqueta => {
        if (!etiqueta || !etiqueta.nombre) return false;
        const term = searchTerm.toLowerCase();
        return etiqueta.nombre.toLowerCase().includes(term) ||
            (etiqueta.descripcion && etiqueta.descripcion.toLowerCase().includes(term));
    });

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Etiquetas</h2>
                    <p className="text-muted-foreground">Gestiona las etiquetas para clasificar tus contactos y tareas.</p>
                </div>
                <Button onClick={() => abrirModal()} className="bg-[#F29A1F] hover:bg-[#d8891c] text-white">
                    <Plus className="mr-2 h-4 w-4" /> Nueva Etiqueta
                </Button>
            </div>

            <div className="flex items-center space-x-2">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar etiquetas..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8"
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F29A1F]"></div>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {etiquetasFiltradas.length === 0 ? (
                        <div className="col-span-full text-center py-12 border rounded-lg bg-muted/10">
                            <Tag className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
                            <h3 className="mt-4 text-lg font-semibold">No hay etiquetas</h3>
                            <p className="text-muted-foreground">
                                {searchTerm ? 'No se encontraron etiquetas con ese término.' : 'Comienza creando tu primera etiqueta.'}
                            </p>
                        </div>
                    ) : (
                        etiquetasFiltradas.map((etiqueta) => (
                            <Card key={etiqueta.id} className="overflow-hidden hover:shadow-md transition-shadow">
                                <CardContent className="p-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center space-x-3">
                                            <div
                                                className="w-4 h-4 rounded-full flex-shrink-0"
                                                style={{ backgroundColor: etiqueta.color }}
                                            />
                                            <div>
                                                <h4 className="font-semibold">{etiqueta.nombre}</h4>
                                                {etiqueta.descripcion && (
                                                    <p className="text-sm text-muted-foreground line-clamp-2">{etiqueta.descripcion}</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex space-x-1">
                                            <Button variant="ghost" size="icon" onClick={() => abrirModal(etiqueta)}>
                                                <Edit2 className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(etiqueta)} className="text-destructive hover:text-destructive">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            )}

            {/* Modal Crear/Editar */}
            <Dialog open={showModal} onOpenChange={setShowModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingEtiqueta ? 'Editar Etiqueta' : 'Nueva Etiqueta'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="nombre">Nombre</Label>
                            <Input
                                id="nombre"
                                value={formData.nombre}
                                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                placeholder="Ej: Cliente VIP"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Color</Label>
                            <div className="flex flex-wrap gap-2 mb-2">
                                {coloresPredefinidos.map((color) => (
                                    <button
                                        key={color}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, color })}
                                        className={`w-8 h-8 rounded-full border-2 transition-all ${formData.color === color ? 'border-primary scale-110 ring-2 ring-offset-2 ring-primary' : 'border-transparent hover:scale-105'
                                            }`}
                                        style={{ backgroundColor: color }}
                                    />
                                ))}
                            </div>
                            <div className="flex items-center space-x-2">
                                <Input
                                    type="color"
                                    value={formData.color}
                                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                    className="w-12 h-10 p-1 cursor-pointer"
                                />
                                <span className="text-sm text-muted-foreground">{formData.color}</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="descripcion">Descripción</Label>
                            <Input
                                id="descripcion"
                                value={formData.descripcion}
                                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                                placeholder="Descripción opcional"
                            />
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={cerrarModal}>Cancelar</Button>
                            <Button type="submit" className="bg-[#F29A1F] hover:bg-[#d8891c] text-white">
                                {editingEtiqueta ? 'Actualizar' : 'Crear'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal Eliminar */}
            <AlertDialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción eliminará permanentemente la etiqueta "{etiquetaToDelete?.nombre}".
                            Esta acción no se puede deshacer.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setEtiquetaToDelete(null)}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
