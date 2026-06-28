"use client";

import { useActionState, useEffect, useState } from "react";
import { createPublicationAction, updatePublicationAction } from "./actions";
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

interface Publication {
  id: string;
  title_es: string;
  title_eu: string;
  body_es: string;
  body_eu: string;
}

interface PublicationFormProps {
  publication?: Publication;
}

export function PublicationForm({ publication }: PublicationFormProps) {
  const [open, setOpen] = useState(false);
  const isEdit = !!publication;
  const action = isEdit ? updatePublicationAction : createPublicationAction;
  const [state, formAction, pending] = useActionState(action, null);

  useEffect(() => {
    if (state?.success) setOpen(false);
  }, [state]);

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
          Nueva publicación
        </SheetTrigger>
      )}

      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {isEdit ? "Editar publicación" : "Nueva publicación"}
          </SheetTitle>
        </SheetHeader>
        <form action={formAction} className="flex flex-col gap-5 p-4 pt-2">
          {isEdit && <input type="hidden" name="id" value={publication.id} />}

          <fieldset className="space-y-3 border border-border rounded-sm p-3">
            <legend className="text-xs font-medium text-[var(--color-dust)] px-1 uppercase tracking-widest">
              Castellano
            </legend>
            <div className="space-y-1.5">
              <Label htmlFor="title_es">Título</Label>
              <Input
                id="title_es"
                name="title_es"
                defaultValue={publication?.title_es}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="body_es">Contenido</Label>
              <textarea
                id="body_es"
                name="body_es"
                rows={5}
                defaultValue={publication?.body_es}
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
              />
            </div>
          </fieldset>

          <fieldset className="space-y-3 border border-border rounded-sm p-3">
            <legend className="text-xs font-medium text-[var(--color-dust)] px-1 uppercase tracking-widest">
              Euskera
            </legend>
            <div className="space-y-1.5">
              <Label htmlFor="title_eu">Izenburua</Label>
              <Input
                id="title_eu"
                name="title_eu"
                defaultValue={publication?.title_eu}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="body_eu">Edukia</Label>
              <textarea
                id="body_eu"
                name="body_eu"
                rows={5}
                defaultValue={publication?.body_eu}
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
              />
            </div>
          </fieldset>

          {state?.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}

          <div className="flex gap-2 mt-2">
            <Button type="submit" disabled={pending} className="flex-1">
              {pending ? "Guardando…" : isEdit ? "Guardar cambios" : "Publicar"}
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
