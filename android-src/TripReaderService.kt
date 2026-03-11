package com.motoganhos

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.content.Context
import android.content.SharedPreferences
import android.os.Handler
import android.os.Looper
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo

class TripReaderService : AccessibilityService() {

    companion object {
        @Volatile var isRunning: Boolean = false
        var onTripDetected: ((TripData) -> Unit)? = null

        private var lastParsedText = ""
        private var lastEventMs    = 0L
        private const val DEBOUNCE_MS = 800L

        val MONITORED_PACKAGES = arrayOf(
            "com.ubercab.driver",
            "com.ubercab",
            "com.sec.android.gallery3d",
            "com.google.android.apps.photos",
            "com.android.gallery3d",
            "com.google.android.apps.docs",
        )
    }

    private val handler = Handler(Looper.getMainLooper())

    override fun onServiceConnected() {
        super.onServiceConnected()
        isRunning = true
        serviceInfo = AccessibilityServiceInfo().apply {
            eventTypes          = AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED or
                                  AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED
            feedbackType        = AccessibilityServiceInfo.FEEDBACK_GENERIC
            flags               = AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS or
                                  AccessibilityServiceInfo.FLAG_RETRIEVE_INTERACTIVE_WINDOWS
            notificationTimeout = 100
            packageNames        = MONITORED_PACKAGES
        }
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent) {
        val now = System.currentTimeMillis()
        if (now - lastEventMs < DEBOUNCE_MS) return
        lastEventMs = now

        val root = rootInActiveWindow ?: return
        val text = extractText(root)
        root.recycle()

        if (text.length < 10 || text == lastParsedText) return
        lastParsedText = text

        val trip = TripTextParser.parse(text) ?: return

        // 1. Notificar o módulo RN se o app estiver em foreground
        onTripDetected?.invoke(trip)

        // 2. Mostrar overlay nativo - funciona com app em background
        handler.post { showOverlay(trip) }
    }

    private fun showOverlay(trip: TripData) {
        val prefs: SharedPreferences = applicationContext
            .getSharedPreferences("motoganhos_settings", Context.MODE_PRIVATE)

        val kmPerLiter    = prefs.getFloat("kmPerLiter",             10f).toDouble()
        val fuelPrice     = prefs.getFloat("fuelPricePerLiter",       6f).toDouble()
        val costPerKmExt  = prefs.getFloat("costPerKmExtra",        0.10f).toDouble()
        val minKm         = prefs.getFloat("minGoodValuePerKm",     1.50f).toDouble()
        val minHour       = prefs.getFloat("minGoodValuePerHour",   30.0f).toDouble()
        val minMin        = prefs.getFloat("minGoodValuePerMinute",  0.50f).toDouble()
        val uberFee       = prefs.getFloat("uberFeePercent",          25f).toDouble()

        val fuelCost  = (trip.distanceKm / kmPerLiter) * fuelPrice
        val extraCost = trip.distanceKm * costPerKmExt
        val net       = trip.grossValue * (1.0 - uberFee / 100.0) - fuelCost - extraCost
        val perKm     = if (trip.distanceKm      > 0) trip.grossValue / trip.distanceKm      else 0.0
        val perMin    = if (trip.durationMinutes > 0) trip.grossValue / trip.durationMinutes else 0.0
        val perHour   = perMin * 60.0

        var score = 0
        if (perKm   >= minKm)   score += 34 else if (perKm   >= minKm   * 0.6) score += 17
        if (perMin  >= minMin)  score += 33 else if (perMin  >= minMin  * 0.6) score += 16
        if (perHour >= minHour) score += 33 else if (perHour >= minHour * 0.6) score += 16
        val signal = when { score >= 70 -> "green"; score >= 40 -> "yellow"; else -> "red" }

        OverlayService.show(
            context = applicationContext,
            gross   = trip.grossValue,
            dist    = trip.distanceKm,
            dur     = trip.durationMinutes,
            rating  = trip.passengerRating,
            signal  = signal,
            score   = score,
            perKm   = perKm,
            perHour = perHour,
            perMin  = perMin,
            net     = net,
        )
    }

    private fun extractText(node: AccessibilityNodeInfo): String {
        val sb = StringBuilder(512)
        extractRecursive(node, sb, 0)
        return sb.toString().trim()
    }

    private fun extractRecursive(node: AccessibilityNodeInfo, sb: StringBuilder, depth: Int) {
        if (depth > 12) return
        node.text?.let              { if (it.isNotBlank()) sb.append(it).append(" ") }
        node.contentDescription?.let { if (it.isNotBlank()) sb.append(it).append(" ") }
        for (i in 0 until node.childCount) {
            node.getChild(i)?.let { child ->
                extractRecursive(child, sb, depth + 1)
                child.recycle()
            }
        }
    }

    override fun onInterrupt() {}

    override fun onDestroy() {
        super.onDestroy()
        isRunning      = false
        lastParsedText = ""
    }
}
