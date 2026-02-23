import React from 'react'
import { Outlet, Link } from "react-router-dom";

function AppLayout() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <Link to="/" className="font-semibold tracking-tight">
            DowndaRoad Media
          </Link>

          <nav className="flex items-center gap-4 text-sm">
            <Link to="/login" className="text-zinc-300 hover:text-white">
              Login
            </Link>
            <Link
              to="/register"
              className="rounded-lg bg-white px-3 py-1.5 text-zinc-950 font-medium hover:bg-zinc-200"
            >
              Create account
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10">
        <Outlet />
      </main>

      <footer className="border-t border-zinc-800">
        <div className="mx-auto max-w-6xl px-4 py-6 text-xs text-zinc-500">
          MVP build • Week 1 demo
        </div>
      </footer>
    </div>
  );
}

export default AppLayout;
