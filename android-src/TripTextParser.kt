package com.motoganhos

data class TripData(
    val grossValue: Double,
    val distanceKm: Double,
    val durationMinutes: Double,
    val passengerRating: Double,
    val rawText: String
)

object TripTextParser {

    fun parse(text: String): TripData? {
        if (text.length < 5) return null

        // ── 1. Valor ─────────────────────────────────────────────────────────
        val money = Regex("""R\$\s*(\d{1,4}[,.]?\d{0,2})""")
            .find(text)
            ?.groupValues?.get(1)
            ?.replace(",", ".")
            ?.toDoubleOrNull()
            ?: return null

        if (money < 3.0 || money > 2000.0) return null

        // ── 2. Somar busca + corrida ─────────────────────────────────────────
        // Uber mostra dois blocos:
        //   "4 min (1.2 km)"      ← deslocamento até o passageiro
        //   "10 minutos (3.9 km)" ← duração da corrida
        // Somamos tudo para custo real (combustível + tempo total)
        val timeDistPattern = Regex(
            """(\d+)\s*min(?:uto(?:s)?)?\s*\((\d+[.,]\d+|\d+)\s*km\)""",
            RegexOption.IGNORE_CASE
        )

        val allMatches = timeDistPattern.findAll(text).toList()

        val (duration, distance) = when {
            allMatches.isNotEmpty() -> {
                val totalDur  = allMatches.sumOf { it.groupValues[1].toDoubleOrNull() ?: 0.0 }
                val totalDist = allMatches.sumOf { it.groupValues[2].replace(",", ".").toDoubleOrNull() ?: 0.0 }
                if (totalDur <= 0.0 || totalDist <= 0.0) return null
                Pair(totalDur, totalDist)
            }
            else -> {
                val dur  = parseTimeFallback(text) ?: return null
                val dist = parseDistanceFallback(text) ?: return null
                Pair(dur, dist)
            }
        }

        if (duration < 1.0 || duration > 600.0) return null
        if (distance < 0.3 || distance > 500.0) return null

        // ── 3. Rating ────────────────────────────────────────────────────────
        // Formatos: "4,89 (261)" ou "★ 4,89" ou "4,89 ★"
        val rating = listOf(
            Regex("""(\d[,.]\d{1,2})\s*\(\d+\)"""),
            Regex("""[★⭐*]\s*(\d[,.]\d{1,2})"""),
            Regex("""(\d[,.]\d{1,2})\s*[★⭐*]"""),
            Regex("""[Nn]ota[:\s]+(\d[,.]\d{1,2})"""),
        ).firstNotNullOfOrNull { pattern ->
            pattern.find(text)
                ?.groupValues?.get(1)
                ?.replace(",", ".")
                ?.toDoubleOrNull()
                ?.takeIf { it in 1.0..5.0 }
        } ?: 0.0

        return TripData(
            grossValue      = money,
            distanceKm      = distance,
            durationMinutes = duration,
            passengerRating = rating,
            rawText         = text.take(600)
        )
    }

    private fun parseTimeFallback(text: String): Double? {
        Regex("""(\d+)\s*h(?:ora(?:s)?)?\s*(\d+)\s*min""", RegexOption.IGNORE_CASE)
            .find(text)?.let {
                val t = (it.groupValues[1].toDoubleOrNull() ?: 0.0) * 60.0 +
                        (it.groupValues[2].toDoubleOrNull() ?: 0.0)
                if (t > 0.0) return t
            }
        Regex("""(\d+)\s*min(?:uto(?:s)?)?""", RegexOption.IGNORE_CASE)
            .find(text)?.let {
                val v = it.groupValues[1].toDoubleOrNull() ?: return null
                if (v > 0.0) return v
            }
        return null
    }

    private fun parseDistanceFallback(text: String): Double? {
        return listOf(
            Regex("""(\d{1,3}[.,]\d{1,2})\s*km""", RegexOption.IGNORE_CASE),
            Regex("""(\d{1,3})\s*km""", RegexOption.IGNORE_CASE),
        ).firstNotNullOfOrNull { pattern ->
            pattern.find(text)
                ?.groupValues?.get(1)
                ?.replace(",", ".")
                ?.toDoubleOrNull()
                ?.takeIf { it > 0.0 }
        }
    }
}
