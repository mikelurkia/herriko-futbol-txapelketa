"use client";

import { useActionState, useEffect, useState } from "react";
import { addMatchEventAction } from "./actions";
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

export interface TeamOption {
  seasonTeamId: string;
  teamName: string;
  players: { id: string; firstName: string; lastName: string }[];
}

interface EventFormProps {
  matchId: string;
  homeTeam: TeamOption;
  awayTeam: TeamOption;
}

const EVENT_TYPES = [
  { value: "goal", label: "⚽ Gol" },
  { value: "yellow_card", label: "🟨 Tarjeta amarilla" },
  { value: "red_card", label: "🟥 Tarjeta roja" },
] as const;

export function EventForm({ matchId, homeTeam, awayTeam }: EventFormProps) {
  const [open, setOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<"home" | "away">("home");
  const [state, formAction, pending] = useActionState(addMatchEventAction, null);

  useEffect(() => {
    if (state?.success) setOpen(false);
  }, [state]);

  useEffect(() => {
    if (!open) setSelectedTeam("home");
  }, [open]);

  const team = selectedTeam === "home" ? homeTeam : awayTeam;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="outline" size="sm" />}>
        <PlusIcon />
        Añadir evento
      </SheetTrigger>

      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Nuevo evento</SheetTitle>
        </SheetHeader>
        <form key={String(open)} action={formAction} className="flex flex-col gap-4 p-4 pt-2">
          <input type="hidden" name="match_id" value={matchId} />
          <input type="hidden" name="season_team_id" value={team.seasonTeamId} />

          <div className="space-y-1.5">
            <Label htmlFor="event_type">Tipo</Label>
            <select
              id="event_type"
              name="type"
              required
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {EVENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label>Equipo</Label>
            <div className="flex gap-2">
              {(["home", "away"] as const).map((side) => {
                const t = side === "home" ? homeTeam : awayTeam;
                return (
                  <button
                    key={side}
                    type="button"
                    onClick={() => setSelectedTeam(side)}
                    className={`flex-1 py-2 text-sm border rounded-sm transition-colors ${
                      selectedTeam === side
                        ? "border-[var(--color-pitch)] bg-[var(--color-pitch)] text-white"
                        : "border-border text-[var(--color-dust)] hover:border-[var(--color-pitch)]"
                    }`}
                  >
                    {t.teamName}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="player_id">Jugador</Label>
            <select
              key={selectedTeam}
              id="player_id"
              name="player_id"
              required
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">Seleccionar jugador…</option>
              {team.players.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.lastName}, {p.firstName}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="minute">
              Minuto{" "}
              <span className="text-[var(--color-dust)] font-normal">(opcional)</span>
            </Label>
            <Input
              id="minute"
              name="minute"
              type="number"
              min={1}
              max={120}
              placeholder="—"
            />
          </div>

          {state?.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}

          <div className="flex gap-2 mt-2">
            <Button type="submit" disabled={pending} className="flex-1">
              {pending ? "Guardando…" : "Añadir"}
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
