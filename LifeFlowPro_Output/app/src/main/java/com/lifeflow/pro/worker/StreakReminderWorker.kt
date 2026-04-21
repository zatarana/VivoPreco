package com.lifeflow.pro.worker

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import androidx.core.app.NotificationCompat
import androidx.hilt.work.HiltWorker
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.lifeflow.pro.data.db.dao.TaskDao
import com.lifeflow.pro.domain.model.TaskConstants
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject
import java.time.LocalDate

@HiltWorker
class StreakReminderWorker @AssistedInject constructor(
    @Assisted private val appContext: Context,
    @Assisted params: WorkerParameters,
    private val taskDao: TaskDao,
) : CoroutineWorker(appContext, params) {

    override suspend fun doWork(): Result = runCatching {
        val todayStr = LocalDate.now().toString()
        val concludedToday = taskDao.getAllOnce().any {
            it.status == TaskConstants.STATUS_COMPLETED && it.completedAt?.startsWith(todayStr) == true
        }
        if (!concludedToday) {
            showNotification()
        }
        Result.success()
    }.getOrElse { Result.retry() }

    private fun showNotification() {
        val nm = appContext.getSystemService(NotificationManager::class.java)
        val channel = NotificationChannel(
            CHANNEL_ID,
            "Tarefas",
            NotificationManager.IMPORTANCE_LOW,
        )
        nm.createNotificationChannel(channel)

        val notification = NotificationCompat.Builder(appContext, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle("🔥 Mantenha o streak!")
            .setContentText("Você ainda não concluiu nenhuma tarefa hoje. Que tal resolver uma agora?")
            .setAutoCancel(true)
            .build()

        nm.notify(NOTIFICATION_ID, notification)
    }

    companion object {
        const val CHANNEL_ID = "streak_reminder_channel"
        private const val NOTIFICATION_ID = 9001
        const val WORK_NAME = "streak_reminder_daily"
    }
}
