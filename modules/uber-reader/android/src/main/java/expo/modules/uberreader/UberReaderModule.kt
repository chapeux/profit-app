package expo.modules.uberreader

import android.content.Context
import android.content.Intent
import android.provider.Settings
import android.text.TextUtils
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Expo Module — bridges the Android Accessibility Service to JavaScript.
 *
 * Automatically registered via expo autolinking (expo-module.config.json).
 * No MainApplication.kt patching required.
 *
 * JS events emitted:
 *   "onTripDetected" → { grossValue, distanceKm, durationMinutes, passengerRating, rawText }
 */
class UberReaderModule : Module() {

    override fun definition() = ModuleDefinition {

        Name("UberReaderModule")

        // JS event emitted when service detects a trip offer
        Events("onTripDetected")

        /**
         * Returns true if the user has enabled the accessibility service in Android Settings.
         * Call this after the user returns from Settings to check if they enabled it.
         */
        AsyncFunction("isAccessibilityEnabled") { ->
            checkServiceEnabled()
        }

        /**
         * Checks shared prefs written by the service in onServiceConnected/onDestroy.
         * More reliable than checking the accessibility settings string for running state.
         */
        AsyncFunction("isServiceRunning") { ->
            val prefs = appContext.reactContext
                ?.getSharedPreferences("UberReader", Context.MODE_PRIVATE)
            prefs?.getBoolean("serviceRunning", false) ?: false
        }

        /**
         * Opens Android Accessibility Settings so the user can enable the service.
         */
        Function("openAccessibilitySettings") { ->
            appContext.reactContext?.startActivity(
                Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
            )
        }

        /**
         * Registers the JS callback on TripBus so the service forwards events here.
         * Must be called before the service can deliver events to JS.
         */
        Function("startListening") { ->
            TripBus.callback = { params ->
                sendEvent("onTripDetected", params)
            }
        }

        /**
         * Removes the JS callback — service events are silently dropped until startListening().
         */
        Function("stopListening") { ->
            TripBus.callback = null
        }

        OnDestroy {
            TripBus.callback = null
        }
    }

    // ─── Private helpers ─────────────────────────────────────────────────────

    private fun checkServiceEnabled(): Boolean {
        val context = appContext.reactContext ?: return false

        // Fully-qualified service class name as registered in the manifest
        val serviceFqn = "${context.packageName}/com.motoganhos.UberReaderService"

        val enabledServices = Settings.Secure.getString(
            context.contentResolver,
            Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
        ) ?: return false

        // The setting is a colon-separated list of "package/ServiceClass" entries
        val splitter = TextUtils.SimpleStringSplitter(':')
        splitter.setString(enabledServices)
        while (splitter.hasNext()) {
            if (splitter.next().equals(serviceFqn, ignoreCase = true)) return true
        }
        return false
    }
}
