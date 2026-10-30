package gh.scamcheck.app

import android.os.Bundle
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.view.Gravity
import androidx.core.content.ContextCompat
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
            gravity = Gravity.TOP or Gravity.START
            background = card()
            setPadding(dp(14), dp(12), dp(14), dp(12))
            layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
                .apply { bottomMargin = dp(12) }
        }
        root.addView(input)
        root.addView(button("Check on this phone") {
            val text = input.text.toString()
            if (text.trim().length < 8) {
                input.error = "Paste the whole message first."
                return@button
            }
            val report = OnDeviceCheck.inspect(text)
            val saved = Store.save(this, "pasted", text, report)
            showSaved(saved)
        })
        setEdgeToEdgeContent(ScrollView(this).apply { addView(root) })
    }

    private fun showSaved(saved: SavedMessage) {
        val root = column()
        val band = TextView(this).apply {
            textSize = 34f
            setTypeface(typeface, Typeface.BOLD)
        }
        fun paintBand(label: String) {
            band.text = label
            band.setTextColor(ContextCompat.getColor(this, bandColor(label)))
        }
        paintBand(saved.aiVerdict?.let { webBand(it) } ?: bandLabel(saved.band))
        root.addView(band)
        root.addView(paragraph(saved.aiHeadline ?: "On-device check. The server was not contacted."))
        if (saved.reasons.isNotBlank()) {
            val bullets = saved.reasons.lines().filter { it.isNotBlank() }
                .joinToString("\n") { "•  " + it.replace(Regex("^-?\\d+\\s+"), "") }
            root.addView(paragraph(bullets))
        }
        root.addView(paragraph(saved.body).apply {
            background = card()
            setPadding(dp(14), dp(12), dp(14), dp(12))
            layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
                .apply { topMargin = dp(8); bottomMargin = dp(16) }
        })
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
                        paintBand(webBand(ai.verdict))
                        status.text = ai.headline
                    }
                } catch (error: Exception) {
                    runOnUiThread { status.text = error.message ?: "The check failed. The message stayed on this phone." }
                }
            }
        })
        setEdgeToEdgeContent(ScrollView(this).apply { addView(root) })
    }

    private fun webBand(verdict: String) = when (verdict) {
        "scam" -> "Scam"
        "suspicious" -> "Caution"
        "looks_ok" -> "Safe"
        else -> "Can't tell"
    }

    private fun bandColor(label: String) = when (label) {
        "Scam" -> R.color.band_scam
        "Caution" -> R.color.band_caution
        "Safe" -> R.color.band_safe
        else -> R.color.text
    }

    private fun card() = GradientDrawable().apply {
        cornerRadius = dp(12).toFloat()
        setColor(ContextCompat.getColor(this@ResultActivity, R.color.surface))
        setStroke(dp(1), ContextCompat.getColor(this@ResultActivity, R.color.line))
    }

    private fun column() = LinearLayout(this).apply {
        orientation = LinearLayout.VERTICAL
        setPadding(dp(20), dp(20), dp(20), dp(20))
    }

    private fun heading(text: String) = TextView(this).apply {
        this.text = text
        textSize = 28f
        setPadding(0, 0, 0, dp(8))
    }

    private fun paragraph(text: String) = TextView(this).apply {
        this.text = text
        textSize = 16f
        setPadding(0, dp(4), 0, dp(8))
    }

    private fun button(label: String, onClick: () -> Unit) = MaterialButton(this).apply {
        text = label
        isAllCaps = false
        minimumHeight = dp(56)
        setOnClickListener { onClick() }
    }
}
