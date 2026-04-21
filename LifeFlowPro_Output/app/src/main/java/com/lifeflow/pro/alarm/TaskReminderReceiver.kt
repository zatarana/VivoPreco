package com.lifeflow.pro.alarm

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationCompat
import com.lifeflow.pro.data.db.AppDatabase
import dagger.hilt.EntryPoint
import dagger.hilt.InstallIn
import dagger.hilt.android.EntryPointAccessors
import dagger.hilt.components.SingletonComponent
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class TaskReminderReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val taskId = intent.getLongExtra(EXTRA_TASK_ID, 0L)
        val pendingResult = goAsync()

        CoroutineScope(Dispatchers.IO).launch {
            runCatching {
                val ep = EntryPointAccessors.fromApplication(
                    context.applicationContext,
                    TaskReminderEntryPoint::class.java,
                )
                val task = ep.database().taskDao().getById(taskId)
                val title = task?.title ?: "Tarefa #$taskId"
                val body = task?.description?.takeIf { it.isNotBlank() }
                    ?: "Toque para revisar a tarefa."

                val nm = context.getSystemService(NotificationManager::class.java)
                val channel = NotificationChannel(
                    CHANNEL_ID,
                    "Tarefas",
                    NotificationManager.IMPORTANCE_DEFAULT,
                )
                nm.createNotificationChannel(channel)

                val notification = NotificationCompat.Builder(context, CHANNEL_ID)
                    .setSmallIcon(android.R.drawable.ic_dialog_info)
                    .setContentTitle("⏰ $title")
                    .setContentText(body)
                    .setAutoCancel(true)
                    .build()

                nm.notify(taskId.toInt(), notification)
            }
            pendingResult.finish()
        }
    }

    companion object {
        const val EXTRA_TASK_ID = "extra_task_id"
        const val CHANNEL_ID    = "tasks_channel"
    }
}

@EntryPoint
@InstallIn(SingletonComponent::class)
interface TaskReminderEntryPoint {
    fun database(): AppDatabase
}
