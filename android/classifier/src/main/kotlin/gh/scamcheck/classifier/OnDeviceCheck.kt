package gh.scamcheck.classifier

enum class Band { SCAM, CAUTION, SAFE, CANT_TELL }

data class Hit(val label: String, val points: Int)

data class DeviceReport(
    val band: Band,
    val points: Int,
    val phones: List<String>,
    val shortCodes: List<String>,
    val links: List<String>,
    val lookalikes: List<String>,
    val hits: List<Hit>,
)

/**
 * Same idea as the website pre-check: numbers, short codes, links, lookalike
 * brands, and Ghana scam phrases. No network.
 */
object OnDeviceCheck {
    private val brands = listOf(
        "mtn", "momo", "telecel", "vodafone", "airteltigo", "ecobank", "gcb", "gra", "ecg", "absa", "stanbic", "calbank", "zeepay", "ssnit",
    )
    private val confusables = mapOf(
        '0' to 'o', '1' to 'l', '3' to 'e', '4' to 'a', '5' to 's', '7' to 't', '@' to 'a',
    )

    fun inspect(raw: String): DeviceReport {
        val text = raw.replace("\u00a0", " ")
        val phones = Regex("""(?<!\d)(?:\+233|233|0)[\s-]?([235]\d{2})[\s-]?(\d{3})[\s-]?(\d{3})(?!\d)""")
            .findAll(text).map { "0${it.groupValues[1]}${it.groupValues[2]}${it.groupValues[3]}" }.distinct().toList()
        val shortCodes = Regex("""\*\d{2,4}(?:\*\d{1,4})*#""").findAll(text).map { it.value }.distinct().toList()
        val links = Regex("""https?://[^\s<>"')\]]+""", RegexOption.IGNORE_CASE).findAll(text).map { it.value.trimEnd('.', ',', ';') }.distinct().toList()
        val lookalikes = findLookalikes(text)
        val hits = mutableListOf<Hit>()

        if (asksForSecret(text)) hits += Hit("Asks for a PIN, OTP, or Ghana Card", 28)
        if (Regex("""reverse|sent by mistake|wrong transfer|send (it |the money )?back""", RegexOption.IGNORE_CASE).containsMatchIn(text)) {
            hits += Hit("Pushes a reversal or a refund", 30)
        }
        if (Regex("""you have won|you've won|won GHS|claim your""", RegexOption.IGNORE_CASE).containsMatchIn(text) &&
            Regex("""fee|pin|http|0\d{9}""", RegexOption.IGNORE_CASE).containsMatchIn(text)
        ) {
            hits += Hit("A prize tied to a fee or a number", 30)
        }
        if (lookalikes.isNotEmpty()) hits += Hit("Lookalike brand: ${lookalikes.first()}", 22)
        if (links.any { shortLink(it) }) hits += Hit("Short link", 12)
        if (links.any { unofficialBrandLink(text, it) }) hits += Hit("Brand name with a site that is not theirs", 16)
        if (Regex("""uniform fee|embassy fee|processing fee|registration fee|activation fee""", RegexOption.IGNORE_CASE).containsMatchIn(text) &&
            (phones.isNotEmpty() || links.isNotEmpty())
        ) {
            hits += Hit("Asks for a fee before anything starts", 30)
        }
        if (Regex("""power will be cut|customs|traffic fine|parcel is at""", RegexOption.IGNORE_CASE).containsMatchIn(text) && links.isNotEmpty()) {
            hits += Hit("A bill, a parcel, or a fine with a link", 30)
        }
        if (Regex("""\binvest\b|double your""", RegexOption.IGNORE_CASE).containsMatchIn(text) &&
            Regex("""GHS|GH₵|0\d{9}""", RegexOption.IGNORE_CASE).containsMatchIn(text)
        ) {
            hits += Hit("Promises money back fast", 30)
        }
        if (Regex("""before delivery|\bdeposit\b""", RegexOption.IGNORE_CASE).containsMatchIn(text) && phones.isNotEmpty()) {
            hits += Hit("Wants money before you have the thing", 28)
        }
        if (Regex("""current balance|available balance|transaction id""", RegexOption.IGNORE_CASE).containsMatchIn(text) && !asksForSecret(text)) {
            hits += Hit("Reads like a normal receipt", -18)
        }
        if (Regex("""do not share your pin|never ask for your pin|will never ask for your pin""", RegexOption.IGNORE_CASE).containsMatchIn(text)) {
            hits += Hit("Tells you not to share a PIN", -8)
        }

        val points = hits.sumOf { it.points }
        val receipt = hits.any { it.points < 0 && it.label.contains("receipt") }
        val band = when {
            points >= 28 -> Band.SCAM
            points >= 12 -> Band.CAUTION
            receipt || points < 0 -> Band.SAFE
            text.trim().length < 20 -> Band.CANT_TELL
            hits.isEmpty() -> Band.CANT_TELL
            else -> Band.SAFE
        }
        return DeviceReport(band, points, phones, shortCodes, links, lookalikes, hits)
    }

    private fun asksForSecret(text: String): Boolean {
        val window = text.replace(Regex("""\s+"""), " ")
        val request = Regex(
            """\b(send|share|tell|give|provide|enter|confirm|reply)\b[^.]{0,70}\b(pin|otp|password|verification code|ghana card)\b""",
            RegexOption.IGNORE_CASE,
        )
        return request.containsMatchIn(window) && !Regex("""\b(do not|don't|never)\s+(share|give|send)\b""", RegexOption.IGNORE_CASE).containsMatchIn(window)
    }

    private fun findLookalikes(text: String): List<String> {
        val hits = mutableListOf<String>()
        for (raw in text.split(Regex("""[^\p{L}\p{N}]+"""))) {
            if (raw.length !in 3..14) continue
            val plain = raw.lowercase().filter { it in 'a'..'z' }
            val folded = fold(raw)
            if (folded.length < 3) continue
            for (brand in brands) {
                if (plain == brand) continue
                val distance = if (folded == brand) 1 else levenshtein(folded, brand)
                val limit = if (brand.length >= 6) 2 else 1
                if (distance in 1..limit) {
                    hits += "$raw ≈ ${brand.uppercase()}"
                    break
                }
            }
        }
        return hits.distinct().take(4)
    }

    private fun fold(token: String): String = buildString {
        for (char in token.lowercase()) append(confusables[char] ?: char)
    }.filter { it in 'a'..'z' }

    private fun shortLink(url: String): Boolean {
        val host = host(url)
        return host in setOf("bit.ly", "tinyurl.com", "t.co", "cutt.ly", "is.gd", "rb.gy")
    }

    private fun unofficialBrandLink(text: String, url: String): Boolean {
        val host = host(url)
        if (host.isEmpty() || shortLink(url)) return false
        val official = listOf("mtn.com.gh", "mtn.com", "telecel.com.gh", "gra.gov.gh", "bog.gov.gh", "csa.gov.gh", "ecg.com.gh", "gcbbank.com.gh")
        val branded = Regex("""\b(mtn|momo|telecel|gra|gcb|ecobank|ecg)\b""", RegexOption.IGNORE_CASE).containsMatchIn(text)
        val known = official.any { host == it || host.endsWith(".$it") }
        return branded && !known
    }

    private fun host(url: String): String = try {
        java.net.URI(url).host?.removePrefix("www.")?.lowercase().orEmpty()
    } catch (_: Exception) {
        ""
    }

    fun levenshtein(left: String, right: String): Int {
        val grid = Array(left.length + 1) { IntArray(right.length + 1) }
        for (row in grid.indices) grid[row][0] = row
        for (col in grid[0].indices) grid[0][col] = col
        for (row in 1..left.length) {
            for (col in 1..right.length) {
                val cost = if (left[row - 1] == right[col - 1]) 0 else 1
                grid[row][col] = minOf(grid[row - 1][col] + 1, grid[row][col - 1] + 1, grid[row - 1][col - 1] + cost)
            }
        }
        return grid[left.length][right.length]
    }
}
