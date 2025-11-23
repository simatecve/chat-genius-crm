import { IContacto } from '../domain/contacto';

interface ContactoCSV extends Omit<IContacto, 'id' | 'creado_en' | 'actualizado_en'> {
    id?: number;
  }

function parseCSV(csvContent: string): ContactoCSV[] {
    const lines = csvContent.split('\n');
    const contactos: ContactoCSV[] = [];
    
    if (lines.length < 2) return contactos;
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    
    const columnIndexMap = new Map<string, number>();
    headers.forEach((header, index) => {
      columnIndexMap.set(header, index);
    });
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
      
      const getValue = (columnName: string): string => {
        const index = columnIndexMap.get(columnName);
        return index !== undefined ? values[index] || '' : '';
      };
      
      const contacto: ContactoCSV = {
        nombre: getValue('First Name'),
        apellido: getValue('Last Name') || '',
        nombre_completo: `${getValue('First Name')} ${getValue('Last Name')}`.trim() || '',
        correo: getValue('E-mail 1 - Value') || getValue('E-mail 2 - Value') || getValue('E-mail 3 - Value') || '',
        telefono: getValue('Phone 1 - Value') || getValue('Phone 2 - Value') || getValue('Phone 3 - Value'),
        direccion: getValue('Address 1 - Formatted') || getValue('Address 2 - Formatted') || '',
        cumpleaños: getValue('Birthday') || null,
        sitio_web: getValue('Website 1 - Value') || getValue('Website 2 - Value') || '',
        notas: getValue('Notes') || '',
        empresa: getValue('Organization Name') || '',
        cargo: getValue('Organization Title') || '',
        etiqueta: '',
        creado_por: 1 // valor por defecto
      };

      if (contacto.nombre && contacto.telefono && contacto.correo) {
        contactos.push(contacto);
      }
    }
    
    return contactos;
}

export default parseCSV;

