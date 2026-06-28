"use client";

import { useActionState, useEffect, useState } from "react";
import { createSeasonAction } from "./actions";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusIcon } from "lucide-react";

export function SeasonForm() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(createSeasonAction, null);

  useEffect(() => {
    if (state?.success) setOpen(false);
  }, [state]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button />}>
        <PlusIcon />
        Nueva temporada
      </SheetTrigger>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Nueva temporada</SheetTitle>
        </SheetHeader>
        <form action={action} className="flex flex-col gap-5 p-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              name="name"
              placeholder="2025-2026"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="start_date">Fecha de inicio</Label>
            <Input id="start_date" name="start_date" type="date" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="end_date">Fecha de fin</Label>
            <Input id="end_date" name="end_date" type="date" required />
          </div>
          {state?.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
          <div className="flex gap-2 mt-2">
            <Button type="submit" disabled={pending} className="flex-1">
              {pending ? "Guardando…" : "Crear temporada"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
