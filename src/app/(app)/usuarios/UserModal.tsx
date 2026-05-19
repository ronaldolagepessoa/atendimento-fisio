"use client";

import { useActionState, useEffect, useState } from "react";
import { createUser, updateUser } from "./actions";
import { cn } from "@/lib/utils";
import type { RoleSer } from "./RoleModal";

export type UserSer = {
  id: string;
  name: string;
  email: string;
  ativo: boolean;
  roleId: string;
  roleNome: string;
  fisioId: string | null;
  cref: string | null;
  cor: string | null;
};

type Props = {
  user?: UserSer;
  roles: RoleSer[];
  onClose: () => void;
};

type ActionState = { error: string; success?: undefined } | { success: boolean; error?: undefined } | null;

const FISIO_ROLE_ID = "role-fisio";

export function UserModal({ user, roles, onClose }: Props) {
  const baseAction = user ? updateUser.bind(null, user.id) : createUser;
  const action = (_state: ActionState, formData: FormData) => baseAction(formData);
  const [state, formAction, pending] = useActionState(action, null);
  const [selectedRoleId, setSelectedRoleId] = useState(user?.roleId ?? "");

  useEffect(() => {
    if (state && "success" in state) onClose();
  }, [state, onClose]);

  const isFisio = selectedRoleId === FISIO_ROLE_ID;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900">
          {user ? "Editar Usuário" : "Novo Usuário"}
        </h2>

        <form action={formAction} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">
              Nome <span className="text-red-500">*</span>
            </label>
            <input
              name="name"
              defaultValue={user?.name}
              required
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              name="email"
              type="email"
              defaultValue={user?.email}
              required
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">
              Perfil de acesso <span className="text-red-500">*</span>
            </label>
            <select
              name="roleId"
              defaultValue={user?.roleId}
              required
              onChange={(e) => setSelectedRoleId(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Selecione um perfil</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nome}
                </option>
              ))}
            </select>
          </div>

          {isFisio && (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">CREF</label>
                <input
                  name="cref"
                  defaultValue={user?.cref ?? ""}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">
                  Cor na agenda
                </label>
                <input
                  name="cor"
                  type="color"
                  defaultValue={user?.cor ?? "#6366f1"}
                  className="h-10 w-full cursor-pointer rounded-lg border border-zinc-300 p-1"
                />
              </div>
            </>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">
              Senha {!user && <span className="text-red-500">*</span>}
            </label>
            <input
              name="senha"
              type="password"
              required={!user}
              placeholder={user ? "Deixe em branco para manter a senha atual" : ""}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
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
              disabled={pending}
              className={cn(
                "rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700",
                pending && "cursor-not-allowed opacity-60"
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
