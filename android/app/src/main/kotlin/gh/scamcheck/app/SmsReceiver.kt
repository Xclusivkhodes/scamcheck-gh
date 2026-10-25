package gh.scamcheck.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import gh.scamcheck.classifier.Band
import gh.scamcheck.classifier.OnDeviceCheck

class SmsReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return
        val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent)
        if (messages.isEmpty()) return
        val body = messages.joinToString("") { it.messageBody.orEmpty() }
        val from = messages.first().originatingAddress.orEmpty()
        val report = OnDeviceCheck.inspect(body)
        val saved = Store.save(context, from, body, report)
        if (report.band == Band.SCAM || report.band == Band.CAUTION) {
            Alerts.show(context, saved)
        }
    }
}
