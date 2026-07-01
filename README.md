# Rutas Himetal

App web para organizar recorridos de camiones de reparto.

Incluye:

- Carga de clientes con dirección, teléfono, zona, horarios, prioridad y observaciones.
- Carga de pedidos por fecha.
- Carga de camiones con chofer, WhatsApp y capacidad.
- Generación de recorridos en 3 modos:
  - Menos distancia.
  - Por horarios y prioridad.
  - Por zonas.
- Mapa interactivo con OpenStreetMap.
- Marcadores numerados por parada.
- Color diferente por camión.
- Botón para abrir el recorrido en Google Maps.
- Botón para enviar recorrido por WhatsApp al chofer.
- Exportación CSV del recorrido.
- Acceso protegido con usuario y contraseña obligatorios.

## Seguridad: usuario y contraseña

La app está protegida desde el servidor con usuario y contraseña.

Para probarla en tu PC ya viene configurado:

```bash
Usuario: admin
Contraseña: 1234
```

Para cambiarlo en tu PC, editá el archivo `.env.local`:

```bash
APP_USERNAME=admin
APP_PASSWORD=1234
```

En Vercel tenés que cargar estas variables en **Settings > Environment Variables**:

```bash
APP_USERNAME=tu_usuario
APP_PASSWORD=tu_contraseña_segura
```

Si esas variables no están configuradas, la app no permite entrar.

## Cómo ejecutarlo en tu PC

1. Descomprimir el ZIP.
2. Abrir la carpeta en Visual Studio Code.
3. Abrir una terminal dentro de la carpeta.
4. Ejecutar:

```bash
npm install
npm run dev
```

5. Abrir en el navegador:

```bash
http://localhost:3000
```

## Cómo subirlo a GitHub

Desde la carpeta del proyecto:

```bash
git init
git add .
git commit -m "Primer version app recorridos"
git branch -M main
git remote add origin URL_DE_TU_REPOSITORIO
git push -u origin main
```

Después entrás a Vercel, importás ese repositorio y hacés Deploy.

## Importante

Esta primera versión guarda los datos en el navegador usando `localStorage`.
Sirve para probar la app rápido en Vercel.

Cuando quieras que los datos queden guardados para todos los usuarios y desde cualquier PC, el próximo paso es conectar Supabase.

## Coordenadas y mapa

Para que una dirección aparezca bien en el mapa necesita latitud y longitud.

Opciones:

1. Cargar latitud y longitud manualmente.
2. Guardar el cliente y tocar el botón **Buscar coordenadas**.

La app trae un endpoint interno:

```bash
/api/geocode?q=Dirección
```

Ese endpoint consulta OpenStreetMap/Nominatim y devuelve coordenadas.

## Próximas mejoras recomendadas

- Login avanzado con usuarios individuales.
- Base de datos Supabase.
- Importar pedidos desde Excel.
- Estado para chofer: pendiente, entregado, no entregado.
- Firma o foto de entrega.
- Optimización avanzada por capacidad real, volumen, horarios estrictos y tráfico.
