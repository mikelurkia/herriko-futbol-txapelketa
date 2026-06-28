"use client";

import { useActionState, useEffect, useState } from "react";
import {
  addPlayerAction,
  registerExistingPlayerAction,
  updatePlayerAction,
} from "./actions";
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

interface AvailablePlayer {
  id: string;
  first_name: string;
  last_name: string;
}

interface Registration {
  id: string;
  jersey_number: number | null;
  players: { id: string; first_name: string; last_name: string };
}

// ── Edit mode ────────────────────────────────────────────────────────────────

interface EditFormProps {
  registration: Registration;
  seasonTeamId: string;
}

export function EditPlayerForm({ registration, seasonTeamId }: EditFormProps) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(updatePlayerAction, null);

  useEffect(() => {
    if (state?.success) setOpen(false);
  }, [state]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="ghost" size="icon-sm" />}>
        <PencilIcon />
        <span className="sr-only">Editar</span>
      </SheetTrigger>

      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Editar jugador</SheetTitle>
        </SheetHeader>
        {open && <form
          key={`${registration.players.first_name}:${registration.players.last_name}:${registration.jersey_number ?? ""}`}
          action={formAction}
          className="flex flex-col gap-5 p-4 pt-2"
        >
          <input type="hidden" name="player_id" value={registration.players.id} />
          <input type="hidden" name="registration_id" value={registration.id} />

          <div className="space-y-1.5">
            <Label htmlFor="edit_first_name">Nombre</Label>
            <Input
              id="edit_first_name"
              name="first_name"
              defaultValue={registration.players.first_name}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit_last_name">Apellidos</Label>
            <Input
              id="edit_last_name"
              name="last_name"
              defaultValue={registration.players.last_name}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit_jersey">
              Dorsal{" "}
              <span className="text-[var(--color-dust)] font-normal">(opcional)</span>
            </Label>
            <Input
              id="edit_jersey"
              name="jersey_number"
              type="number"
              min={1}
              max={99}
              placeholder="—"
              defaultValue={registration.jersey_number ?? ""}
            />
          </div>

          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

          <div className="flex gap-2 mt-2">
            <Button type="submit" disabled={pending} className="flex-1">
              {pending ? "Guardando…" : "Guardar cambios"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
          </div>
        </form>}
      </SheetContent>
    </Sheet>
  );
}

// ── Add mode (existing or new) ────────────────────────────────────────────────

interface AddFormProps {
  seasonTeamId: string;
  availablePlayers: AvailablePlayer[];
}

export function AddPlayerForm({ seasonTeamId, availablePlayers }: AddFormProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"existing" | "new">("existing");

  const [existingState, existingAction, existingPending] = useActionState(
    registerExistingPlayerAction,
    null
  );
  const [newState, newAction, newPending] = useActionState(addPlayerAction, null);

  useEffect(() => {
    if (existingState?.success || newState?.success) setOpen(false);
  }, [existingState, newState]);

  // Reset mode when sheet closes
  useEffect(() => {
    if (!open) setMode("existing");
  }, [open]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="outline" size="sm" />}>
        <PlusIcon />
        Añadir
      </SheetTrigger>

      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Añadir jugador</SheetTitle>
        </SheetHeader>

        {/* Mode tabs */}
        <div className="flex border-b border-border mx-4 mt-1 mb-1">
          <button
            type="button"
            onClick={() => setMode("existing")}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              mode === "existing"
                ? "border-[var(--color-pitch)] text-[var(--color-pitch)]"
                : "border-transparent text-[var(--color-dust)] hover:text-[var(--color-pitch)]"
            }`}
          >
            Jugador existente
          </button>
          <button
            type="button"
            onClick={() => setMode("new")}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              mode === "new"
                ? "border-[var(--color-pitch)] text-[var(--color-pitch)]"
                : "border-transparent text-[var(--color-dust)] hover:text-[var(--color-pitch)]"
            }`}
          >
            Nuevo jugador
          </button>
        </div>

        {mode === "existing" ? (
          <form action={existingAction} className="flex flex-col gap-5 p-4 pt-3">
            <input type="hidden" name="season_team_id" value={seasonTeamId} />

            <div className="space-y-1.5">
              <Label htmlFor="player_id">Jugador</Label>
              {availablePlayers.length === 0 ? (
                <p className="text-sm text-[var(--color-dust)]">
                  No hay jugadores disponibles. Crea un nuevo jugador.
                </p>
              ) : (
                <select
                  id="player_id"
                  name="player_id"
                  required
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">Seleccionar jugador…</option>
                  {availablePlayers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.last_name}, {p.first_name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="existing_jersey">
                Dorsal{" "}
                <span className="text-[var(--color-dust)] font-normal">(opcional)</span>
              </Label>
              <Input
                id="existing_jersey"
                name="jersey_number"
                type="number"
                min={1}
                max={99}
                placeholder="—"
              />
            </div>

            {existingState?.error && (
              <p className="text-sm text-destructive">{existingState.error}</p>
            )}

            <div className="flex gap-2 mt-2">
              <Button
                type="submit"
                disabled={existingPending || availablePlayers.length === 0}
                className="flex-1"
              >
                {existingPending ? "Inscribiendo…" : "Inscribir"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        ) : (
          <form action={newAction} className="flex flex-col gap-5 p-4 pt-3">
            <input type="hidden" name="season_team_id" value={seasonTeamId} />

            <div className="space-y-1.5">
              <Label htmlFor="new_first_name">Nombre</Label>
              <Input
                id="new_first_name"
                name="first_name"
                placeholder="Jon"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="new_last_name">Apellidos</Label>
              <Input
                id="new_last_name"
                name="last_name"
                placeholder="Etxebarria"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="new_jersey">
                Dorsal{" "}
                <span className="text-[var(--color-dust)] font-normal">(opcional)</span>
              </Label>
              <Input
                id="new_jersey"
                name="jersey_number"
                type="number"
                min={1}
                max={99}
                placeholder="—"
              />
            </div>

            {newState?.error && (
              <p className="text-sm text-destructive">{newState.error}</p>
            )}

            <div className="flex gap-2 mt-2">
              <Button type="submit" disabled={newPending} className="flex-1">
                {newPending ? "Creando…" : "Crear e inscribir"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}
