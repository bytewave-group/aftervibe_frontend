
import path from 'path';
import react from '@vitejs/plugin-react';


const SRC_DIR = path.resolve(__dirname, './src');
const PUBLIC_DIR = path.resolve(__dirname, './public');
const BUILD_DIR = path.resolve(__dirname, './www',);
export default async () => {

  return  {
    plugins: [
      react(),

    ],
    root: SRC_DIR,
    envDir: __dirname,
    base: '',
    publicDir: PUBLIC_DIR,
    build: {
      outDir: BUILD_DIR,
      assetsInlineLimit: 0,
      emptyOutDir: true,
      rollupOptions: {
        treeshake: false,
      },
    },
    resolve: {
      alias: {
        '@': SRC_DIR,
      },
    },
    server: {
      host: true,
      // apps/customer owns 5173 (the Electron display app loads it there).
      port: 5174,
      strictPort: true,
    },

  };
}
