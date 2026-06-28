"use client";

import { useActionState, useEffect, useState } from "react";
import { createMatchAction } from "./actions";
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

export interface GroupOption {
  id: string;
  name: string;
  seasonTeams: { id: string; teamName: string }[];
}

export interface SeasonTeamOption {
  id: string;
  teamName: string;
}

interface MatchFormProps {
  groups: GroupOption[];
  allSeasonTeams: SeasonTeamOption[];
}

const PHASES = [
  { value: "group", label: "Fase de Grupos" },
  { value: "upper_playoff", label: "Liguilla Superior" },
  { value: "lower_playoff", label: "Liguilla Inferior" },
] as const;

export function CreateMatchForm({ groups, allSeasonTeams }: MatchFormProps) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<"group" | "upper_playoff" | "lower_playoff">("group");
  const [groupId, setGroupId] = useState(groups[0]?.id ?? "");
  const [state, formAction, pending] = useActionState(createMatchAction, null);

  useEffect(() => {
    if (state?.success) setOpen(false);
  }, [state]);

  useEffect(() => {
    if (!open) {
      setPhase("group");
      setGroupId(groups[0]?.id ?? "");
    }
  }, [open, groups]);

  const teamsForMatch =
    phase === "group"
      ? (groups.find((g) => g.id === groupId)?.seasonTeams ?? [])
      : allSeasonTeams;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button />}>
        <PlusIcon />
        Nuevo partido
      </SheetTrigger>

      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Nuevo partido</SheetTitle>
        </SheetHeader>
        <form key={String(open)} action={formAction} className="flex flex-col gap-4 p-4 pt-2">
          {/* Phase */}
          <div className="space-y-1.5">
            <Label htmlFor="phase">Fase</Label>
            <select
              id="phase"
              name="phase"
              required
              value={phase}
              onChange={(e) =>
                setPhase(e.target.value as typeof phase)
              }
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {PHASES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* Round */}
          <div className="space-y-1.5">
            <Label htmlFor="round">Jornada / Ronda</Label>
            <Input
              id="round"
              name="round"
              type="number"
              min={1}
              defaultValue={1}
              required
            />
          </div>

          {/* Group selector (only for group stage) */}
          {phase === "group" && (
            <div className="space-y-1.5">
              <Label htmlFor="group_id">Grupo</Label>
              {groups.length === 0 ? (
                <p className="text-sm text-[var(--color-dust)]">
                  No hay grupos. Crea grupos primero.
                </p>
              ) : (
                <select
                  id="group_id"
                  name="group_id"
                  required
                  value={groupId}
                  onChange={(e) => setGroupId(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Home team */}
          <div className="space-y-1.5">
            <Label htmlFor="home_team_id">Equipo local</Label>
            <select
              id="home_team_id"
              name="home_team_id"
              required
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">Seleccionar…</option>
              {teamsForMatch.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.teamName}
                </option>
              ))}
            </select>
          </div>

          {/* Away team */}
          <div className="space-y-1.5">
            <Label htmlFor="away_team_id">Equipo visitante</Label>
            <select
              id="away_team_id"
              name="away_team_id"
              required
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">Seleccionar…</option>
              {teamsForMatch.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.teamName}
                </option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <Label htmlFor="scheduled_date">
              Fecha{" "}
              <span className="text-[var(--color-dust)] font-normal">(opcional)</span>
            </Label>
            <Input id="scheduled_date" name="scheduled_date" type="date" />
          </div>

          {state?.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}

          <div className="flex gap-2 mt-2">
            <Button type="submit" disabled={pending} className="flex-1">
              {pending ? "Creando…" : "Crear partido"}
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
