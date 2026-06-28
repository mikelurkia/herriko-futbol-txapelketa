"use client";

import { useActionState, useEffect, useState } from "react";
import { createGroupAction, renameGroupAction } from "./actions";
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

interface GroupFormProps {
  group?: { id: string; name: string };
}

export function GroupForm({ group }: GroupFormProps) {
  const [open, setOpen] = useState(false);
  const isEdit = !!group;
  const action = isEdit ? renameGroupAction : createGroupAction;
  const [state, formAction, pending] = useActionState(action, null);

  useEffect(() => {
    if (state?.success) setOpen(false);
  }, [state]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {isEdit ? (
        <SheetTrigger render={<Button variant="ghost" size="icon-sm" />}>
          <PencilIcon />
          <span className="sr-only">Renombrar</span>
        </SheetTrigger>
      ) : (
        <SheetTrigger render={<Button />}>
          <PlusIcon />
          Nuevo grupo
        </SheetTrigger>
      )}

      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Renombrar grupo" : "Nuevo grupo"}</SheetTitle>
        </SheetHeader>
        <form action={formAction} className="flex flex-col gap-5 p-4 pt-2">
          {isEdit && <input type="hidden" name="id" value={group.id} />}

          <div className="space-y-1.5">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              name="name"
              placeholder="Grupo A"
              defaultValue={group?.name}
              required
            />
          </div>

          {state?.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}

          <div className="flex gap-2 mt-2">
            <Button type="submit" disabled={pending} className="flex-1">
              {pending ? "Guardando…" : isEdit ? "Guardar" : "Crear grupo"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
