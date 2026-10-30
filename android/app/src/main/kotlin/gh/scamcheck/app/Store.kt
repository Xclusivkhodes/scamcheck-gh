package gh.scamcheck.app

import android.content.Context
import gh.scamcheck.classifier.Band
import gh.scamcheck.classifier.DeviceReport
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID

data class SavedMessage(
    val id: String,
    val from: String,
    val body: String,
    val band: String,
    val points: Int,
    val reasons: String,
    val at: Long,
    val aiVerdict: String?,
    val aiHeadline: String?,
)

object Store {
    private const val FILE = "messages.json"

    fun save(context: Context, from: String, body: String, report: DeviceReport): SavedMessage {
        val existing = all(context).find { it.from == from && it.body == body }
        if (existing != null) return existing
        val item = SavedMessage(
            id = UUID.randomUUID().toString(),
            from = from,
            body = body,
            band = report.band.name,
            points = report.points,
            reasons = report.hits.joinToString("\n") { "${it.points} ${it.label}" },
            at = System.currentTimeMillis(),
            aiVerdict = null,
            aiHeadline = null,
        )
        val next = listOf(item) + all(context)
        write(context, next.take(50))
        return item
    }

    fun updateAi(context: Context, id: String, verdict: String, headline: String) {
        val next = all(context).map { item ->
            if (item.id == id) item.copy(aiVerdict = verdict, aiHeadline = headline) else item
        }
        write(context, next)
    }

    fun get(context: Context, id: String): SavedMessage? = all(context).find { it.id == id }

    fun all(context: Context): List<SavedMessage> {
        val file = context.filesDir.resolve(FILE)
        if (!file.exists()) return emptyList()
        return try {
            val array = JSONArray(file.readText())
            (0 until array.length()).map { index ->
                val obj = array.getJSONObject(index)
                SavedMessage(
                    id = obj.getString("id"),
                    from = obj.optString("from"),
                    body = obj.optString("body"),
                    band = obj.optString("band"),
                    points = obj.optInt("points"),
                    reasons = obj.optString("reasons"),
                    at = obj.optLong("at"),
                    aiVerdict = obj.optString("aiVerdict").ifBlank { null },
                    aiHeadline = obj.optString("aiHeadline").ifBlank { null },
                )
            }
        } catch (_: Exception) {
            emptyList()
        }
    }

    private fun write(context: Context, items: List<SavedMessage>) {
        val array = JSONArray()
        for (item in items) {
            array.put(
                JSONObject()
                    .put("id", item.id)
                    .put("from", item.from)
                    .put("body", item.body)
                    .put("band", item.band)
                    .put("points", item.points)
                    .put("reasons", item.reasons)
                    .put("at", item.at)
                    .put("aiVerdict", item.aiVerdict ?: "")
                    .put("aiHeadline", item.aiHeadline ?: ""),
            )
        }
        context.filesDir.resolve(FILE).writeText(array.toString())
    }
}

object Prefs {
    private const val NAME = "scamcheck"
    /** The public demo server. It runs in sample mode and holds no key in this app. */
    const val DEFAULT_BASE_URL = "https://scamcheck-gh.vercel.app"
    fun baseUrl(context: Context): String =
        context.getSharedPreferences(NAME, Context.MODE_PRIVATE).getString("base_url", DEFAULT_BASE_URL).orEmpty()

    fun setBaseUrl(context: Context, url: String) {
        context.getSharedPreferences(NAME, Context.MODE_PRIVATE).edit().putString("base_url", url.trim().trimEnd('/')).apply()
    }

    fun sawExplain(context: Context): Boolean =
        context.getSharedPreferences(NAME, Context.MODE_PRIVATE).getBoolean("explained", false)

    fun markExplained(context: Context) {
        context.getSharedPreferences(NAME, Context.MODE_PRIVATE).edit().putBoolean("explained", true).apply()
    }
}

fun bandLabel(band: String): String = when (band) {
    Band.SCAM.name -> "Scam"
    Band.CAUTION.name -> "Caution"
    Band.SAFE.name -> "Safe"
    else -> "Can't tell"
}
