package com.motoganhos

/**
 * Parses raw text extracted from the Uber Driver screen
 * to detect trip offer details: price, distance, duration, rating.
 */
data class TripData(
    val grossValue: Double,
    val distanceKm: Double,
    val durationMinutes: Double,
    val passengerRating: Double,
    val rawText: String
)

object UberTextParser {

    // Matches "R$ 25,50" or "R$25.50"
    private val moneyPatterns = listOf(
        Regex("""R\$\s*(\d+[,.]?\d{0,2})"""),
        Regex("""(\d+[,.]\d{2})\s*(?:reais|BRL)"""),
    )

    // Matches "8,5 km" or "10 km"
    private val distancePatterns = listOf(
        Regex("""(\d+[,.]\d{1,2})\s*km""", RegexOption.IGNORE_CASE),
        Regex("""(\d{1,3})\s*km""", RegexOption.IGNORE_CASE),
    )

    // Matches "4,85 ★" or "nota: 4.9"
    private val ratingPatterns = listOf(
        Regex("""(\d[,.]\d{1,2})\s*[⭐★*]"""),
        Regex("""[Nn]ota[:\s]+(\d[,.]\d{1,2})"""),
        Regex("""[Aa]valia[çc][aã]o[:\s]+(\d[,.]\d{1,2})"""),
    )

    fun parse(text: String): TripData? {
        if (text.length < 5) return null

        val money = findFirst(text, moneyPatterns) ?: return null
        val dist  = findFirst(text, distancePatterns) ?: return null
        val dur   = parseTime(text) ?: return null

        if (money <= 0.0 || dist <= 0.0 || dur <= 0.0) return null

        val rating = findFirst(text, ratingPatterns) ?: 0.0

        return TripData(
            grossValue       = money,
            distanceKm       = dist,
            durationMinutes  = dur,
            passengerRating  = rating,
            rawText          = text.take(600)
        )
    }

    private fun findFirst(text: String, patterns: List<Regex>): Double? {
        for (pattern in patterns) {
            val match = pattern.find(text) ?: continue
            val raw   = match.groupValues[1].replace(",", ".").toDoubleOrNull() ?: continue
            if (raw > 0.0) return raw
        }
        return null
    }

    private fun parseTime(text: String): Double? {
        // "1 h 15 min" or "1h15min"
        val hoursMin = Regex("""(\d+)\s*h(?:oras?)?\s*(\d+)\s*min""", RegexOption.IGNORE_CASE)
        hoursMin.find(text)?.let { m ->
            val h   = m.groupValues[1].toDoubleOrNull() ?: 0.0
            val min = m.groupValues[2].toDoubleOrNull() ?: 0.0
            val total = h * 60.0 + min
            if (total > 0.0) return total
        }
        // "25 min" or "25 minutos"
        val minOnly = Regex("""(\d+)\s*min(?:utos?)?""", RegexOption.IGNORE_CASE)
        minOnly.find(text)?.let { m ->
            val v = m.groupValues[1].toDoubleOrNull() ?: return null
            if (v > 0.0) return v
        }
        return null
    }
}
