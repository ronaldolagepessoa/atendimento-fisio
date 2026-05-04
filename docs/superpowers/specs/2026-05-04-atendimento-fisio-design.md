# Design Spec — Sistema de Gestão de Clínica de Fisioterapia

**Data:** 2026-05-04
**Status:** Aprovado

---

## Contexto

Ferramenta web para uma clínica de fisioterapia com 3 fisioterapeutas e ~100 pacientes ativos. Operada por recepcionista/admin e pelos próprios fisioterapeutas. Pacientes não acessam o sistema — apenas recebem mensagens automáticas via WhatsApp.

---

## Stack Técnica

| Camada | Tecnologia |
|---|---|
| Frontend + API | Next.js 15 (App Router, TypeScript) |
| Estilização | Tailwind CSS |
| ORM | Prisma |
| Banco de dados | PostgreSQL (Railway managed) |
| Autenticação | NextAuth.js (email + senha, roles) |
| Deploy | Railway (Docker) |
| WhatsApp | Z-API |
| Agendador | node-cron dentro do app (ou Railway Cron) |

### Deploy

Dockerfile multi-stage: build Next.js → imagem enxuta → Railway faz deploy automático a cada push no GitHub. Migrations Prisma rodam no startup.

---

## Módulos

### 1. Autenticação
- Login por email e senha (NextAuth.js)
- Dois roles:
  - **admin** (recepcionista) — acesso total: cria, edita e cancela agendamentos, cadastros, pagamentos e relatórios
  - **fisio** — somente leitura: visualiza a agenda (todos os fisios) e o perfil dos pacientes, sem criar nem editar nada
- Sessão persistente via JWT

### 2. Pacientes
- Cadastro: nome, telefone (WhatsApp), CPF, data de nascimento, observações
- Cada paciente tem uma **cor personalizada por fisioterapeuta** (tabela de relacionamento `PacienteFisio`)
- Histórico de sessões, pagamentos e tapings acessível no perfil do paciente

### 3. Fisioterapeutas
- Cadastro: nome, email, CREF, cor padrão na agenda
- Cada fisio tem login próprio e vê prioritariamente sua agenda

### 4. Procedimentos & Valores
- Tabela de procedimentos com nome e valor
- Todo agendamento referencia um procedimento (preço é herdado no momento do agendamento, não recalculado)

### 5. Agendamentos
- Calendário semanal por fisioterapeuta com código de cores
- Criação manual (avulso) ou gerada por frequência
- Status: `agendado | realizado | cancelado | faltou`
- Campos: paciente, fisio, procedimento, data/hora, pacote vinculado (opcional), flag `notificacao_enviada`

### 6. Frequências de Agendamento
- Configura padrões recorrentes (ex: pós-operatório — seg/qua/sex às 09h)
- Campos: paciente, fisio, dias da semana (array), horário, período de vigência, descrição
- Ao salvar uma frequência, o sistema gera todos os agendamentos dentro do período de vigência (data_inicio até data_fim) nos dias da semana configurados, no horário especificado

### 7. Pacotes de Sessões
- Controle de sessões compradas vs. usadas
- Validade padrão: **40 dias** a partir da data de início
- Status calculado: `ativo | expirado | esgotado`
- Alerta visual quando restam ≤ 3 sessões

### 8. Taping
- Registro de aplicação: paciente, fisio, região corporal, data de aplicação
- Data de retirada = aplicação + 4 dias (calculado automaticamente)
- Alerta no dashboard quando a retirada é hoje ou amanhã

### 9. Pagamentos
- Registro manual (sem gateway online)
- Formas: dinheiro, Pix, cartão, transferência
- Pode estar vinculado a um agendamento avulso ou à compra de um pacote
- Base para relatório semanal de pagamentos por fisioterapeuta

### 10. Notificações WhatsApp
- Cron job diário às **08h00**: busca todos os agendamentos do dia seguinte com status `agendado` e `notificacao_enviada = false`
- Envia mensagem via Z-API para o telefone do paciente
- Marca `notificacao_enviada = true` após envio bem-sucedido
- Mensagem: confirmação de consulta com data, hora e nome do fisioterapeuta

### 11. Relatórios
- Atendimentos por período (filtro por fisio, data, procedimento)
- Pagamento semanal por fisioterapeuta: soma dos registros da tabela `Pagamento` no período (seg–dom), agrupados pelo fisioterapeuta do agendamento vinculado. Pagamentos sem agendamento vinculado (ex: compra de pacote) são contabilizados separadamente.

---

## Modelo de Dados

```
Paciente            Fisioterapeuta
- id                - id
- nome              - nome
- telefone          - email
- cpf               - cor (hex)
- data_nascimento   - cref
- observacoes       - ativo

PacienteFisio (relação)     Procedimento
- paciente_id               - id
- fisio_id                  - nome
- cor_personalizada (hex)   - valor
                            - ativo

Agendamento
- id
- paciente_id
- fisio_id
- procedimento_id
- pacote_id (nullable)
- frequencia_id (nullable)
- data_hora
- status (agendado|realizado|cancelado|faltou)
- notificacao_enviada

FrequenciaAgendamento
- id
- paciente_id
- fisio_id
- dias_semana (int[])   -- 0=dom, 1=seg, ...
- horario
- data_inicio
- data_fim
- descricao

PacoteSessoes
- id
- paciente_id
- total_sessoes
- sessoes_usadas
- data_inicio
- validade_dias (default 40)
- data_expiracao (calculado)
- valor_total
- status (ativo|expirado|esgotado)

Pagamento
- id
- paciente_id
- agendamento_id (nullable)
- pacote_id (nullable)
- valor
- forma (dinheiro|pix|cartao|transferencia)
- data_pagamento
- observacao

Taping
- id
- paciente_id
- fisio_id
- regiao_corporal
- data_aplicacao
- data_retirada (aplicacao + 4 dias)
- retirado (bool)

Usuario
- id
- email
- senha_hash
- role (admin|fisio)
- fisio_id (nullable)
- ativo
```

---

## Layout & UX

- Sidebar fixa com navegação principal
- Agenda como tela inicial (visão semanal, cores por fisio)
- Dashboard com 3 alertas no topo: sessões acabando, taping a retirar, notificações enviadas
- Cada fisio vê sua agenda em destaque; admin vê todos
- Usar skill `frontend-design` para todas as telas durante a implementação

---

## Alertas e Sinalizações

| Evento | Gatilho | Onde aparece |
|---|---|---|
| Sessões acabando | ≤ 3 sessões restantes no pacote | Dashboard + perfil paciente |
| Taping vencer | retirada = hoje ou amanhã | Dashboard |
| Pacote expirado | data_expiracao < hoje | Perfil paciente + ao agendar |
| WhatsApp enviado | cron rodou com sucesso | Dashboard (contador) |

---

## Fora de Escopo

- Processamento de pagamento online
- Portal do paciente
- App mobile
- Multi-clínica
