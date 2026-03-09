package com.motoganhos

import android.content.Intent
import android.provider.Settings
import android.text.TextUtils
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

/**
 * React Native bridge module that exposes UberReaderService to JavaScript.
 *
 * JS usage (via modules/UberReader.ts):
 *   UberReader.isAvailable()           → true on Android compiled build
 *   UberReader.isAccessibilityEnabled()→ Promise<Boolean>
 *   UberReader.openAccessibilitySettings()
 *   UberReader.startListening()
 *   UberReader.stopListening()
 *   UberReader.addListener(cb)         → unsubscribe function
 */
class UberReaderModule(private val ctx: ReactApplicationContext) :
    ReactContextBaseJavaModule(ctx) {

    override fun getName(): String = "UberReaderModule"

    /** Check if the user has enabled this accessibility service. */
    @ReactMethod
    fun isAccessibilityEnabled(promise: Promise) {
        try {
            promise.resolve(checkServiceEnabled())
        } catch (e: Exception) {
            promise.reject("ERR_ACCESSIBILITY", e.message)
        }
    }

    /** Opens the system Accessibility Settings screen. */
    @ReactMethod
    fun openAccessibilitySettings() {
        ctx.startActivity(
            Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
        )
    }

    /** Returns whether the service process is currently running. */
    @ReactMethod
    fun isServiceRunning(promise: Promise) {
        promise.resolve(UberReaderService.isRunning)
    }

    /**
     * Register the JS event listener.
     * The service will call this callback on every detected trip offer.
     */
    @ReactMethod
    fun startListening() {
        UberReaderService.onTripDetected = { trip ->
            if (ctx.hasActiveReactInstance()) {
                ctx.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    .emit("UberReaderTripDetected", buildParams(trip))
            }
        }
    }

    /** Unregister the JS event listener. */
    @ReactMethod
    fun stopListening() {
        UberReaderService.onTripDetected = null
    }

    // Required by RN's NativeEventEmitter
    @ReactMethod fun addListener(eventName: String) {}
    @ReactMethod fun removeListeners(count: Int) {}

    // ─── Private helpers ─────────────────────────────────────────────────────

    private fun checkServiceEnabled(): Boolean {
        val serviceFqn = "${ctx.packageName}/${UberReaderService::class.java.canonicalName}"
        val enabled = Settings.Secure.getString(
            ctx.contentResolver,
            Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
        ) ?: return false

        // The setting is a colon-separated list
        val splitter = TextUtils.SimpleStringSplitter(':')
        splitter.setString(enabled)
        while (splitter.hasNext()) {
            if (splitter.next().equals(serviceFqn, ignoreCase = true)) return true
        }
        return false
    }

    private fun buildParams(trip: TripData): WritableMap =
        Arguments.createMap().apply {
            putDouble("grossValue",       trip.grossValue)
            putDouble("distanceKm",       trip.distanceKm)
            putDouble("durationMinutes",  trip.durationMinutes)
            putDouble("passengerRating",  trip.passengerRating)
            putString("rawText",          trip.rawText)
        }
}
