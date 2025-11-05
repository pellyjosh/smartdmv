"use client";

import { useEffect } from "react";
import { initializePWA } from "@/lib/pwa";

/**
 * Client component that initializes PWA on app startup
 * This must be a client component because it uses browser APIs
 */
export function PWAInitializer() {
  useEffect(() => {
    console.log("[PWAInitializer] Starting PWA initialization...");
    initializePWA()
      .then((result) => {
        if (result.success) {
          console.log("[PWAInitializer] PWA initialized successfully");
        } else {
          console.warn(
            "[PWAInitializer] PWA initialization failed:",
            result.error
          );
        }
      })
      .catch((error) => {
        console.error("[PWAInitializer] PWA initialization error:", error);
      });
  }, []);

  // This component doesn't render anything
  return null;
}
