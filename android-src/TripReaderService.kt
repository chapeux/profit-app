package com.motoganhos

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo

class TripReaderService : AccessibilityService() {

    companion object {
        @Volatile var isRunning: Boolean = false
        var onTripDetected: ((TripData) -> Unit)? = null
        private var lastParsedText: String = ""
        private var lastEventMillis: Long = 0L
        private const val DEBOUNCE_MS = 800L
        val MONITORED_PACKAGES = arrayOf(
            "com.ubercab.driver", "com.ubercab",
            "com.sec.android.gallery3d", "com.google.android.apps.photos",
            "com.android.gallery3d", "com.google.android.apps.docs", "com.adobe.reader",
        )
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        isRunning = true
        serviceInfo = AccessibilityServiceInfo().apply {
            eventTypes = AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED or AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED
            feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC
            flags = AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS or AccessibilityServiceInfo.FLAG_RETRIEVE_INTERACTIVE_WINDOWS
            notificationTimeout = 100
            packageNames = MONITORED_PACKAGES
        }
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent) {
        val now = System.currentTimeMillis()
        if (now - lastEventMillis < DEBOUNCE_MS) return
        lastEventMillis = now
        val root = rootInActiveWindow ?: return
        val text = extractAllText(root)
        root.recycle()
        if (text.length < 10 || text == lastParsedText) return
        lastParsedText = text
        val tripData = TripTextParser.parse(text) ?: return
        onTripDetected?.invoke(tripData)
    }

    private fun extractAllText(node: AccessibilityNodeInfo): String {
        val sb = StringBuilder(512)
        extractRecursive(node, sb, 0)
        return sb.toString().trim()
    }

    private fun extractRecursive(node: AccessibilityNodeInfo, sb: StringBuilder, depth: Int) {
        if (depth > 12) return
        node.text?.let { if (it.isNotBlank()) sb.append(it).append(" ") }
        node.contentDescription?.let { if (it.isNotBlank()) sb.append(it).append(" ") }
        for (i in 0 until node.childCount) {
            node.getChild(i)?.let { child -> extractRecursive(child, sb, depth + 1); child.recycle() }
        }
    }

    override fun onInterrupt() {}
    override fun onDestroy() { super.onDestroy(); isRunning = false; lastParsedText = "" }
}
