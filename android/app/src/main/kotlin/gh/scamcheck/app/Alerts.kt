package gh.scamcheck.app

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat

object Alerts {
    private const val CHANNEL = "scam-alerts"

    fun show(context: Context, saved: SavedMessage) {
        if (Build.VERSION.SDK_INT >= 33 &&
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) {
            return
        }
        val manager = context.getSystemService(NotificationManager::class.java)
        if (Build.VERSION.SDK_INT >= 26) {
            manager.createNotificationChannel(
                NotificationChannel(CHANNEL, context.getString(R.string.notification_channel), NotificationManager.IMPORTANCE_HIGH),
            )
        }
        val open = Intent(context, ResultActivity::class.java).putExtra("id", saved.id)
        val pending = PendingIntent.getActivity(
            context,
            saved.id.hashCode(),
            open,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        val notification = NotificationCompat.Builder(context, CHANNEL)
            .setSmallIcon(R.drawable.ic_mark)
            .setContentTitle("ScamCheck · ${bandLabel(saved.band)}")
            .setContentText("On-device check. Tap for the reasons. AI runs only if you ask.")
            .setContentIntent(pending)
            .setAutoCancel(true)
            .build()
        manager.notify(saved.id.hashCode(), notification)
    }
}
