import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
export default defineConfig({plugins:[react()],resolve:{alias:{'next/image':path.resolve('preview/Image.tsx'),'next/link':path.resolve('preview/Link.tsx'),'next/navigation':path.resolve('preview/navigation.ts'),'@':path.resolve('.')}},define:{'process.env.NEXT_PUBLIC_WHATSAPP':JSON.stringify(''),'process.env.NEXT_PUBLIC_CONTACT_EMAIL':JSON.stringify(''),'process.env.NEXT_PUBLIC_APP_URL':JSON.stringify('')},build:{outDir:'dist',emptyOutDir:true},server:{port:5173}});
