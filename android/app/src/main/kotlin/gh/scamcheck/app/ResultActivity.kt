package gh.scamcheck.app

import android.os.Bundle
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import com.google.android.material.button.MaterialButton
import gh.scamcheck.classifier.OnDeviceCheck
import kotlin.concurrent.thread

class ResultActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        if (intent.getBooleanExtra("paste", false)) {
            showPaste()
            return
        }
        val id = intent.getStringExtra("id")
        val saved = id?.let { Store.get(this, it) }
        if (saved == null) {
            showPaste()
            return
        }
        showSaved(saved)
    }

    private fun showPaste() {
        val root = column()
        root.addView(heading("Paste a message"))
        root.addView(paragraph("This stays on the phone until you tap Check with AI."))
        val input = EditText(this).apply {
            minLines = 6
            hint = "Long-press, then paste"
            textSize = 18f
        }
        root.addView(input)
        root.addView(button("Check on this phone") {
            val text = input.text.toString()
            if (text.trim().length < 8) return@button
            val report = OnDeviceCheck.inspect(text)
            val saved = Store.save(this, "pasted", text, report)
            showSaved(saved)
        })
        setContentView(ScrollView(this).apply { addView(root) })
    }

    private fun showSaved(saved: SavedMessage) {
        val root = column()
        val band = TextView(this).apply {
            text = saved.aiVerdict?.let { webBand(it) } ?: bandLabel(saved.band)
            textSize = 40f
        }
        root.addView(band)
        root.addView(paragraph(saved.aiHeadline ?: "On-device check. The server was not contacted."))
        if (saved.reasons.isNotBlank()) root.addView(paragraph(saved.reasons))
        root.addView(paragraph(saved.body))
        val status = TextView(this).apply { textSize = 16f }
        root.addView(status)
        root.addView(button(getString(R.string.check_ai)) {
            val base = Prefs.baseUrl(this)
            if (base.isBlank()) {
                status.text = "Set the ScamCheck address first. No key is stored in the app."
                return@button
            }
            status.text = "Checking…"
            thread {
                try {
                    val ai = ApiClient.check(base, saved.body)
                    Store.updateAi(this, saved.id, ai.verdict, ai.headline)
                    runOnUiThread {
                        band.text = webBand(ai.verdict)
                        status.text = ai.headline
                    }
                } catch (error: Exception) {
                    runOnUiThread { status.text = error.message ?: "The check failed. The message stayed on this phone." }
                }
            }
        })
        setContentView(ScrollView(this).apply { addView(root) })
    }

    private fun webBand(verdict: String) = when (verdict) {
        "scam" -> "Scam"
        "suspicious" -> "Caution"
        "looks_ok" -> "Safe"
        else -> "Can't tell"
    }

    private fun column() = LinearLayout(this).apply {
        orientation = LinearLayout.VERTICAL
        setPadding(48, 48, 48, 48)
    }

    private fun heading(text: String) = TextView(this).apply {
        this.text = text
        textSize = 28f
        setPadding(0, 0, 0, 16)
    }

    private fun paragraph(text: String) = TextView(this).apply {
        this.text = text
        textSize = 16f
        setPadding(0, 8, 0, 16)
    }

    private fun button(label: String, onClick: () -> Unit) = MaterialButton(this).apply {
        text = label
        isAllCaps = false
        minimumHeight = 144
        setOnClickListener { onClick() }
    }
}
