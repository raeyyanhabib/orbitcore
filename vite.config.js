// vite.config.js
// Configuration file for Vite build tool and development server

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  
  // 1. Load the React plugin to compile JSX files
  plugins: [react()],

  // 2. Set the base path to relative ('./')
  // CRITICAL: Electron loads files locally from disk (file:/// protocol).
  // Standard web paths like '/assets/index.js' will fail; they must be relative './assets/index.js'.
  base: "./",

  // 3. Configure production bundling options
  build: {
    
    // Output compiled assets directly into the 'dist' directory
    outDir: "dist",

    // Clean the destination folder before rebuilding assets
    emptyOutDir: true

  },

  // 4. Configure local development server settings
  server: {
    
    // Run the development server on port 5173
    port: 5173,

    // Fail if port 5173 is already in use, instead of automatically choosing another port
    strictPort: true

  }

});
