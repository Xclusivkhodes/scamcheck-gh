package gh.scamcheck.app

import android.content.Context
import android.view.View
import android.view.ViewGroup
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import kotlin.math.roundToInt

/** Density-independent pixels, so spacing looks the same on every screen. */
fun Context.dp(value: Int): Int = (value * resources.displayMetrics.density).roundToInt()

/**
 * Android 15 draws apps edge to edge. Pad the content by the status bar,
 * navigation bar and keyboard so nothing sits under them.
 */
fun AppCompatActivity.setEdgeToEdgeContent(view: View) {
    setContentView(view)
    if (view is ViewGroup) view.clipToPadding = false
    ViewCompat.setOnApplyWindowInsetsListener(view) { v, insets ->
        val bars = insets.getInsets(
            WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout() or WindowInsetsCompat.Type.ime(),
        )
        v.setPadding(bars.left, bars.top, bars.right, bars.bottom)
        insets
    }
    ViewCompat.requestApplyInsets(view)
}
