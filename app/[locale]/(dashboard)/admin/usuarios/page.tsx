import { createClient } from "@/lib/supabase/server";
import { updateUserRoleAction } from "./actions";

export default async function UsuariosPage() {
  const supabase = await createClient();

  const { data: users } = await supabase
    .from("users")
    .select("id, name, role, created_at")
    .order("created_at");

  const { data: authUser } = await supabase.auth.getUser();

  const fmt = (d: string) =>
    new Intl.DateTimeFormat("es-ES", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(d));

  const roleConfig = {
    admin: { label: "Administrador", class: "bg-[var(--color-pitch)]/10 text-[var(--color-pitch)]" },
    team_manager: { label: "Gestor de equipo", class: "bg-blue-100 text-blue-700" },
  } as const;

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1
          className="text-2xl font-bold text-[var(--color-pitch)] uppercase tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Usuarios
        </h1>
        <p className="text-sm text-[var(--color-dust)] mt-0.5">
          {users?.length ?? 0} usuario{users?.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 text-blue-800 text-sm rounded-sm">
        Los usuarios se crean directamente desde el panel de Supabase. Aquí puedes gestionar roles.
      </div>

      {!users?.length ? (
        <div className="bg-white border border-border p-12 text-center">
          <p className="text-sm text-[var(--color-dust)]">No hay usuarios.</p>
        </div>
      ) : (
        <div className="bg-white border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-[var(--color-stone)]">
                <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-[var(--color-dust)] font-medium">
                  Usuario
                </th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-[var(--color-dust)] font-medium">
                  Rol
                </th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-[var(--color-dust)] font-medium hidden sm:table-cell">
                  Alta
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((user) => {
                const isSelf = user.id === authUser.user?.id;
                const cfg = roleConfig[user.role];
                return (
                  <tr
                    key={user.id}
                    className="hover:bg-[var(--color-stone)]/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-[var(--color-pitch)]">
                        {user.name}
                        {isSelf && (
                          <span className="ml-2 text-xs text-[var(--color-dust)]">
                            (tú)
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-[var(--color-dust)] font-mono">
                        {user.id.slice(0, 8)}…
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-sm ${cfg.class}`}
                      >
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--color-dust)] hidden sm:table-cell">
                      {fmt(user.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!isSelf && (
                        <form action={updateUserRoleAction}>
                          <input type="hidden" name="user_id" value={user.id} />
                          <input
                            type="hidden"
                            name="role"
                            value={
                              user.role === "admin" ? "team_manager" : "admin"
                            }
                          />
                          <button
                            type="submit"
                            className="text-xs text-[var(--color-dust)] hover:text-[var(--color-pitch)] transition-colors"
                          >
                            Cambiar a{" "}
                            {user.role === "admin"
                              ? "gestor de equipo"
                              : "administrador"}
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
