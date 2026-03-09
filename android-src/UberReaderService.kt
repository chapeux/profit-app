package com.motoganhos

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo

/**
 * Android Accessibility Service that monitors the Uber Driver app screen.
 * Extracts trip offer details and forwards them to the React Native layer
 * via UberReaderModule.
 *
 * This service must be declared in AndroidManifest.xml and the user must
 * manually enable it in device Settings > Accessibility.
 */
class UberReaderService : AccessibilityService() {

    companion object {
        /** True while the OS has this service connected. */
        @Volatile var isRunning: Boolean = false

        /** Callback set by UberReaderModule to receive parsed trip data. */
        var onTripDetected: ((TripData) -> Unit)? = null

        private var lastParsedText: String = ""
        private var lastEventMillis: Long   = 0L
        private const val DEBOUNCE_MS       = 800L
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        isRunning = true

        serviceInfo = AccessibilityServiceInfo().apply {
            eventTypes = AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED or
                         AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED
            feedbackType     = AccessibilityServiceInfo.FEEDBACK_GENERIC
            flags            = AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS or
                               AccessibilityServiceInfo.FLAG_RETRIEVE_INTERACTIVE_WINDOWS
            notificationTimeout = 100
            // Only monitor Uber Driver packages
            packageNames = arrayOf("com.ubercab.driver", "com.ubercab", "com.ubercab.eats")
        }
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent) {
        // Debounce rapid events
        val now = System.currentTimeMillis()
        if (now - lastEventMillis < DEBOUNCE_MS) return
        lastEventMillis = now

        val root = rootInActiveWindow ?: return
        val text = extractAllText(root)
        root.recycle()

        if (text.length < 10 || text == lastParsedText) return
        lastParsedText = text

        val tripData = UberTextParser.parse(text) ?: return
        onTripDetected?.invoke(tripData)
    }

    private fun extractAllText(node: AccessibilityNodeInfo): String {
        val sb = StringBuilder(512)
        extractRecursive(node, sb, depth = 0)
        return sb.toString().trim()
    }

    private fun extractRecursive(node: AccessibilityNodeInfo, sb: StringBuilder, depth: Int) {
        if (depth > 12) return

        node.text?.let { t ->
            if (t.isNotBlank()) sb.append(t).append(" ")
        }
        node.contentDescription?.let { d ->
            if (d.isNotBlank()) sb.append(d).append(" ")
        }

        for (i in 0 until node.childCount) {
            node.getChild(i)?.let { child ->
                extractRecursive(child, sb, depth + 1)
                child.recycle()
            }
        }
    }

    override fun onInterrupt() { /* required override */ }

    override fun onDestroy() {
        super.onDestroy()
        isRunning     = false
        lastParsedText = ""
    }
}
