import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@/server/auth/auth";

// Monta todos los endpoints de Better Auth bajo /api/auth/*.
export const { GET, POST } = toNextJsHandler(auth);
