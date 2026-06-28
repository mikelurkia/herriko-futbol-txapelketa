"use client";

import { useActionState, useEffect, useState } from "react";
import { createTeamAction, updateTeamAction } from "./actions";
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
import { PlusIcon, PencilIcon } from "lucide-react";

interface Team {
  id: string;
  name: string;
  primary_color: string | null;
  secondary_color: string | null;
}

interface TeamFormProps {
  team?: Team;
}

export function TeamForm({ team }: TeamFormProps) {
  const [open, setOpen] = useState(false);
  const action = team ? updateTeamAction : createTeamAction;
  const [state, formAction, pending] = useActionState(action, null);

  useEffect(() => {
    if (state?.success) setOpen(false);
  }, [state]);

  const isEdit = !!team;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {isEdit ? (
        <SheetTrigger render={<Button variant="ghost" size="icon-sm" />}>
          <PencilIcon />
          <span className="sr-only">Editar</span>
        </SheetTrigger>
      ) : (
        <SheetTrigger render={<Button />}>
          <PlusIcon />
          Nuevo equipo
        </SheetTrigger>
      )}

      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Editar equipo" : "Nuevo equipo"}</SheetTitle>
        </SheetHeader>
        <form action={formAction} className="flex flex-col gap-5 p-4 pt-2">
          {isEdit && <input type="hidden" name="id" value={team.id} />}

          <div className="space-y-1.5">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              name="name"
              placeholder="Nombre del equipo"
              defaultValue={team?.name}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="primary_color">Color principal</Label>
            <div className="flex items-center gap-3">
              <input
                id="primary_color"
                name="primary_color"
                type="color"
                defaultValue={team?.primary_color ?? "#1a1a1a"}
                className="w-10 h-10 rounded border border-border cursor-pointer p-0.5 bg-white"
              />
              <span className="text-xs text-[var(--color-dust)]">
                Color de camiseta principal
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="secondary_color">Color secundario</Label>
            <div className="flex items-center gap-3">
              <input
                id="secondary_color"
                name="secondary_color"
                type="color"
                defaultValue={team?.secondary_color ?? "#ffffff"}
                className="w-10 h-10 rounded border border-border cursor-pointer p-0.5 bg-white"
              />
              <span className="text-xs text-[var(--color-dust)]">
                Color de camiseta secundario
              </span>
            </div>
          </div>

          {state?.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}

          <div className="flex gap-2 mt-2">
            <Button type="submit" disabled={pending} className="flex-1">
              {pending ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear equipo"}
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
