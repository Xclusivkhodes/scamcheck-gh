package gh.scamcheck.app

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.provider.Telephony
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.google.android.material.button.MaterialButton
import gh.scamcheck.classifier.OnDeviceCheck

class ScanActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(48, 48, 48, 48)
        }
        root.addView(heading("Recent messages"))
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_SMS) != PackageManager.PERMISSION_GRANTED) {
            root.addView(paragraph("SMS access is off, so the inbox was not read. You can still paste a message from the home screen."))
        } else {
            val rows = readInbox()
            if (rows.isEmpty()) root.addView(paragraph("No SMS in the inbox."))
            for (row in rows) {
                val report = OnDeviceCheck.inspect(row.body)
                val saved = Store.save(this, row.from, row.body, report)
                root.addView(button("${bandLabel(report.band.name)} · ${row.from.ifBlank { "Unknown" }}") {
                    startActivity(Intent(this, ResultActivity::class.java).putExtra("id", saved.id))
                })
                root.addView(paragraph(row.body.take(140)))
            }
        }
        setContentView(ScrollView(this).apply { addView(root) })
    }

    private fun readInbox(): List<InboxRow> {
        val rows = mutableListOf<InboxRow>()
        val cursor = contentResolver.query(
            Telephony.Sms.Inbox.CONTENT_URI,
            arrayOf(Telephony.Sms.ADDRESS, Telephony.Sms.BODY),
            null,
            null,
            "${Telephony.Sms.DATE} DESC",
        ) ?: return rows
        cursor.use {
            var count = 0
            while (it.moveToNext() && count < 30) {
                rows += InboxRow(it.getString(0).orEmpty(), it.getString(1).orEmpty())
                count += 1
            }
        }
        return rows
    }

    private fun heading(text: String) = TextView(this).apply {
        this.text = text
        textSize = 28f
        setPadding(0, 0, 0, 24)
    }

    private fun paragraph(text: String) = TextView(this).apply {
        this.text = text
        textSize = 16f
        setPadding(0, 0, 0, 16)
    }

    private fun button(label: String, onClick: () -> Unit) = MaterialButton(this).apply {
        text = label
        isAllCaps = false
        minimumHeight = 132
        setOnClickListener { onClick() }
    }
}

private data class InboxRow(val from: String, val body: String)
