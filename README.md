# 📸 Galería de Fotos

Galería de actividades con Google Drive + Firebase. Sin backend, 100% gratuito.

## Stack

- **Frontend:** React + Vite
- **Auth:** Firebase Authentication (Google)
- **Base de datos:** Firestore
- **Hosting:** Firebase Hosting
- **Fotos/Videos:** Google Drive (carpetas públicas)

## Configuración inicial

### 1. Instalar dependencias

```bash
npm install
```

### 2. Crear proyecto Firebase

1. Ve a [console.firebase.google.com](https://console.firebase.google.com)
2. Crea un nuevo proyecto
3. Activa **Authentication → Sign-in method → Google**
4. Crea una base de datos **Firestore** (modo producción)
5. Activa **Hosting**

### 3. Crear API Key de Google Drive

1. Ve a [console.cloud.google.com](https://console.cloud.google.com)
2. Crea un proyecto (o usa el mismo de Firebase)
3. Activa la **Google Drive API**
4. Crea una **API Key**
5. Restringe la key a tu dominio de Firebase Hosting y a la Drive API

### 4. Configurar variables de entorno

```bash
cp .env.example .env
```

Rellena `.env` con tus credenciales reales.

### 5. Reglas de Firestore

En la consola de Firebase → Firestore → Reglas:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Cualquiera puede leer actividades publicadas
    match /activities/{id} {
      allow read: if resource.data.published == true;
      // Solo el admin puede escribir (se valida por email en el frontend)
      allow write: if request.auth != null
                   && request.auth.token.email == "tuEmail@gmail.com";
    }
  }
}
```

### 6. Agregar dominio autorizado en Firebase Auth

Firebase Console → Authentication → Settings → Authorized domains  
Agrega tu dominio de Firebase Hosting (ej: `mi-galeria.web.app`).

## Desarrollo local

```bash
npm run dev
```

## Deploy

```bash
npm run build
npx firebase deploy
```

## Uso

### Galería pública
- Visita la URL raíz del sitio
- Las actividades publicadas aparecen como tarjetas
- Al entrar a una actividad se cargan las fotos de la carpeta de Drive
- Puedes ver en lightbox, descargar individualmente o descargar todo como ZIP

### Panel admin
- Ve a `/login` o haz clic en "Admin" en la navbar
- Inicia sesión con tu Gmail configurado en `VITE_ADMIN_EMAIL`
- Crea actividades pegando el **ID de la carpeta** de Google Drive
  - El ID está en la URL: `drive.google.com/drive/folders/**ID_AQUÍ**`
- Publica/oculta actividades con un clic

## Cómo encontrar el ID de una carpeta Drive

1. Abre la carpeta en Google Drive
2. Copia el ID de la URL: `https://drive.google.com/drive/folders/`**`1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs`**
3. Asegúrate de que la carpeta esté compartida como **"Cualquiera con el enlace"**
