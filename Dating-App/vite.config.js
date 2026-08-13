import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: { "/api": "http://localhost:4000" },
  },
  build: {
    chunkSizeWarningLimit: 400,
    modulePreload: {
      // Vite's default preloads the full transitive chunk graph reachable from
      // each entry, including chunks that are only ever loaded on-demand behind
      // a user action or an authenticated route (e.g. the emoji picker + its
      // ~460KB dataset, only fetched when the emoji tray is actually opened).
      // Without this, those chunks would still get silently downloaded on every
      // single page load — including the anonymous, logged-out Login/Register
      // page — via <link rel="modulepreload">, defeating the point of splitting
      // them out and, on constrained connections, competing for bandwidth with
      // vendor-supabase, which Login/Register need immediately to fetch the
      // "members online" preview photos. page-profile-setup/page-discover/
      // page-chat/vendor-firebase are all behind auth (post-login routes), so
      // they have no reason to preload before a visitor has even logged in.
      // Everything else keeps Vite's default preload behavior unchanged.
      resolveDependencies: (filename, deps) => deps.filter((d) =>
        !d.includes('vendor-emoji') &&
        !d.includes('page-profile-setup') &&
        !d.includes('page-discover') &&
        !d.includes('page-chat') &&
        !d.includes('vendor-firebase')
      ),
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('recharts') || id.includes('d3-')) return 'vendor-charts';
            if (id.includes('@supabase')) return 'vendor-supabase';
            if (id.includes('react-dom') || id.includes('react-router-dom') || id.includes('scheduler')) return 'vendor-react';
            if (id.includes('/react/')) return 'vendor-react';
            if (id.includes('firebase')) return 'vendor-firebase';
            if (id.includes('stripe')) return 'vendor-stripe';
            if (id.includes('emoji-mart')) return 'vendor-emoji';
          }
          if (id.includes('src/pages/admin')) return 'admin-pages';
          if (id.includes('ProfileSetup')) return 'page-profile-setup';
          if (id.includes('Discover')) return 'page-discover';
          if (id.includes('RoomChat')) return 'page-chat';
          if (id.includes('AnalyticsDashboard')) return 'page-analytics';
        }
      },
    },
  },
});
