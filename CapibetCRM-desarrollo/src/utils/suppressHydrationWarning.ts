/**
 * Suprime warnings de hidratación causados por extensiones del navegador
 * como Bitwarden, LastPass, etc. que agregan atributos como bis_skin_checked
 */

if (typeof window !== 'undefined') {
    // Suprimir warning específico de hidratación
    const originalError = console.error;
    console.error = (...args) => {
        if (
            typeof args[0] === 'string' &&
            (args[0].includes('Hydration failed') ||
                args[0].includes('hydrated') ||
                args[0].includes('bis_skin_checked'))
        ) {
            // Ignorar este error específico
            return;
        }
        originalError.apply(console, args);
    };

    // Suprimir warning de React sobre diferencias de atributos
    const originalWarn = console.warn;
    console.warn = (...args) => {
        if (
            typeof args[0] === 'string' &&
            (args[0].includes('Did not expect server HTML') ||
                args[0].includes('bis_skin_checked'))
        ) {
            // Ignorar este warning específico
            return;
        }
        originalWarn.apply(console, args);
    };
}

export { };
