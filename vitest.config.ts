import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

/**
 * Configuración de Vitest para las pruebas mínimas de reglas críticas (S5-003).
 *
 * - Entorno `node`: las pruebas cubren funciones puras de negocio (dinero,
 *   estados, disponibilidad). No se usa jsdom ni Testing Library porque no se
 *   prueba UI.
 * - Alias `@/` -> `src/`, igual que `tsconfig.json`, resuelto manualmente para
 *   no añadir dependencias extra (p. ej. `vite-tsconfig-paths`).
 * - Solo se recogen archivos `*.test.ts` dentro de `src/`.
 *
 * Estas pruebas NO tocan la base de datos: importan únicamente módulos puros y
 * funciones de servicio que no ejecutan consultas.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
