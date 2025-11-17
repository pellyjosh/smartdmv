/**
 * Offline Preloader
 * Preloads all offline-supported pages to cache their chunks
 */

"use client";

import { useEffect, useState } from "react";
import { useNetworkStatus } from "@/hooks/use-network-status";

const OFFLINE_SUPPORTED_ROUTES = [
  "/administrator",
  "/admin/appointments",
  "/admin/appointment-requests",
  "/admin/clients",
  "/admin/contact-requests",
  "/admin/pet-admissions",
  "/admin/health-plans",
  "/admin/vaccinations",
];

export function OfflinePreloader() {
  const { isOnline } = useNetworkStatus();
  const [isPreloading, setIsPreloading] = useState(false);
  const [preloaded, setPreloaded] = useState(false);

  useEffect(() => {
    // Only preload when online and not already preloaded
    if (isOnline && !preloaded && !isPreloading) {
      preloadOfflineRoutes();
    }
  }, [isOnline, preloaded, isPreloading]);

  const preloadOfflineRoutes = async () => {
    setIsPreloading(true);
    console.log("[OfflinePreloader] Starting to preload offline routes...");

    try {
      // Use link preload to trigger Next.js to load the chunks
      for (const route of OFFLINE_SUPPORTED_ROUTES) {
        // Create invisible iframe to trigger chunk loading
        const iframe = document.createElement("iframe");
        iframe.style.display = "none";
        iframe.src = route;

        document.body.appendChild(iframe);

        // Wait a bit for chunks to load
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Remove iframe
        document.body.removeChild(iframe);

        console.log("[OfflinePreloader] Preloaded:", route);
      }

      setPreloaded(true);
      console.log("[OfflinePreloader] All routes preloaded!");

      // Store in localStorage so we don't preload again
      localStorage.setItem("offline-routes-preloaded", "true");
    } catch (error) {
      console.error("[OfflinePreloader] Preload error:", error);
    } finally {
      setIsPreloading(false);
    }
  };

  // Check if already preloaded
  useEffect(() => {
    const wasPreloaded = localStorage.getItem("offline-routes-preloaded");
    if (wasPreloaded) {
      setPreloaded(true);
    }
  }, []);

  return null; // This is a background component
}
