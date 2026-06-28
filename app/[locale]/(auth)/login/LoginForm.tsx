"use client";

import { useActionState } from "react";
import { loginAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm({ locale }: { locale: string }) {
  const [state, action, pending] = useActionState(loginAction, null);

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="locale" value={locale} />

      <div className="space-y-1.5">
        <Label htmlFor="email" className="text-xs uppercase tracking-widest text-[var(--color-dust)]">
          Email
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="bg-white border-border h-11 text-base"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password" className="text-xs uppercase tracking-widest text-[var(--color-dust)]">
          Contraseña · Pasahitza
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="bg-white border-border h-11 text-base"
        />
      </div>

      {state?.error && (
        <p className="text-sm text-[var(--color-gol)] font-medium">{state.error}</p>
      )}

      <Button
        type="submit"
        disabled={pending}
        className="w-full h-11 text-sm uppercase tracking-widest font-semibold bg-[var(--color-gol)] hover:bg-[var(--color-gol)]/90 text-white border-0"
      >
        {pending ? "..." : "Entrar · Sartu"}
      </Button>
    </form>
  );
}
