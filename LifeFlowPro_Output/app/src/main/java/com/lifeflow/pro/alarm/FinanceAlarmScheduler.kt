package com.lifeflow.pro.alarm

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import com.lifeflow.pro.data.db.entities.DebtInstallmentEntity
import com.lifeflow.pro.data.db.entities.TransactionEntity
import com.lifeflow.pro.domain.model.FinanceConstants
import dagger.hilt.android.qualifiers.ApplicationContext
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.ZoneId
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Agenda alarmes (AlarmManager) para transações e parcelas de dívida pendentes.
 *
 * Estratégia:
 * - Transações A_PAGAR / A_RECEBER: notificação no dia de vencimento (08h) e 3 dias antes (08h)
 * - Parcelas PENDENTE: idem
 *
 * IDs de PendingIntent:
 * - Transação X:       X.toInt()               (no dia)
 * - Transação X -3d:   Int.MAX_VALUE - X.toInt() (3 dias antes)
 * - Instalamento Y:    Y.toInt() + 1_000_000   (no dia)
 * - Instalamento Y -3d: Y.toInt() + 2_000_000  (3 dias antes)
 */
@Singleton
class FinanceAlarmScheduler @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    private val alarmManager: AlarmManager = context.getSystemService(AlarmManager::class.java)

    // ---------------------------------------------------------------- transactions

    fun scheduleTransaction(transaction: TransactionEntity) {
        if (transaction.status != FinanceConstants.STATUS_TO_PAY &&
            transaction.status != FinanceConstants.STATUS_TO_RECEIVE
        ) {
            cancelTransaction(transaction.id)
            return
        }
        val dueDate = runCatching { LocalDate.parse(transaction.expectedDate) }.getOrNull() ?: return
        val label = if (transaction.type == FinanceConstants.TYPE_INCOME) "Receita a receber" else "Despesa a pagar"
        val description = transaction.description ?: label

        scheduleAt(dueDate, description, label, pendingIntentForTransaction(transaction.id, false))
        scheduleAt(dueDate.minusDays(3), "Em 3 dias: $description", label, pendingIntentForTransaction(transaction.id, true))
    }

    fun cancelTransaction(transactionId: Long) {
        alarmManager.cancel(pendingIntentForTransaction(transactionId, false))
        alarmManager.cancel(pendingIntentForTransaction(transactionId, true))
    }

    // ---------------------------------------------------------------- installments

    fun scheduleInstallment(installment: DebtInstallmentEntity, creditor: String) {
        if (installment.status == "PAGA") {
            cancelInstallment(installment.id)
            return
        }
        val dueDate = runCatching { LocalDate.parse(installment.dueDate) }.getOrNull() ?: return
        val description = "Parcela ${installment.installmentNumber} — $creditor"

        scheduleAt(dueDate, description, "Parcela de dívida", pendingIntentForInstallment(installment.id, false))
        scheduleAt(dueDate.minusDays(3), "Em 3 dias: $description", "Parcela de dívida", pendingIntentForInstallment(installment.id, true))
    }

    fun cancelInstallment(installmentId: Long) {
        alarmManager.cancel(pendingIntentForInstallment(installmentId, false))
        alarmManager.cancel(pendingIntentForInstallment(installmentId, true))
    }

    // ---------------------------------------------------------------- bulk reschedule

    fun rescheduleAll(transactions: List<TransactionEntity>, installments: List<DebtInstallmentEntity>, creditorByDebtId: Map<Long, String> = emptyMap()) {
        transactions.forEach { scheduleTransaction(it) }
        installments.forEach { scheduleInstallment(it, creditorByDebtId[it.debtId] ?: "Dívida") }
    }

    // ---------------------------------------------------------------- private helpers

    private fun scheduleAt(date: LocalDate, title: String, channelLabel: String, pendingIntent: PendingIntent) {
        val triggerMillis = LocalDateTime.of(date.year, date.month, date.dayOfMonth, 8, 0)
            .atZone(ZoneId.systemDefault()).toInstant().toEpochMilli()
        if (triggerMillis <= System.currentTimeMillis()) return
        alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerMillis, pendingIntent)
    }

    private fun pendingIntentForTransaction(transactionId: Long, early: Boolean): PendingIntent {
        val requestCode = if (early) Int.MAX_VALUE - transactionId.toInt() else transactionId.toInt()
        val intent = Intent(context, FinanceNotificationReceiver::class.java).apply {
            putExtra(FinanceNotificationReceiver.EXTRA_TITLE, if (early) "Vencimento em 3 dias" else "Vencimento hoje")
            putExtra(FinanceNotificationReceiver.EXTRA_ID, transactionId)
            putExtra(FinanceNotificationReceiver.EXTRA_TYPE, FinanceNotificationReceiver.TYPE_TRANSACTION)
        }
        return PendingIntent.getBroadcast(context, requestCode, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    }

    private fun pendingIntentForInstallment(installmentId: Long, early: Boolean): PendingIntent {
        val requestCode = if (early) installmentId.toInt() + 2_000_000 else installmentId.toInt() + 1_000_000
        val intent = Intent(context, FinanceNotificationReceiver::class.java).apply {
            putExtra(FinanceNotificationReceiver.EXTRA_TITLE, if (early) "Parcela em 3 dias" else "Parcela vence hoje")
            putExtra(FinanceNotificationReceiver.EXTRA_ID, installmentId)
            putExtra(FinanceNotificationReceiver.EXTRA_TYPE, FinanceNotificationReceiver.TYPE_INSTALLMENT)
        }
        return PendingIntent.getBroadcast(context, requestCode, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    }
}
