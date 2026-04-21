package com.lifeflow.pro

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import androidx.hilt.work.HiltWorkerFactory
import androidx.work.Configuration
import com.lifeflow.pro.backup.PendingRestoreManager
import com.lifeflow.pro.worker.WorkManagerScheduler
import dagger.hilt.android.HiltAndroidApp
import javax.inject.Inject

@HiltAndroidApp
class LifeFlowApp : Application(), Configuration.Provider {

    @Inject
    lateinit var workerFactory: HiltWorkerFactory

    override fun onCreate() {
        PendingRestoreManager.applyIfPending(this, "lifeflow_pro.db")
        super.onCreate()
        createNotificationChannels()
        WorkManagerScheduler.scheduleAll(this)
    }

    override val workManagerConfiguration: Configuration
        get() = Configuration.Builder()
            .setWorkerFactory(workerFactory)
            .build()

    private fun createNotificationChannels() {
        val nm = getSystemService(NotificationManager::class.java)
        val channels = listOf(
            NotificationChannel("tasks_channel",          "Tarefas",            NotificationManager.IMPORTANCE_DEFAULT),
            NotificationChannel("finance_channel",        "Finanças",           NotificationManager.IMPORTANCE_DEFAULT),
            NotificationChannel("debts_channel",          "Dívidas",            NotificationManager.IMPORTANCE_DEFAULT),
            NotificationChannel("streak_reminder_channel","Streak de tarefas",  NotificationManager.IMPORTANCE_LOW),
        )
        channels.forEach { nm.createNotificationChannel(it) }
    }
}
