package com.lifeflow.pro.alarm

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationCompat

class FinanceNotificationReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val nm = context.getSystemService(NotificationManager::class.java)
        ensureChannel(nm)

        val title = intent.getStringExtra(EXTRA_TITLE) ?: "Lembrete financeiro"
        val id    = intent.getLongExtra(EXTRA_ID, 0L)
        val type  = intent.getIntExtra(EXTRA_TYPE, TYPE_TRANSACTION)

        val body = when (type) {
            TYPE_TRANSACTION -> "Toque para ver a transação e confirmar o pagamento."
            TYPE_INSTALLMENT -> "Toque para ver a parcela e registrar o pagamento."
            else             -> "Verifique seu app financeiro."
        }

        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title)
            .setContentText(body)
            .setAutoCancel(true)
            .build()

        val notifId = (type * 1_000_000 + id).toInt()
        nm.notify(notifId, notification)
    }

    private fun ensureChannel(nm: NotificationManager) {
        val channel = NotificationChannel(
            CHANNEL_ID,
            "Finanças",
            NotificationManager.IMPORTANCE_DEFAULT,
        )
        nm.createNotificationChannel(channel)
    }

    companion object {
        const val CHANNEL_ID         = "finance_channel"
        const val EXTRA_TITLE        = "extra_title"
        const val EXTRA_ID           = "extra_id"
        const val EXTRA_TYPE         = "extra_type"
        const val TYPE_TRANSACTION   = 1
        const val TYPE_INSTALLMENT   = 2
    }
}
