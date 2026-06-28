"use client";

import { useActionState, useEffect, useRef, useState } from "react";
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
import { PlusIcon, PencilIcon, UploadIcon } from "lucide-react";
import Image from "next/image";

interface Team {
  id: string;
  name: string;
  primary_color: string | null;
  secondary_color: string | null;
  founded_year: number | null;
  shield_url: string | null;
}

interface TeamFormProps {
  team?: Team;
}

export function TeamForm({ team }: TeamFormProps) {
  const [open, setOpen] = useState(false);
  const action = team ? updateTeamAction : createTeamAction;
  const [state, formAction, pending] = useActionState(action, null);
  const [preview, setPreview] = useState<string | null>(team?.shield_url ?? null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state?.success) setOpen(false);
  }, [state]);

  useEffect(() => {
    if (!open) {
      setPreview(team?.shield_url ?? null);
    }
  }, [open, team?.shield_url]);

  const isEdit = !!team;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
  }

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
        {open && <form
          key={`${team?.name ?? ""}:${team?.founded_year ?? ""}`}
          action={formAction}
          className="flex flex-col gap-5 p-4 pt-2 overflow-y-auto"
        >
          {isEdit && <input type="hidden" name="id" value={team.id} />}

          {/* Escudo / Logo */}
          <div className="space-y-2">
            <Label>Escudo / Logo</Label>
            <div
              className="relative flex items-center justify-center w-24 h-24 border-2 border-dashed border-border rounded-sm bg-[var(--color-stone)] cursor-pointer hover:border-[var(--color-pitch)] transition-colors overflow-hidden"
              onClick={() => fileRef.current?.click()}
            >
              {preview ? (
                <Image
                  src={preview}
                  alt="Escudo"
                  fill
                  className="object-contain p-1"
                  unoptimized
                />
              ) : (
                <div className="flex flex-col items-center gap-1 text-[var(--color-dust)]">
                  <UploadIcon className="w-6 h-6" />
                  <span className="text-[10px] uppercase tracking-wide">Subir</span>
                </div>
              )}
            </div>
            <input
              ref={fileRef}
              id="shield"
              name="shield"
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handleFileChange}
            />
            <p className="text-xs text-[var(--color-dust)]">PNG, SVG o JPG · máx. 2 MB</p>
          </div>

          {/* Nombre */}
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

          {/* Año de fundación */}
          <div className="space-y-1.5">
            <Label htmlFor="founded_year">
              Año de fundación{" "}
              <span className="text-[var(--color-dust)] font-normal">(opcional)</span>
            </Label>
            <Input
              id="founded_year"
              name="founded_year"
              type="number"
              min={1800}
              max={2100}
              placeholder="1987"
              defaultValue={team?.founded_year ?? ""}
            />
          </div>

          {/* Colores */}
          <div className="space-y-3">
            <Label>Colores de camiseta</Label>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <input
                  id="primary_color"
                  name="primary_color"
                  type="color"
                  defaultValue={team?.primary_color ?? "#1a1a1a"}
                  className="w-9 h-9 rounded border border-border cursor-pointer p-0.5 bg-white"
                />
                <span className="text-xs text-[var(--color-dust)]">Principal</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="secondary_color"
                  name="secondary_color"
                  type="color"
                  defaultValue={team?.secondary_color ?? "#ffffff"}
                  className="w-9 h-9 rounded border border-border cursor-pointer p-0.5 bg-white"
                />
                <span className="text-xs text-[var(--color-dust)]">Secundario</span>
              </div>
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
        </form>}
      </SheetContent>
    </Sheet>
  );
}
