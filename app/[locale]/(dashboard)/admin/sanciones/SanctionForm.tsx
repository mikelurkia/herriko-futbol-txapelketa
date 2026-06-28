"use client";

import { useActionState, useEffect, useState } from "react";
import { createSanctionAction } from "./actions";
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

export interface PlayerOption {
  playerId: string;
  label: string; // "Apellido, Nombre — Equipo"
}

export interface MatchOption {
  id: string;
  label: string; // "Grupo A J1 — Ama vs Gaztedi"
}

interface SanctionFormProps {
  players: PlayerOption[];
  matches: MatchOption[];
}

const REASONS = [
  { value: "yellow_accumulation", label: "Acumulación de amarillas" },
  { value: "red_card", label: "Tarjeta roja directa" },
  { value: "additional", label: "Sanción adicional" },
] as const;

export function SanctionForm({ players, matches }: SanctionFormProps) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createSanctionAction, null);

  useEffect(() => {
    if (state?.success) setOpen(false);
  }, [state]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button />}>
        <PlusIcon />
        Nueva sanción
      </SheetTrigger>

      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Nueva sanción</SheetTitle>
        </SheetHeader>
        <form action={formAction} className="flex flex-col gap-4 p-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="player_id">Jugador</Label>
            {players.length === 0 ? (
              <p className="text-sm text-[var(--color-dust)]">
                No hay jugadores registrados.
              </p>
            ) : (
              <select
                id="player_id"
                name="player_id"
                required
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">Seleccionar jugador…</option>
                {players.map((p) => (
                  <option key={p.playerId} value={p.playerId}>
                    {p.label}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="triggering_match_id">Partido que origina la sanción</Label>
            {matches.length === 0 ? (
              <p className="text-sm text-[var(--color-dust)]">
                No hay partidos jugados.
              </p>
            ) : (
              <select
                id="triggering_match_id"
                name="triggering_match_id"
                required
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">Seleccionar partido…</option>
                {matches.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reason">Motivo</Label>
            <select
              id="reason"
              name="reason"
              required
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="matches_suspended">Partidos de sanción</Label>
            <Input
              id="matches_suspended"
              name="matches_suspended"
              type="number"
              min={1}
              defaultValue={1}
              required
            />
          </div>

          {state?.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}

          <div className="flex gap-2 mt-2">
            <Button
              type="submit"
              disabled={pending || players.length === 0 || matches.length === 0}
              className="flex-1"
            >
              {pending ? "Guardando…" : "Crear sanción"}
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
