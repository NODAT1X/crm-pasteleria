import { createAuthClient } from "better-auth/react";

// Cliente de Better Auth para el navegador. Al ser same-origin, la baseURL se
// infiere del origen actual: no se expone ninguna URL ni secreto al cliente.
export const authClient = createAuthClient();
