
"use client";

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';

interface ClientOnlyWrapperProps {
  children: ReactNode;
}

export default function ClientOnlyWrapper({ children }: ClientOnlyWrapperProps) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return null; // Or a loading spinner
  }

  return <>{children}</>;
}
