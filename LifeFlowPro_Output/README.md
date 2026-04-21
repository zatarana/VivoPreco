# LifeFlow Pro — Fase 9 (Atualizado)

Este projeto implementa todas as fases anteriores mais os itens concluídos nesta iteração.

## ✅ O que foi implementado nesta atualização

### 🔐 Backup com criptografia AES-256-GCM
- Formato `.lfpbak` v2 (`LFPBK2`): `header(6) | salt(32) | IV(12) | ciphertext`
- Derivação de chave: PBKDF2/HMAC-SHA256, 100.000 iterações, chave 256-bit
- Retrocompatível com backups legados (`LFPBK1`) sem criptografia
- SHA-256 checksum do banco continua sendo validado após descriptografar

### 🔔 WorkManager completamente agendado (todos os workers)
- `OverdueTasksWorker` → diário às 8h (marca tarefas atrasadas)
- `StreakReminderWorker` → diário às 20h (avisa se nenhuma tarefa foi concluída no dia)
- `RecurringTransactionsWorker` → mensal (gera transações recorrentes do próximo mês)
- Agendados via `WorkManagerScheduler.scheduleAll()` no `Application.onCreate()`

### 📆 AlarmManager para finanças (PRD §8)
- `FinanceAlarmScheduler`: agenda alarmes exatos (`setExactAndAllowWhileIdle`) para:
  - Transações A_PAGAR e A_RECEBER → notificação no dia e 3 dias antes
  - Parcelas de dívida pendentes → idem
- `FinanceNotificationReceiver`: BroadcastReceiver registrado no Manifest
- `BootReceiver` reagenda alarmes de tarefas **e** financeiros após reinício do dispositivo

### 🔗 Fluxo Tarefa → Transação (PRD §3.4)
- `TaskRepository.markCompleted()` retorna `TaskCompletionResult` com `linkedTransactionId`
- `TasksViewModel` emite `LinkedTransactionPrompt` quando há transação vinculada
- `TasksModuleScreen` exibe `AlertDialog` perguntando "Criar transação correspondente?"
  e abre a transação via `SelectionCoordinator` ao confirmar

### 📊 Cores de orçamento por status (PRD §4.5)
- Barras de progresso: verde (< 70%), amarelo (70–99%), vermelho (≥ 100%)
- Aplicado no Dashboard e na aba Orçamentos da tela Finanças

### 🎯 Notificações reativas de metas (PRD §4.6)
- `GoalsViewModel`: ao salvar meta, verifica se cruzou 80% ou 100%
- Notificação lançada apenas quando o limiar é **ultrapassado pela primeira vez**

### 💰 Notificações reativas de orçamento (PRD §4.5)
- `FinanceViewModel`: após recalcular orçamentos, notifica ao atingir 80% ou ao ultrapassar

### 🛎️ TaskReminderReceiver aprimorado
- Usa `EntryPoint` do Hilt para buscar o título real da tarefa no banco
- Notificação exibe o nome da tarefa ao invés de apenas o ID

### 🌐 Canais de notificação centralizados
- Criados no `LifeFlowApp.onCreate()`: `tasks_channel`, `finance_channel`,
  `debts_channel`, `goals_channel`, `streak_reminder_channel`

## ⚠️ Observações

- O `StreakReminderWorker` emite notificação às 20h **apenas se** nenhuma tarefa foi concluída no dia.
  O horário é configurável via `WorkManagerScheduler`.
- A criptografia usa passphrase embutida no app (adequado para backup pessoal local).
  Para backup em nuvem pública, recomenda-se chave derivada de senha do usuário.
- As notificações de orçamento são disparadas cada vez que o `FinanceViewModel` reconstrói
  o estado. Uma implementação mais refinada persistiria o estado de limiar já notificado para
  evitar notificações repetidas na mesma sessão.
- O projeto está estruturado para compilar no Android Studio mas não foi validado com
  Gradle/SDK rodando aqui.

## Estrutura de módulos

```
alarm/
  BootReceiver.kt              — reagenda alarmes após boot
  FinanceAlarmScheduler.kt     — NEW: alarmes de finanças e dívidas
  FinanceNotificationReceiver.kt — NEW: BroadcastReceiver financeiro
  TaskAlarmScheduler.kt        — alarmes de tarefas
  TaskReminderReceiver.kt      — receiver aprimorado com título real

backup/
  BackupManager.kt             — UPDATED: AES-256-GCM + LFPBK2

worker/
  OverdueTasksWorker.kt        — UPDATED: WORK_NAME constant
  RecurringTransactionsWorker.kt
  StreakReminderWorker.kt      — NEW: lembrete de streak às 20h
  WorkManagerScheduler.kt     — NEW: agenda todos os workers

data/repository/
  RepositoryPlaceholders.kt   — UPDATED: FinanceAlarmScheduler integrado
  TaskRepository.kt           — UPDATED: markCompleted retorna TaskCompletionResult

ui/screens/
  FinanceViewModel.kt          — UPDATED: notificações de orçamento
  GoalsViewModel.kt            — UPDATED: notificações de metas + @ApplicationContext
  TasksViewModel.kt            — UPDATED: fluxo tarefa→transação (linkedTxPrompt)
  TasksModuleScreen.kt         — UPDATED: dialog de transação vinculada
  DashboardCalendarSearchScreens.kt — UPDATED: cores de orçamento
  FinanceModuleScreen.kt       — UPDATED: cores de orçamento
```
