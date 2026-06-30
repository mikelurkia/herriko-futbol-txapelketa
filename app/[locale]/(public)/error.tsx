"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export default function PublicError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  const t = useTranslations("common");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="py-16 text-center">
      <p className="text-[var(--color-pitch)] font-medium mb-4">{t("error")}</p>
      <Button onClick={() => unstable_retry()}>{t("retry")}</Button>
    </div>
  );
}
