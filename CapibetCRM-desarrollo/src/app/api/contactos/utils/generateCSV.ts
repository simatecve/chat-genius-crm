import { IContacto } from '../domain/contacto';

function generateCSV(contactos: IContacto[]): string {
    const headers = [
      'First Name',
      'Last Name',
      'E-mail 1 - Value',
      'Phone 1 - Value',
      'Organization Name',
      'Organization Title',
      'Labels',
      'Notes',
      'Address 1 - Formatted',
      'Birthday',
      'Website 1 - Value',
    ];
  
    // Crear filas de datos
    const rows = contactos.map(contacto => {
      return [
        `"${contacto.nombre || ''}"`,
        `"${contacto.apellido || ''}"`,
        `"${contacto.correo || ''}"`,
        `"${contacto.telefono || ''}"`,
        `"${contacto.empresa || ''}"`,
        `"${contacto.cargo || ''}"`,
        `"${contacto.etiqueta || ''}"`,
        `"${contacto.notas || ''}"`,
        `"${contacto.direccion || ''}"`,
        `"${contacto.cumpleaños || ''}"`,
        `"${contacto.sitio_web || ''}"`,
      ];
    });
  
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    return csvContent;
}

export default generateCSV;