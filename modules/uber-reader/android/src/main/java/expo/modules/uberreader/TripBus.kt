package expo.modules.uberreader

/**
 * Singleton event bus that decouples UberReaderService (in the host app's package)
 * from UberReaderModule (in this library package).
 *
 * Flow:
 *   UberReaderService → TripBus.callback → UberReaderModule → JS "onTripDetected" event
 *
 * Since the module is a compile-time dependency of the host app, the service class
 * (compiled into the host app) can safely reference TripBus at runtime.
 */
object TripBus {
    /** Set by UberReaderModule when the JS side calls startListening(). */
    @Volatile
    var callback: ((Map<String, Any>) -> Unit)? = null
}
