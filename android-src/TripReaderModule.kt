package com.motoganhos

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.text.TextUtils
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

            Handler(Looper.getMainLooper()).post {
                if (reactContext.hasActiveReactInstance()) {
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
        }
    }

    @ReactMethod fun isAvailable(promise: Promise)    { promise.resolve(true) }
    @ReactMethod fun startListening(promise: Promise) { promise.resolve(null) }
    @ReactMethod fun stopListening(promise: Promise)  { promise.resolve(null) }
    @ReactMethod fun addListener(eventName: String)   {}
    @ReactMethod fun removeListeners(count: Int)      {}

    @ReactMethod
    fun isAccessibilityEnabled(promise: Promise) {
        try {
            val fqn = "${reactContext.packageName}/${TripReaderService::class.java.canonicalName}"
            val enabled = Settings.Secure.getString(
                reactContext.contentResolver,
                Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
            ) ?: ""
            val splitter = TextUtils.SimpleStringSplitter(':')
            splitter.setString(enabled)
            while (splitter.hasNext()) {
                if (splitter.next().equals(fqn, ignoreCase = true)) {
                    promise.resolve(true)
                    return
                }
            }
            promise.resolve(false)
        } catch (e: Exception) {
            promise.resolve(false)
        }
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
