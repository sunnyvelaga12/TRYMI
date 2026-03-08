import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

// Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [
    react({
      jsxRuntime: "automatic",
      fastRefresh: true,
    }),
  ],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@frontend": path.resolve(__dirname, "./src/frontend"),
      "@components": path.resolve(__dirname, "./src/frontend/components"),
      "@core": path.resolve(__dirname, "./src/core"),
      "@assets": path.resolve(__dirname, "./src/assets"),
      "@styles": path.resolve(__dirname, "./src/frontend/styles"),
    },
  },

  publicDir: "public",

  server: {
    host: "0.0.0.0",
    port: 3001,
    strictPort: true,
    open: true,
    hmr: {
      overlay: true,
    },
    fs: {
      strict: false,
      allow: [".."],
    },
  },

  preview: {
    host: "0.0.0.0",
    port: 4173,
    open: true,
    strictPort: false,
  },

  build: {
    outDir: "dist",
    sourcemap: false,
    target: "esnext",
    minify: "esbuild",
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          chakra: ["@chakra-ui/react", "@emotion/react", "@emotion/styled"],
          three: ["three", "@react-three/fiber", "@react-three/drei"],
          state: ["zustand"],
        },
      },
    },
  },

  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "react/jsx-runtime",
      "zustand",
      "@chakra-ui/react",
      "@emotion/react",
      "@emotion/styled",
      "three",
      "@react-three/fiber",
      "@react-three/drei",
      "react-icons",
    ],
    esbuildOptions: {
      target: "esnext",
    },
  },

  // Force resolution of zustand to the root node_modules version
  // to avoid conflicts with @react-three/drei's bundled zustand
  ssr: {
    noExternal: ["zustand"],
  },

  css: {
    devSourcemap: true,
  },

  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV !== "production"),
    "import.meta.env.VITE_API_URL": JSON.stringify(
      process.env.VITE_API_URL || "http://localhost:3000"
    ),
  },
});
