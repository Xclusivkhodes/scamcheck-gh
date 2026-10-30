package gh.scamcheck.app

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.google.android.material.button.MaterialButton

class MainActivity : AppCompatActivity() {
    private val askSms = registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) {
        Prefs.markExplained(this)
        refresh()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        refresh()
    }

    override fun onResume() {
        super.onResume()
        refresh()
    }

    private fun refresh() {
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(20), dp(20), dp(20), dp(20))
            setBackgroundColor(ContextCompat.getColor(this@MainActivity, R.color.bg))
        }
        root.addView(title("ScamCheck GH"))
        root.addView(body(getString(R.string.explain_body)))
        if (!smsGranted()) {
            root.addView(button(getString(R.string.allow_sms)) {
                Prefs.markExplained(this)
                val permissions = mutableListOf(Manifest.permission.RECEIVE_SMS, Manifest.permission.READ_SMS)
                if (Build.VERSION.SDK_INT >= 33) permissions += Manifest.permission.POST_NOTIFICATIONS
                askSms.launch(permissions.toTypedArray())
            })
            root.addView(body(getString(R.string.sms_denied)))
        } else {
            root.addView(body("SMS access is on. Incoming texts are checked on this phone."))
        }
        root.addView(button(getString(R.string.scan_recent)) { startActivity(Intent(this, ScanActivity::class.java)) })
        root.addView(button(getString(R.string.paste_check)) {
            startActivity(Intent(this, ResultActivity::class.java).putExtra("paste", true))
        })
        root.addView(button(getString(R.string.settings), primary = false) { startActivity(Intent(this, SettingsActivity::class.java)) })
        root.addView(button(getString(R.string.privacy), primary = false) { startActivity(Intent(this, PrivacyActivity::class.java)) })
        setEdgeToEdgeContent(ScrollView(this).apply { addView(root) })
    }

    private fun smsGranted(): Boolean {
        val receive = ContextCompat.checkSelfPermission(this, Manifest.permission.RECEIVE_SMS) == PackageManager.PERMISSION_GRANTED
        val read = ContextCompat.checkSelfPermission(this, Manifest.permission.READ_SMS) == PackageManager.PERMISSION_GRANTED
        return receive && read
    }

    private fun title(text: String) = TextView(this).apply {
        this.text = text
        textSize = 32f
        setTextColor(ContextCompat.getColor(this@MainActivity, R.color.text))
        setPadding(0, 0, 0, dp(12))
    }

    private fun body(text: String) = TextView(this).apply {
        this.text = text
        textSize = 18f
        setTextColor(ContextCompat.getColor(this@MainActivity, R.color.muted))
        setPadding(0, 0, 0, dp(12))
    }

    private fun button(label: String, primary: Boolean = true, onClick: () -> Unit) = (
        if (primary) MaterialButton(this)
        else MaterialButton(this, null, com.google.android.material.R.attr.materialButtonOutlinedStyle)
    ).apply {
        text = label
        textSize = 16f
        isAllCaps = false
        minimumHeight = dp(56)
        setOnClickListener { onClick() }
        val params = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
        params.bottomMargin = dp(12)
        layoutParams = params
    }
}
