# Flujo de migraciones de base de datos

La cadena canónica y completa del esquema está en `prisma/migrations`.

Para desplegar cambios de base de datos en producción se debe ejecutar:

```bash
npm run db:migrate:deploy
```

Los archivos de `supabase/migrations` son copias auxiliares de cambios recientes
para revisión de seguridad o ejecución manual controlada. No forman una cadena
independiente desde una base vacía y no deben ejecutarse nuevamente después de
`prisma migrate deploy`, porque contienen operaciones equivalentes.

Las tablas nuevas expuestas en `public` deben habilitar RLS o revocar acceso a
`anon` y `authenticated` en la migración Prisma correspondiente.
