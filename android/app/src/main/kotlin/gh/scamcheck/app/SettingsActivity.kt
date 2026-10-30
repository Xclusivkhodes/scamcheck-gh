package gh.scamcheck.app

import android.os.Bundle
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.Toast
import android.text.InputType
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.app.AppCompatDelegate
import com.google.android.material.button.MaterialButton

class SettingsActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(20), dp(20), dp(20), dp(20))
        }
        root.addView(TextView(this).apply {
            text = "ScamCheck server"
            textSize = 28f
            setPadding(0, 0, 0, dp(8))
        })
        root.addView(TextView(this).apply {
            text = "Example: https://your-host.example. Sample mode on the server means no model call. This app does not contain an API key."
            textSize = 16f
            setPadding(0, 0, 0, dp(8))
        })
        val input = EditText(this).apply {
            setText(Prefs.baseUrl(this@SettingsActivity))
            hint = "https://"
            textSize = 18f
            minHeight = dp(56)
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_URI
        }
        root.addView(input)
        root.addView(MaterialButton(this).apply {
            text = "Save address"
            isAllCaps = false
            setOnClickListener {
                Prefs.setBaseUrl(this@SettingsActivity, input.text.toString())
                Toast.makeText(this@SettingsActivity, "Saved", Toast.LENGTH_SHORT).show()
            }
        })
        root.addView(MaterialButton(this).apply {
            text = "Use system light or dark"
            isAllCaps = false
            setOnClickListener { AppCompatDelegate.setDefaultNightMode(AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM) }
        })
        setEdgeToEdgeContent(ScrollView(this).apply { addView(root) })
    }
}
