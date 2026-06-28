"use client";

import { useActionState } from "react";
import { generateCalendarAction } from "./actions";
import { Button } from "@/components/ui/button";
import { CalendarPlusIcon } from "lucide-react";

export function GenerateCalendarButton({ groupId }: { groupId: string }) {
  const [state, formAction, pending] = useActionState(generateCalendarAction, null);

  return (
    <form action={formAction} className="p-3 border-t border-border bg-[var(--color-stone)]/30 flex flex-col gap-2.5">
      <input type="hidden" name="group_id" value={groupId} />

      {/* Options */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        <label className="flex items-center gap-1.5 text-xs text-[var(--color-dust)] cursor-pointer select-none">
          <input type="checkbox" name="double_rr" value="1" className="rounded border-border" />
          Ida y vuelta
        </label>
        <label className="flex items-center gap-1.5 text-xs text-[var(--color-dust)] cursor-pointer select-none">
          <input type="checkbox" name="referee_rotation" value="1" defaultChecked className="rounded border-border" />
          Equipo árbitro
        </label>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-xs text-[var(--color-dust)] shrink-0">
          Máx. partidos / jornada
        </label>
        <input
          type="number"
          name="max_per_round"
          min={1}
          max={20}
          defaultValue={3}
          className="w-14 h-7 rounded border border-input bg-background px-2 text-xs text-center shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      <Button
        type="submit"
        size="sm"
        variant="outline"
        disabled={pending}
        className="w-full gap-1.5 text-xs"
      >
        <CalendarPlusIcon className="w-3.5 h-3.5 shrink-0" />
        {pending ? "Generando…" : "Generar calendario"}
      </Button>

      {state?.error && (
        <p className="text-xs text-destructive">{state.error}</p>
      )}
      {state?.success && (
        <p className="text-xs text-green-700">Calendario generado correctamente.</p>
      )}
    </form>
  );
}
