"use client";

import { useActionState, useEffect, useState } from "react";
import { registerResultAction, updateMatchDateAction, deleteMatchAction } from "./actions";
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
import { ClipboardCheckIcon, CalendarIcon, Trash2Icon } from "lucide-react";

interface Match {
  id: string;
  status: "pending" | "played";
  home_score: number | null;
  away_score: number | null;
  home_penalties: number | null;
  away_penalties: number | null;
  scheduled_date: string | null;
  homeTeamName: string;
  awayTeamName: string;
}

// ── Result sheet ──────────────────────────────────────────────────────────────

export function ResultForm({ match }: { match: Match }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(registerResultAction, null);

  useEffect(() => {
    if (state?.success) setOpen(false);
  }, [state]);

  const isDraw =
    match.home_score !== null &&
    match.away_score !== null &&
    match.home_score === match.away_score &&
    match.status === "played";

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant={match.status === "played" ? "ghost" : "outline"}
            size="sm"
          />
        }
      >
        <ClipboardCheckIcon />
        {match.status === "played" ? "Editar resultado" : "Resultado"}
      </SheetTrigger>

      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Resultado</SheetTitle>
        </SheetHeader>
        <form action={formAction} className="flex flex-col gap-5 p-4 pt-2">
          <input type="hidden" name="match_id" value={match.id} />

          <div className="text-center text-sm text-[var(--color-dust)] py-1">
            {match.homeTeamName} vs {match.awayTeamName}
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="home_score">{match.homeTeamName}</Label>
              <Input
                id="home_score"
                name="home_score"
                type="number"
                min={0}
                defaultValue={match.home_score ?? ""}
                required
                className="text-center text-lg font-bold"
              />
            </div>
            <span className="text-[var(--color-dust)] mt-5">–</span>
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="away_score">{match.awayTeamName}</Label>
              <Input
                id="away_score"
                name="away_score"
                type="number"
                min={0}
                defaultValue={match.away_score ?? ""}
                required
                className="text-center text-lg font-bold"
              />
            </div>
          </div>

          <div className="border-t border-border pt-4 space-y-2">
            <p className="text-xs text-[var(--color-dust)]">
              Penaltis (solo si hubo tanda)
            </p>
            <div className="flex items-center gap-4">
              <Input
                name="home_penalties"
                type="number"
                min={0}
                placeholder="—"
                defaultValue={match.home_penalties ?? ""}
                className="text-center"
              />
              <span className="text-[var(--color-dust)]">–</span>
              <Input
                name="away_penalties"
                type="number"
                min={0}
                placeholder="—"
                defaultValue={match.away_penalties ?? ""}
                className="text-center"
              />
            </div>
          </div>

          {state?.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}

          <div className="flex gap-2 mt-2">
            <Button type="submit" disabled={pending} className="flex-1">
              {pending ? "Guardando…" : "Guardar resultado"}
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

// ── Date edit sheet ───────────────────────────────────────────────────────────

export function EditDateForm({ match }: { match: Match }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(updateMatchDateAction, null);

  useEffect(() => {
    if (state?.success) setOpen(false);
  }, [state]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="ghost" size="icon-sm" />}>
        <CalendarIcon />
        <span className="sr-only">Cambiar fecha</span>
      </SheetTrigger>

      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Cambiar fecha</SheetTitle>
        </SheetHeader>
        <form action={formAction} className="flex flex-col gap-5 p-4 pt-2">
          <input type="hidden" name="match_id" value={match.id} />

          <div className="space-y-1.5">
            <Label htmlFor="edit_date">Fecha</Label>
            <Input
              id="edit_date"
              name="scheduled_date"
              type="date"
              defaultValue={match.scheduled_date ?? ""}
            />
          </div>

          {state?.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}

          <div className="flex gap-2 mt-2">
            <Button type="submit" disabled={pending} className="flex-1">
              {pending ? "Guardando…" : "Guardar"}
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

// ── Delete button ─────────────────────────────────────────────────────────────

export function DeleteMatchButton({ matchId }: { matchId: string }) {
  return (
    <form action={deleteMatchAction}>
      <input type="hidden" name="match_id" value={matchId} />
      <Button
        type="submit"
        variant="ghost"
        size="icon-sm"
        className="text-[var(--color-dust)] hover:text-destructive"
      >
        <Trash2Icon />
        <span className="sr-only">Eliminar</span>
      </Button>
    </form>
  );
}
