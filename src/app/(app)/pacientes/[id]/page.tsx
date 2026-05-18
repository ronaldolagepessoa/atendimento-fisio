import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CorFisioForm } from "./CorFisioForm";
import { EditarPacienteBtn } from "./EditarPacienteBtn";

type Props = { params: Promise<{ id: string }> };

function formatarCpf(cpf: string | null) {
  if (!cpf) return "—";
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11) return cpf;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export default async function PacientePerfilPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  const isAdmin = session?.user.role === "ADMIN";

  const [paciente, fisios] = await Promise.all([
    prisma.paciente.findUnique({
      where: { id },
      include: { pacienteFisios: true },
    }),
    prisma.fisioterapeuta.findMany({
      where: { ativo: true },
      orderBy: { nome: "asc" },
    }),
  ]);

  if (!paciente) notFound();

  // Serialize Date to ISO string before passing to client component
  const pacienteParaBtn = {
    id: paciente.id,
    nome: paciente.nome,
    telefone: paciente.telefone,
    cpf: paciente.cpf,
    dataNascimento: paciente.dataNascimento
      ? paciente.dataNascimento.toISOString()
      : null,
    observacoes: paciente.observacoes,
  };

  return (
    <div className="p-6 max-w-2xl">
      {/* Cabeçalho */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link
            href="/pacientes"
            className="mb-1 block text-sm text-zinc-500 hover:text-zinc-700"
          >
            ← Pacientes
          </Link>
          <h1 className="text-2xl font-semibold text-zinc-900">{paciente.nome}</h1>
        </div>
        {isAdmin && <EditarPacienteBtn paciente={pacienteParaBtn} />}
      </div>

      {/* Dados gerais */}
      <div className="mb-6 rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Dados Gerais
        </h2>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-zinc-500">Telefone</dt>
            <dd className="font-medium text-zinc-900">{paciente.telefone}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">CPF</dt>
            <dd className="font-medium text-zinc-900">{formatarCpf(paciente.cpf)}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Nascimento</dt>
            <dd className="font-medium text-zinc-900">
              {paciente.dataNascimento
                ? new Date(paciente.dataNascimento).toLocaleDateString("pt-BR")
                : "—"}
            </dd>
          </div>
          {paciente.observacoes && (
            <div className="col-span-2">
              <dt className="text-zinc-500">Observações</dt>
              <dd className="font-medium text-zinc-900 whitespace-pre-line">
                {paciente.observacoes}
              </dd>
            </div>
          )}
        </dl>
      </div>

      {/* Cores por fisioterapeuta */}
      <div className="mb-6 rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Cor na Agenda por Fisioterapeuta
        </h2>
        <div className="space-y-3">
          {fisios.map((fisio) => {
            const rel = paciente.pacienteFisios.find((pf) => pf.fisioId === fisio.id);
            const cor = rel?.corPersonalizada ?? fisio.cor;
            return (
              <div key={fisio.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className="inline-block h-4 w-4 rounded-full"
                    style={{ backgroundColor: fisio.cor }}
                    title="Cor padrão do fisio"
                  />
                  <span className="text-sm text-zinc-700">{fisio.nome}</span>
                </div>
                <CorFisioForm
                  pacienteId={id}
                  fisioId={fisio.id}
                  corAtual={cor}
                  isAdmin={isAdmin}
                />
              </div>
            );
          })}
          {fisios.length === 0 && (
            <p className="text-sm text-zinc-500">Nenhum fisioterapeuta ativo.</p>
          )}
        </div>
      </div>

      {/* Placeholder para histórico */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 text-center text-sm text-zinc-400">
        Histórico de sessões e pagamentos — disponível em breve.
      </div>
    </div>
  );
}
