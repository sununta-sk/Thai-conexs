// src/context/NavGuardContext.jsx
// Lets ProfileSetup block navigation attempts that originate OUTSIDE
// itself — Navbar/MobileNavbar's menu items and tabs, the notification
// bell, and GlobalToast's click-to-open-chat toasts are all mounted
// globally and have no visibility into ProfileSetup's local "has a photo /
// has clicked Save" state, so they can't decide on their own whether a
// click should navigate immediately or needs to pop a confirmation first.
//
// Only ProfileSetup ever registers a guard, and only while it's mounted —
// every other page leaves guardRef null, so requestNavigate() is a plain,
// synchronous passthrough to navigate() everywhere else in the app. This
// adds no behavior change outside ProfileSetup.
import { createContext, useContext, useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const NavGuardContext = createContext(null);

export function NavGuardProvider({ children }) {
  // Safe to call here: NavGuardProvider is mounted inside <Router> (see
  // App.jsx), so this is the same navigate() any other component under it
  // would get — there's nothing ProfileSetup-specific about it. Doing the
  // actual navigate() call from here (rather than threading each caller's
  // own navigate through) is what lets requestNavigate() be called from
  // anywhere with just a path, and lets a confirmed/resolved navigation
  // land wherever the ORIGINAL click meant to go, not wherever the guard
  // happened to be resolved from.
  const navigate = useNavigate();
  const guardRef = useRef(null); // () => null (allowed) | 'no-photo' | 'confirm-save'
  const [pending, setPending] = useState(null); // { path, reason } awaiting confirmation, or null

  // Set once ProfileSetup has itself confirmed (via an awaited, successful
  // save) that the profile now has a photo. ProtectedRoute's own Tier-2
  // check (App.jsx) reads this as an OR alongside its own DB query — purely
  // to close a real race, caught live: this app's <Routes> reuses the same
  // ProtectedRoute instance across sibling protected routes instead of
  // remounting it, so when a just-confirmed save calls navigate(), the
  // FIRST render for the new location still runs on last render's hasPhotos
  // state (React effects run after commit, not before) — ProtectedRoute's
  // own re-query, however fresh eventually, cannot possibly beat that first
  // render. This flag is the one signal guaranteed to already be correct at
  // that exact moment, because ProfileSetup itself just awaited the write
  // that made it true. Deliberately one-way for the session (never reset to
  // false) — a user emptying their gallery back to zero is caught by Tier 1
  // the moment they try to leave, same as any other incomplete profile.
  const [profileComplete, setProfileComplete] = useState(false);
  const markProfileComplete = useCallback(() => setProfileComplete(true), []);

  // ProfileSetup calls this once in a mount effect with a function that
  // always reads its CURRENT photos/hasClickedSave state (same
  // read-a-ref-every-render freshness pattern this file's own
  // saveProfileRef already uses) and calls the returned cleanup on
  // unmount, so no other page is ever affected by a stale guard.
  const registerGuard = useCallback((fn) => {
    guardRef.current = fn;
    return () => { guardRef.current = null; };
  }, []);

  // Captures WHY a click was blocked at the moment it was blocked (the
  // guard's own return value), rather than ProfileSetup recomputing "why"
  // later from its live state when the popup renders — avoids the popup
  // silently reclassifying itself if state changes while it's open.
  const requestNavigate = useCallback((path) => {
    const reason = guardRef.current?.();
    if (!reason) navigate(path);
    else setPending({ path, reason });
  }, [navigate]);

  // Called after the user resolves the block (uploads a photo and/or
  // confirms Save) — proceeds to whatever path the ORIGINAL click asked
  // for, not a hardcoded destination.
  //
  // Reads `pending` from the closure rather than a setPending() updater —
  // this app renders under React.StrictMode (main.jsx), which
  // double-invokes updater functions in dev specifically to catch
  // side effects like a navigate() call hidden inside one.
  const resolvePending = useCallback(() => {
    if (pending) navigate(pending.path);
    setPending(null);
  }, [pending, navigate]);

  const cancelPending = useCallback(() => setPending(null), []);

  const value = { registerGuard, requestNavigate, pending, resolvePending, cancelPending, profileComplete, markProfileComplete };
  return <NavGuardContext.Provider value={value}>{children}</NavGuardContext.Provider>;
}

export function useNavGuard() {
  return useContext(NavGuardContext);
}
