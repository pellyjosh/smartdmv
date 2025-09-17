"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import LoadingSpinner from "@/components/loading-spinner";

export default function GlobalLoader() {
  const [loading, setLoading] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setLoading(true);
    const timeout = setTimeout(() => setLoading(false), 400); // short delay for UX
    return () => clearTimeout(timeout);
  }, [pathname]);

  if (!loading) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/80 pointer-events-none transition-colors">
      <div className="relative flex flex-col items-center justify-center p-8 rounded-2xl shadow-2xl backdrop-blur-md bg-background border border-border min-w-[260px] transition-colors">
        {/* Subtle animated border for modern feel */}
        <div className="absolute -inset-1 rounded-2xl z-[-1] border-2 border-primary/30 animate-pulse" />
        <LoadingSpinner size="lg" className="drop-shadow-xl text-primary" />
        <span className="mt-4 text-lg font-semibold text-foreground tracking-wide animate-pulse">Loading, please wait...</span>
      </div>
    </div>
  );
}
