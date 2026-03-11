package com.motoganhos

import android.content.Context
import com.facebook.react.bridge.*

/**
 * Permite que o React Native salve as configurações no SharedPreferences,
 * para que o TripReaderService (que roda em background) possa lê-las.
 */
class SettingsModule(private val ctx: ReactApplicationContext)
    : ReactContextBaseJavaModule(ctx) {

    override fun getName() = "SettingsModule"

    @ReactMethod
    fun saveSettings(
        kmPerLiter:            Double,
        fuelPricePerLiter:     Double,
        costPerKmExtra:        Double,
        minGoodValuePerKm:     Double,
        minGoodValuePerMinute: Double,
        minGoodValuePerHour:   Double,
        promise: Promise,
    ) {
        try {
            val prefs = ctx.applicationContext
                .getSharedPreferences("motoganhos_settings", Context.MODE_PRIVATE)
            prefs.edit()
                .putFloat("kmPerLiter",            kmPerLiter.toFloat())
                .putFloat("fuelPricePerLiter",     fuelPricePerLiter.toFloat())
                .putFloat("costPerKmExtra",        costPerKmExtra.toFloat())
                .putFloat("minGoodValuePerKm",     minGoodValuePerKm.toFloat())
                .putFloat("minGoodValuePerMinute", minGoodValuePerMinute.toFloat())
                .putFloat("minGoodValuePerHour",   minGoodValuePerHour.toFloat())
                .apply()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("SETTINGS_ERROR", e.message)
        }
    }
}
