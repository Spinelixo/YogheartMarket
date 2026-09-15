"use client";

import { useEffect, useRef } from "react";

/**
 * useModalHistory — integrates a modal's open/close state with the browser
 * history stack so that Android's swipe-back gesture (and the hardware back
 * button) closes the modal instead of navigating away from the page.
 *
 * How it works:
 *  1. When `isOpen` becomes true, we push a new history entry with a
 *     unique hash (e.g. `#modal-newChat`).
 *  2. When the user swipes back / presses back, the browser pops that entry
 *     and fires `popstate`. We catch it and call `onClose()`.
 *  3. When the modal is closed programmatically (button / overlay click), we
 *     detect the hash is still present and call `history.back()` to clean it up.
 *
 * @param key   A unique string per modal instance (e.g. "newChat", "postModal").
 * @param isOpen  Whether the modal is currently open.
 * @param onClose Callback to close the modal (should set the state to false).
 */
export function useModalHistory(
  key: string,
  isOpen: boolean,
  onClose: () => void
) {
  const hashTag = `#modal-${key}`;
  const hasPushedRef = useRef(false);
  // Capture the latest onClose in a ref so the popstate listener always
  // calls the freshest version without re-registering.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (isOpen) {
      // Modal just opened — push a history entry if we haven't already.
      if (!hasPushedRef.current) {
        const currentStack: string[] = (window.history.state && Array.isArray(window.history.state.modalStack))
          ? [...window.history.state.modalStack]
          : [];
        const nextStack = currentStack.includes(key) ? currentStack : [...currentStack, key];
        const stateToPush = {
          ...(typeof window.history.state === "object" && window.history.state !== null ? window.history.state : {}),
          modalKey: key,
          modalStack: nextStack,
        };
        window.history.pushState(stateToPush, "", hashTag);
        hasPushedRef.current = true;
      }
    } else {
      // Modal just closed programmatically — clean up the history entry.
      if (hasPushedRef.current) {
        hasPushedRef.current = false;
        // Only go back if our hash is still current (avoids double-back).
        if (window.location.hash === hashTag) {
          window.history.back();
        }
      }
    }
  }, [isOpen, key, hashTag]);

  // Listen for back-navigation (swipe / hardware button)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handlePopState = (e: PopStateEvent) => {
      if (hasPushedRef.current) {
        const stateStack: string[] = (e.state && Array.isArray(e.state.modalStack)) ? e.state.modalStack : [];
        // If this key is no longer present in the new state's modalStack,
        // or if the URL no longer has any modal hash, the user navigated back past this modal!
        if (!stateStack.includes(key)) {
          hasPushedRef.current = false;
          onCloseRef.current();
        }
      }
    };

    window.addEventListener("popstate", handlePopState, { capture: true });
    return () => window.removeEventListener("popstate", handlePopState, { capture: true });
  }, [key]);

  // Cleanup: if the component unmounts while the modal is open, pop the entry.
  useEffect(() => {
    return () => {
      if (hasPushedRef.current) {
        hasPushedRef.current = false;
        if (
          typeof window !== "undefined" &&
          window.location.hash === hashTag
        ) {
          window.history.back();
        }
      }
    };
  }, [hashTag]);
}
