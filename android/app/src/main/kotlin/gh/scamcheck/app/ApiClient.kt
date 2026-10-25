package gh.scamcheck.app

import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

data class AiResult(val verdict: String, val headline: String)

object ApiClient {
    /** No API key. The server decides DEMO_MODE. */
    fun check(baseUrl: String, text: String): AiResult {
        val connection = (URL("$baseUrl/api/check").openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            connectTimeout = 15000
            readTimeout = 20000
            doOutput = true
            setRequestProperty("Content-Type", "application/json")
            setRequestProperty("Accept", "application/json")
        }
        val payload = JSONObject().put("text", text).put("language", "en").put("stream", false)
        connection.outputStream.use { it.write(payload.toString().toByteArray()) }
        val code = connection.responseCode
        val stream = if (code in 200..299) connection.inputStream else connection.errorStream
        val body = stream.bufferedReader().readText()
        if (code !in 200..299) {
            val message = try {
                JSONObject(body).optString("error")
            } catch (_: Exception) {
                ""
            }
            throw IllegalStateException(message.ifBlank { "The server returned $code." })
        }
        val json = JSONObject(body)
        return AiResult(
            verdict = json.optString("verdict", "unsure"),
            headline = json.optString("headline", "Check the full result."),
        )
    }
}
