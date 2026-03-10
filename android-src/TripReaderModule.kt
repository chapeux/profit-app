package com.motoganhos

import android.content.Intent
import android.provider.Settings
import android.text.TextUtils
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class TripReaderModule(private val ctx: ReactApplicationContext) : ReactContextBaseJavaModule(ctx) {

    override fun getName(): String = "TripReaderModule"

    @ReactMethod
    fun isAccessibilityEnabled(promise: Promise) {
        try { promise.resolve(checkServiceEnabled()) } catch (e: Exception) { promise.reject("ERR_ACCESSIBILITY", e.message) }
    }

    @ReactMethod
    fun openAccessibilitySettings() {
        ctx.startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).apply { addFlags(Intent.FLAG_ACTIVITY_NEW_TASK) })
    }

    @ReactMethod fun isServiceRunning(promise: Promise) { promise.resolve(TripReaderService.isRunning) }

    @ReactMethod
    fun startListening() {
        TripReaderService.onTripDetected = { trip ->
            if (ctx.hasActiveReactInstance()) {
                ctx.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    .emit("TripReaderDetected", buildParams(trip))
            }
        }
    }

    @ReactMethod fun stopListening() { TripReaderService.onTripDetected = null }
    @ReactMethod fun addListener(eventName: String) {}
    @ReactMethod fun removeListeners(count: Int) {}

    private fun checkServiceEnabled(): Boolean {
        val fqn = "${ctx.packageName}/${TripReaderService::class.java.canonicalName}"
        val enabled = Settings.Secure.getString(ctx.contentResolver, Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES) ?: return false
        val splitter = TextUtils.SimpleStringSplitter(':')
        splitter.setString(enabled)
        while (splitter.hasNext()) { if (splitter.next().equals(fqn, ignoreCase = true)) return true }
        return false
    }

    private fun buildParams(trip: TripData): WritableMap = Arguments.createMap().apply {
        putDouble("grossValue", trip.grossValue)
        putDouble("distanceKm", trip.distanceKm)
        putDouble("durationMinutes", trip.durationMinutes)
        putDouble("passengerRating", trip.passengerRating)
        putString("rawText", trip.rawText)
    }
}
