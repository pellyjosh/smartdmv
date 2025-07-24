'use client';

import { usePractice } from './use-practice';

export function usePracticeId(): string | null {
  const { practice } = usePractice();
  return practice?.id ? String(practice.id) : null;
}
