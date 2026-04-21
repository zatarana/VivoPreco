package com.lifeflow.pro.worker

import android.content.Context
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import java.util.Calendar
import java.util.concurrent.TimeUnit

object WorkManagerScheduler {

    fun scheduleAll(context: Context) {
        val wm = WorkManager.getInstance(context)
        scheduleDailyAt(wm, OverdueTasksWorker::class.java,   OverdueTasksWorker.WORK_NAME,      hour = 8,  minute = 0)
        scheduleDailyAt(wm, StreakReminderWorker::class.java,  StreakReminderWorker.WORK_NAME,     hour = 20, minute = 0)
        scheduleMonthly(wm)
    }

    private fun <T : androidx.work.ListenableWorker> scheduleDailyAt(
        wm: WorkManager,
        clazz: Class<T>,
        name: String,
        hour: Int,
        minute: Int,
    ) {
        val now = Calendar.getInstance()
        val target = Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, hour)
            set(Calendar.MINUTE, minute)
            set(Calendar.SECOND, 0)
        }
        if (target.before(now)) target.add(Calendar.DAY_OF_YEAR, 1)
        val initialDelay = target.timeInMillis - now.timeInMillis

        val request = PeriodicWorkRequestBuilder<T>(1, TimeUnit.DAYS)
            .setInitialDelay(initialDelay, TimeUnit.MILLISECONDS)
            .build()

        wm.enqueueUniquePeriodicWork(name, ExistingPeriodicWorkPolicy.KEEP, request)
    }

    private fun scheduleMonthly(wm: WorkManager) {
        val request = PeriodicWorkRequestBuilder<RecurringTransactionsWorker>(30, TimeUnit.DAYS)
            .build()
        wm.enqueueUniquePeriodicWork(
            "recurring_transactions_monthly",
            ExistingPeriodicWorkPolicy.KEEP,
            request,
        )
    }
}
