# Rutas Himetal / Logística

App Next.js para cargar clientes, pedidos, camiones y ver recorridos en mapa.

## Instalar

```bash
npm install
npm run dev
```

Abrir: http://localhost:3000

## Guardado en Supabase

Esta versión guarda en Supabase:

- Clientes
- Pedidos
- Camiones
- Configuración de salida / empresa

### 1) Crear tablas

En Supabase ir a:

SQL Editor > New query

Pegar el contenido de `supabase.sql` y ejecutar **Run**.

### 2) Variables de entorno

Crear archivo `.env.local` en la carpeta del proyecto:

```env
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=TU_ANON_KEY
```

Esos datos salen de Supabase > Project Settings > API.

### 3) En Vercel

En el proyecto de Vercel ir a:

Settings > Environment Variables

Agregar:

```env
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

Luego hacer **Redeploy**.

Si no se cargan esas variables, la app funciona con guardado local del navegador.
