"use client";

import { useActionState, useEffect } from "react";
import { createRole, updateRole } from "./actions";
import { cn } from "@/lib/utils";

export type RoleSer = {
  id: string;
  nome: string;
  permissoes: string[];
  sistema: boolean;
  userCount: number;
};

const ROTAS = [
  { prefix: "/agenda", label: "Agenda" },
  { prefix: "/pacientes", label: "Pacientes" },
  { prefix: "/taping", label: "Taping" },
  { prefix: "/pacotes", label: "Pacotes" },
  { prefix: "/pagamentos", label: "Pagamentos" },
  { prefix: "/procedimentos", label: "Procedimentos" },
  { prefix: "/fisios", label: "Fisioterapeutas" },
  { prefix: "/relatorios", label: "Relatórios" },
];

type Props = {
  role?: RoleSer;
  onClose: () => void;
};

type ActionState = { error: string; success?: undefined } | { success: boolean; error?: undefined } | null;

export function RoleModal({ role, onClose }: Props) {
  const baseAction = role ? updateRole.bind(null, role.id) : createRole;
  const action = (_state: ActionState, formData: FormData) => baseAction(formData);
  const [state, formAction, pending] = useActionState(action, null);

  const isAdminRole = role?.sistema && role.nome === "ADMIN";

  useEffect(() => {
    if (state && "success" in state) onClose();
  }, [state, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900">
          {role ? "Editar Perfil" : "Novo Perfil de Acesso"}
        </h2>

        <form action={formAction} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">
              Nome <span className="text-red-500">*</span>
            </label>
            <input
              name="nome"
              defaultValue={role?.nome}
              required
              disabled={role?.sistema}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-zinc-50 disabled:text-zinc-400"
            />
            {role?.sistema && (
              <input type="hidden" name="nome" value={role.nome} />
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-700">
              Permissões de acesso
            </label>
            {isAdminRole ? (
              <p className="rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-700">
                O perfil ADMIN tem acesso total ao sistema.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {ROTAS.map((rota) => (
                  <label
                    key={rota.prefix}
                    className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm cursor-pointer hover:bg-zinc-50"
                  >
                    <input
                      type="checkbox"
                      name="permissoes"
                      value={rota.prefix}
                      defaultChecked={role?.permissoes.includes(rota.prefix)}
                      className="accent-indigo-600"
                    />
                    {rota.label}
                  </label>
                ))}
              </div>
            )}
          </div>

          {state && "error" in state && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {state.error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pending || isAdminRole}
              className={cn(
                "rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700",
                (pending || isAdminRole) && "cursor-not-allowed opacity-60"
              )}
            >
              {pending ? "Salvando…" : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
