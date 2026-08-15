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
      // a user action (e.g. the emoji picker + its ~460KB dataset, only fetched
      // when the emoji tray is actually opened). Without this, that chunk would
      // still get silently downloaded on every page load via <link rel="modulepreload">,
      // defeating the point of splitting it out. Everything else keeps Vite's
      // default preload behavior unchanged.
      resolveDependencies: (filename, deps) => deps.filter((d) => !d.includes('vendor-emoji')),
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('recharts') || id.includes('d3-')) return 'vendor-charts';
            if (id.includes('@supabase')) return 'vendor-supabase';
            if (id.includes('react-dom') || id.includes('react-router-dom') || id.includes('scheduler')) return 'vendor-react';
            // Anchored to the package's own node_modules folder, not a bare
            // '/react/' substring: that loosely matched ANY package path
            // containing "react" as a path segment, including the unrelated
            // @emoji-mart/react package (unpacks to node_modules/@emoji-mart/
            // react/...). That swept @emoji-mart/react's code into this
            // always-eager chunk instead of vendor-emoji below, and since
            // that misplaced code statically imports a shared internal
            // export from the rest of emoji-mart, it dragged the ~510KB
            // vendor-emoji chunk into every single page load — including the
            // anonymous Login page — regardless of the emoji picker's own
            // lazy()/dynamic import() usage in RoomChat/MobileRoomChat.
            if (id.includes('/node_modules/react/')) return 'vendor-react';
            if (id.includes('firebase')) return 'vendor-firebase';
            if (id.includes('stripe')) return 'vendor-stripe';
            if (id.includes('emoji-mart')) return 'vendor-emoji';
            if (id.includes('@capacitor')) return 'vendor-capacitor';
          }
          // App-wide modules that Navbar/App.jsx/Login.jsx (all part of the
          // static, always-loaded entry graph) share with the lazy route
          // chunks below. Without pinning them here, Rollup's default chunking
          // is free to physically host a shared export (e.g. `supabase` or
          // `useTranslation`) inside whichever lazy chunk it happens to pick —
          // which then makes that ENTIRE route's code (Discover, RoomChat,
          // ProfileSetup — 100KB+ each) a forced static dependency of every
          // single page load, including the anonymous logged-out Login page,
          // silently defeating the lazy-loading these routes were split out
          // for in the first place. Keeping them in their own small chunk lets
          // the route chunks below stay genuinely dynamic-only.
          if (id.includes('src/lib/supabaseClient')) return 'app-shared';
          if (id.includes('src/hooks/useTranslation')) return 'app-shared';
          if (id.includes('src/hooks/useIsMobile')) return 'app-shared';
          if (id.includes('src/hooks/useUnreadCount')) return 'app-shared';
          if (id.includes('src/context/OnlineContext')) return 'app-shared';
          if (id.includes('src/components/MobileNavbar')) return 'app-shared';
          // Shared between RoomChat.jsx ('page-chat' below) and
          // UserProfilePage.jsx (its own default lazy chunk) - same story as
          // the rest of this block: left unpinned, Rollup hosted it inside
          // 'page-chat', making the ~55KB page-chat chunk a forced static
          // dependency of the mobile Bio page even though most visitors there
          // never open a chat.
          if (id.includes('src/components/PhotoEnlargeModal')) return 'app-shared';
          // Same story again: optimizeImage() is called from RoomChat.jsx
          // ('page-chat'), UserProfilePage.jsx (its own lazy chunk), and
          // MobileRoomChat.jsx ('page-chat' too). It used to be a dead,
          // never-called import in all three (tree-shaken away entirely), so
          // this had no effect - now that the RoomChat/UserProfilePage photo
          // carousels actually call it (Task C's fix), leaving it unpinned
          // let Rollup host the real function inside 'page-chat' and made
          // UserProfilePage cross-import it from there, exactly the forced
          // static dependency this whole block exists to avoid.
          if (id.includes('src/lib/imageUtils')) return 'app-shared';
          // Same story, but for an asset rather than code: this logo image is
          // imported by both Login.jsx (main entry) and Discover.jsx (lazy),
          // and Rollup dedupes the resulting asset-URL constant into a single
          // module — which, left unpinned, again gets hosted inside whichever
          // lazy chunk Rollup picks, dragging that chunk's code along with it.
          if (id.includes('src/lib/LotusConnexs-full.jpeg')) return 'app-shared';
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
