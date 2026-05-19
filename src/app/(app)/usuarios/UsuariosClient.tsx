"use client";

import { useState, useTransition } from "react";
import { toggleUserAtivo, deleteRole } from "./actions";
import { cn } from "@/lib/utils";
import { UserModal, type UserSer } from "./UserModal";
import { RoleModal, type RoleSer } from "./RoleModal";

type Props = {
  users: UserSer[];
  roles: RoleSer[];
  currentUserId: string;
};

type Tab = "usuarios" | "perfis";

export function UsuariosClient({ users, roles, currentUserId }: Props) {
  const [tab, setTab] = useState<Tab>("usuarios");
  const [userModal, setUserModal] = useState<{ open: boolean; user?: UserSer }>({ open: false });
  const [roleModal, setRoleModal] = useState<{ open: boolean; role?: RoleSer }>({ open: false });
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleToggleUser = (id: string) => {
    startTransition(async () => {
      const res = await toggleUserAtivo(id);
      if ("error" in res) setFeedback(res.error ?? null);
    });
  };

  const handleDeleteRole = (id: string, nome: string) => {
    if (!confirm(`Excluir o perfil "${nome}"?`)) return;
    startTransition(async () => {
      const res = await deleteRole(id);
      if ("error" in res) setFeedback(res.error ?? null);
    });
  };

  return (
    <div className="p-6 max-w-5xl">
      <h1 className="text-2xl font-semibold text-zinc-900 mb-6">Usuários</h1>

      {feedback && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700 flex justify-between">
          {feedback}
          <button onClick={() => setFeedback(null)} className="text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-zinc-200 mb-6">
        <button
          onClick={() => setTab("usuarios")}
          className={cn(
            "px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors",
            tab === "usuarios"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-zinc-500 hover:text-zinc-700"
          )}
        >
          Usuários
        </button>
        <button
          onClick={() => setTab("perfis")}
          className={cn(
            "px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors",
            tab === "perfis"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-zinc-500 hover:text-zinc-700"
          )}
        >
          Perfis de Acesso
        </button>
      </div>

      {/* Tab: Usuários */}
      {tab === "usuarios" && (
        <div>
          <div className="mb-4 flex justify-end">
            <button
              onClick={() => setUserModal({ open: true })}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              + Novo Usuário
            </button>
          </div>
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-zinc-600">Nome</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-600">Email</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-600">Perfil</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-600">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-600">Ações</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isCurrentUser = u.id === currentUserId;
                  const isAdmin = u.roleNome === "ADMIN";
                  return (
                    <tr key={u.id} className="border-t border-zinc-100">
                      <td className="px-4 py-3 text-zinc-800 font-medium">{u.name}</td>
                      <td className="px-4 py-3 text-zinc-600">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "inline-block rounded-full px-2 py-0.5 text-xs font-medium",
                          isAdmin ? "bg-indigo-100 text-indigo-700" : "bg-zinc-100 text-zinc-600"
                        )}>
                          {u.roleNome}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "inline-block rounded-full px-2 py-0.5 text-xs font-medium",
                          u.ativo ? "bg-green-100 text-green-700" : "bg-zinc-100 text-zinc-400"
                        )}>
                          {u.ativo ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setUserModal({ open: true, user: u })}
                            className="text-xs text-indigo-600 hover:text-indigo-800"
                          >
                            Editar
                          </button>
                          {!isAdmin && !isCurrentUser && (
                            <button
                              onClick={() => handleToggleUser(u.id)}
                              disabled={isPending}
                              className="text-xs text-zinc-500 hover:text-zinc-700"
                            >
                              {u.ativo ? "Desativar" : "Ativar"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Perfis */}
      {tab === "perfis" && (
        <div>
          <div className="mb-4 flex justify-end">
            <button
              onClick={() => setRoleModal({ open: true })}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              + Novo Perfil
            </button>
          </div>
          <div className="space-y-3">
            {roles.map((r) => {
              const isAdminRole = r.sistema && r.nome === "ADMIN";
              return (
                <div key={r.id} className="rounded-xl border border-zinc-200 bg-white p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-zinc-900">{r.nome}</span>
                      {r.sistema && (
                        <span className="text-xs bg-zinc-100 text-zinc-500 rounded-full px-2 py-0.5">sistema</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {!isAdminRole && (
                        <button
                          onClick={() => setRoleModal({ open: true, role: r })}
                          className="text-xs text-indigo-600 hover:text-indigo-800"
                        >
                          Editar
                        </button>
                      )}
                      {!r.sistema && (
                        <button
                          onClick={() => handleDeleteRole(r.id, r.nome)}
                          disabled={isPending}
                          className="text-xs text-red-500 hover:text-red-700"
                        >
                          Excluir
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-zinc-500">
                    {r.userCount} usuário(s) · {isAdminRole ? "Acesso total" : r.permissoes.length === 0 ? "Nenhuma permissão" : r.permissoes.join(", ")}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modals */}
      {userModal.open && (
        <UserModal
          user={userModal.user}
          roles={roles}
          onClose={() => setUserModal({ open: false })}
        />
      )}
      {roleModal.open && (
        <RoleModal
          role={roleModal.role}
          onClose={() => setRoleModal({ open: false })}
        />
      )}
    </div>
  );
}
