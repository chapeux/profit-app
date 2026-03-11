package com.motoganhos

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class TripReaderModule(private val reactContext: ReactApplicationContext)
    : ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "TripReaderModule"

    override fun initialize() {
        super.initialize()
        // Hook into the accessibility service so it can emit events AND show overlay
        TripReaderService.onTripDetected = { trip ->
            // Calculate metrics
            val fuelCostPerKm = 0.50
            val netValue      = trip.grossValue - (trip.distanceKm * fuelCostPerKm)
            val valuePerKm    = if (trip.distanceKm > 0) trip.grossValue / trip.distanceKm else 0.0
            val valuePerMin   = if (trip.durationMinutes > 0) trip.grossValue / trip.durationMinutes else 0.0
            val valuePerHour  = valuePerMin * 60.0

            // Simple scoring (mirrors AppContext logic)
            val minKm  = 1.50; val minHour = 30.0; val minMin = 0.50
            var score = 0
            if (valuePerKm  >= minKm)   score += 34 else if (valuePerKm  >= minKm  * 0.6) score += 17
            if (valuePerMin >= minMin)  score += 33 else if (valuePerMin >= minMin * 0.6) score += 16
            if (valuePerHour >= minHour) score += 33 else if (valuePerHour >= minHour * 0.6) score += 16
            val signal = when { score >= 70 -> "green"; score >= 40 -> "yellow"; else -> "red" }

            // Show native overlay over all apps
            val ctx = reactContext.applicationContext
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(ctx)) {
                android.os.Handler(android.os.Looper.getMainLooper()).post {
                    TripOverlayView.show(ctx, trip, signal, score,
                        valuePerKm, valuePerHour, valuePerMin, netValue)
                }
            }

            // Also emit JS event (for when app is open)
            val params = Arguments.createMap().apply {
                putDouble("grossValue",       trip.grossValue)
                putDouble("distanceKm",       trip.distanceKm)
                putDouble("durationMinutes",  trip.durationMinutes)
                putDouble("passengerRating",  trip.passengerRating)
                putDouble("netValue",         netValue)
                putDouble("valuePerKm",       valuePerKm)
                putDouble("valuePerHour",     valuePerHour)
                putDouble("valuePerMinute",   valuePerMin)
                putString("signal",           signal)
                putInt("score",               score)
            }
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit("TripReaderDetected", params)
        }
    }

    @ReactMethod
    fun isAvailable(promise: Promise) {
        promise.resolve(true)
    }

    @ReactMethod
    fun isAccessibilityEnabled(promise: Promise) {
        promise.resolve(TripReaderService.isRunning)
    }

    @ReactMethod
    fun startListening(promise: Promise) {
        promise.resolve(null)
    }

    @ReactMethod
    fun stopListening(promise: Promise) {
        promise.resolve(null)
    }

    @ReactMethod
    fun openAccessibilitySettings(promise: Promise) {
        val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
        reactContext.startActivity(intent)
        promise.resolve(null)
    }

    @ReactMethod
    fun requestOverlayPermission(promise: Promise) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(reactContext)) {
            val intent = Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:${reactContext.packageName}")
            ).apply { flags = Intent.FLAG_ACTIVITY_NEW_TASK }
            reactContext.startActivity(intent)
            promise.resolve(false)
        } else {
            promise.resolve(true)
        }
    }

    @ReactMethod
    fun hasOverlayPermission(promise: Promise) {
        val has = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M)
            Settings.canDrawOverlays(reactContext) else true
        promise.resolve(has)
    }

    @ReactMethod
    fun addListener(eventName: String) {}

    @ReactMethod
    fun removeListeners(count: Int) {}
}
