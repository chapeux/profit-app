package com.motoganhos

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class TripReaderModule(private val reactContext: ReactApplicationContext)
    : ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "TripReaderModule"

    override fun initialize() {
        super.initialize()
        TripReaderService.onTripDetected = { trip ->
            val fuelCostPerKm = 0.50
            val netValue      = trip.grossValue - (trip.distanceKm * fuelCostPerKm)
            val valuePerKm    = if (trip.distanceKm > 0)      trip.grossValue / trip.distanceKm else 0.0
            val valuePerMin   = if (trip.durationMinutes > 0) trip.grossValue / trip.durationMinutes else 0.0
            val valuePerHour  = valuePerMin * 60.0

            val minKm = 1.50; val minHour = 30.0; val minMin = 0.50
            var score = 0
            if (valuePerKm   >= minKm)   score += 34 else if (valuePerKm   >= minKm   * 0.6) score += 17
            if (valuePerMin  >= minMin)  score += 33 else if (valuePerMin  >= minMin  * 0.6) score += 16
            if (valuePerHour >= minHour) score += 33 else if (valuePerHour >= minHour * 0.6) score += 16
            val signal = when { score >= 70 -> "green"; score >= 40 -> "yellow"; else -> "red" }

            // Mostrar overlay nativo sobre outros apps
            val ctx = reactContext.applicationContext
            val canOverlay = Build.VERSION.SDK_INT < Build.VERSION_CODES.M ||
                             Settings.canDrawOverlays(ctx)
            if (canOverlay) {
                Handler(Looper.getMainLooper()).post {
                    OverlayService.show(ctx, OverlayData(
                        gross   = trip.grossValue,
                        dist    = trip.distanceKm,
                        dur     = trip.durationMinutes,
                        rating  = trip.passengerRating,
                        signal  = signal,
                        score   = score,
                        perKm   = valuePerKm,
                        perHour = valuePerHour,
                        perMin  = valuePerMin,
                        net     = netValue,
                    ))
                }
            }

            // Emitir evento para o React Native (quando app estiver em foreground)
            val params = Arguments.createMap().apply {
                putDouble("grossValue",      trip.grossValue)
                putDouble("distanceKm",      trip.distanceKm)
                putDouble("durationMinutes", trip.durationMinutes)
                putDouble("passengerRating", trip.passengerRating)
                putDouble("netValue",        netValue)
                putDouble("valuePerKm",      valuePerKm)
                putDouble("valuePerHour",    valuePerHour)
                putDouble("valuePerMinute",  valuePerMin)
                putString("signal",          signal)
                putInt("score",              score)
            }
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit("TripReaderDetected", params)
        }
    }

    @ReactMethod fun isAvailable(promise: Promise)             { promise.resolve(true) }
    @ReactMethod fun startListening(promise: Promise)          { promise.resolve(null) }
    @ReactMethod fun stopListening(promise: Promise)           { promise.resolve(null) }
    @ReactMethod fun addListener(eventName: String)            {}
    @ReactMethod fun removeListeners(count: Int)               {}

    @ReactMethod
    fun isAccessibilityEnabled(promise: Promise) {
        promise.resolve(TripReaderService.isRunning)
    }

    @ReactMethod
    fun openAccessibilitySettings(promise: Promise) {
        reactContext.startActivity(
            Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
        )
        promise.resolve(null)
    }

    @ReactMethod
    fun hasOverlayPermission(promise: Promise) {
        val has = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M)
            Settings.canDrawOverlays(reactContext) else true
        promise.resolve(has)
    }

    @ReactMethod
    fun requestOverlayPermission(promise: Promise) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M &&
            !Settings.canDrawOverlays(reactContext)) {
            reactContext.startActivity(
                Intent(
                    Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:${reactContext.packageName}")
                ).apply { flags = Intent.FLAG_ACTIVITY_NEW_TASK }
            )
            promise.resolve(false)
        } else {
            promise.resolve(true)
        }
    }
}
