package com.lifeflow.pro.alarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.lifeflow.pro.data.db.AppDatabase
import com.lifeflow.pro.domain.model.TaskConstants
import dagger.hilt.EntryPoint
import dagger.hilt.InstallIn
import dagger.hilt.android.EntryPointAccessors
import dagger.hilt.components.SingletonComponent
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.time.LocalDateTime

private const val ACTION_BOOT_COMPLETED = "android.intent.action.BOOT_COMPLETED"

class BootReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != ACTION_BOOT_COMPLETED) return
        val pendingResult = goAsync()
        CoroutineScope(Dispatchers.IO).launch {
            runCatching {
                val ep = EntryPointAccessors.fromApplication(
                    context.applicationContext,
                    BootReceiverEntryPoint::class.java,
                )
                val database        = ep.database()
                val taskScheduler   = TaskAlarmScheduler(context.applicationContext)
                val financeScheduler = FinanceAlarmScheduler(context.applicationContext)
                val now = LocalDateTime.now()

                // Reagendar alarmes de tarefas
                database.taskDao().getAllOnce()
                    .asSequence()
                    .filter { it.status != TaskConstants.STATUS_COMPLETED }
                    .filter { !it.dueDate.isNullOrBlank() && !it.dueTime.isNullOrBlank() }
                    .filter {
                        runCatching {
                            LocalDateTime.parse("${it.dueDate}T${it.dueTime}")
                        }.getOrNull()?.isAfter(now) == true
                    }
                    .forEach { task -> taskScheduler.schedule(task.id, task.dueDate!!, task.dueTime!!) }

                // Reagendar alarmes financeiros
                val transactions  = database.transactionDao().getAll()
                val installments  = database.debtInstallmentDao().getAllSnapshot()
                val debts         = database.debtDao().getAll()
                val creditorMap   = debts.associate { it.id to it.creditor }
                financeScheduler.rescheduleAll(transactions, installments, creditorMap)
            }
            pendingResult.finish()
        }
    }
}

@EntryPoint
@InstallIn(SingletonComponent::class)
interface BootReceiverEntryPoint {
    fun database(): AppDatabase
}
