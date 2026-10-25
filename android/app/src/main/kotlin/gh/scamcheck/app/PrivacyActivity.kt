package gh.scamcheck.app

import android.os.Bundle
import android.widget.ScrollView
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

class PrivacyActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val text = TextView(this).apply {
            setPadding(48, 48, 48, 48)
            textSize = 18f
            this.text = """
                Privacy notice

                ScamCheck GH for Android reads SMS only if you allow RECEIVE_SMS and READ_SMS. If you decline, the app still lets you paste a message.

                Incoming texts and inbox scans are checked on this phone. The words stay in the app’s private storage. They are not sent anywhere unless you tap Check with AI.

                Check with AI posts the message to the server address you typed. That server is in sample mode unless you turn DEMO_MODE off there. This app has no Nebius or Tavily key.

                Notifications show the band (Scam, Caution, Safe, or Can’t tell), not the whole message.

                Uninstalling the app deletes the saved messages. This build is for your own phone. It is not distributed on Play. A Play listing would have to declare SMS access under the spam-detection use, and Google may still reject it.

                Twi is not generated in this app.
            """.trimIndent()
        }
        setContentView(ScrollView(this).apply { addView(text) })
    }
}
