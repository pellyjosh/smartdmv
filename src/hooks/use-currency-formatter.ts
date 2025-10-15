"use client";

import { useQuery } from "@tanstack/react-query";
import { usePractice } from "@/hooks/use-practice";
import formatAmountWithCurrency, { CurrencyInfo } from "@/lib/format/currency";

export const useCurrencyFormatter = () => {
  const { practice } = usePractice();
  const practiceId = practice?.id;

  const { data: practiceCurrency } = useQuery<CurrencyInfo | null>({
    queryKey: ["/api/practices", practiceId, "currency"],
    queryFn: async () => {
      if (!practiceId) return null;
      const res = await fetch(`/api/practices/${practiceId}/currency`, {
        credentials: "include",
      });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!practiceId,
  });

  const format = (amount: number) => formatAmountWithCurrency(amount, practiceCurrency ?? undefined);

  return { format, practiceCurrency };
};

export default useCurrencyFormatter;
