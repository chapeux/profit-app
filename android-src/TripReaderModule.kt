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
        // Registra callback para quando o app estiver em FOREGROUND
        // O overlay nativo é chamado pelo TripReaderService diretamente
        TripReaderService.onTripDetected = { trip ->
            Handler(Looper.getMainLooper()).post {
                if (reactContext.hasActiveReactInstance()) {
                    val params = Arguments.createMap().apply {
                        putDouble("grossValue",      trip.grossValue)
                        putDouble("distanceKm",      trip.distanceKm)
                        putDouble("durationMinutes", trip.durationMinutes)
                        putDouble("passengerRating", trip.passengerRating)
                        putString("rawText",         trip.rawText)
                    }
                    reactContext
                        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                        .emit("TripReaderDetected", params)
                }
            }
        }
    }

    @ReactMethod fun addListener(eventName: String)  {}
    @ReactMethod fun removeListeners(count: Int)     {}
    @ReactMethod fun startListening(promise: Promise) { promise.resolve(null) }
    @ReactMethod fun stopListening(promise: Promise)  { promise.resolve(null) }

    @ReactMethod
    fun isAccessibilityEnabled(promise: Promise) {
        try {
            val fqn = "${reactContext.packageName}/${TripReaderService::class.java.canonicalName}"
            val raw = Settings.Secure.getString(
                reactContext.contentResolver,
                Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
            ) ?: ""
            val splitter = TextUtils.SimpleStringSplitter(':')
            splitter.setString(raw)
            while (splitter.hasNext()) {
                if (splitter.next().equals(fqn, ignoreCase = true)) {
                    promise.resolve(true); return
                }
            }
            promise.resolve(false)
        } catch (e: Exception) { promise.resolve(false) }
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
    fun canDrawOverlays(promise: Promise) {
        val ok = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M)
            Settings.canDrawOverlays(reactContext) else true
        promise.resolve(ok)
    }

    @ReactMethod
    fun requestOverlayPermission(promise: Promise) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M
            && !Settings.canDrawOverlays(reactContext)) {
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
