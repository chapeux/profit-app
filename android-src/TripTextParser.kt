package com.motoganhos

data class TripData(
    val grossValue: Double,
    val distanceKm: Double,
    val durationMinutes: Double,
    val passengerRating: Double,
    val rawText: String
)

object TripTextParser {
    private val moneyPatterns = listOf(
        Regex("""R\$\s*(\d{1,3}[,.]?\d{0,2})"""),
        Regex("""(\d{1,3}[,.]\d{2})\s*(?:reais|BRL)"""),
        Regex("""^(\d{1,3}[,.]\d{2})$""", setOf(RegexOption.MULTILINE)),
    )
    private val distancePatterns = listOf(
        Regex("""(\d{1,3}[,.]\d{1,2})\s*km""", RegexOption.IGNORE_CASE),
        Regex("""(\d{1,3})\s*km""", RegexOption.IGNORE_CASE),
    )
    private val ratingPatterns = listOf(
        Regex("""(\d[,.]\d{1,2})\s*[⭐★*]"""),
        Regex("""[Nn]ota[:\s]+(\d[,.]\d{1,2})"""),
        Regex("""[Aa]valia[çc][aã]o[:\s]+(\d[,.]\d{1,2})"""),
        Regex("""\((\d[,.]\d{1,2})\)"""),
        Regex("""(?<!\d)(4[,.]\d{1,2}|5[,.]0)(?!\d)"""),
    )

    fun parse(text: String): TripData? {
        if (text.length < 5) return null
        val money = findFirst(text, moneyPatterns) ?: return null
        val dist = findFirst(text, distancePatterns) ?: return null
        val dur = parseTime(text) ?: return null
        if (money < 3.0 || money > 1000.0 || dist < 0.5 || dist > 500.0 || dur < 1.0 || dur > 600.0) return null
        return TripData(money, dist, dur, findFirst(text, ratingPatterns) ?: 0.0, text.take(600))
    }

    private fun findFirst(text: String, patterns: List<Regex>): Double? {
        for (p in patterns) {
            val m = p.find(text) ?: continue
            val r = m.groupValues[1].replace(",", ".").toDoubleOrNull() ?: continue
            if (r > 0.0) return r
        }
        return null
    }

    private fun parseTime(text: String): Double? {
        Regex("""(\d+)\s*h(?:ora(?:s)?)?\s*(\d+)\s*min""", RegexOption.IGNORE_CASE).find(text)?.let {
            val t = (it.groupValues[1].toDoubleOrNull() ?: 0.0) * 60.0 + (it.groupValues[2].toDoubleOrNull() ?: 0.0)
            if (t > 0.0) return t
        }
        Regex("""(\d+)\s*h(?:ora(?:s)?)?(?!\s*\d)""", RegexOption.IGNORE_CASE).find(text)?.let {
            val h = it.groupValues[1].toDoubleOrNull() ?: return@let
            if (h > 0.0) return h * 60.0
        }
        Regex("""(\d+)\s*min(?:uto(?:s)?)?""", RegexOption.IGNORE_CASE).find(text)?.let {
            val v = it.groupValues[1].toDoubleOrNull() ?: return null
            if (v > 0.0) return v
        }
        return null
    }
}
