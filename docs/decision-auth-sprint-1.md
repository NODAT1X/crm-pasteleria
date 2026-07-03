# Decisión de autenticación — Sprint 1

## Proyecto

CRM / Sistema Web para Pastelería Nodatix

## Sprint

Sprint 1 — Clientes + autenticación base de administrador

## Objetivo de la decisión

Evaluar Better Auth y Auth.js para seleccionar la alternativa oficial de autenticación del Sprint 1 antes de implementar login, sesión y rutas protegidas.

## Contexto del proyecto

El CRM Pastelería será utilizado inicialmente por una sola persona: el dueño de la pastelería.

Por lo tanto, el sistema no requiere en Sprint 1:

- Registro público.
- Invitaciones de usuarios.
- Gestión de empleados.
- Roles avanzados.
- Proveedores OAuth externos.
- Login social.
- Multiusuario avanzado.

El acceso inicial será únicamente para un usuario administrador.

## Alternativas evaluadas

| Alternativa | Ventajas | Riesgos / desventajas | Veredicto |
|---|---|---|---|
| Better Auth | Soporte moderno para Next.js, email/password integrado, sesiones, base de datos, adaptador Prisma, buena alineación con el stack actual. | Requiere validar bien configuración con Prisma y evitar habilitar flujos públicos no deseados. | Recomendada |
| Auth.js | Proyecto maduro, conocido en Next.js, buena compatibilidad con providers externos y sesiones. | Para este caso puede ser más amplio de lo necesario; el proyecto Auth.js ahora forma parte del ecosistema Better Auth; en Next.js usa `next-auth@beta`. | No seleccionada para Sprint 1 |

## Decisión oficial

Para Sprint 1 se selecciona:

```txt
Better Auth