package com.motoganhos

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

/**
 * Registers UberReaderModule with the React Native runtime.
 * The config plugin (plugins/withUberAccessibility.js) injects this
 * package into MainApplication.kt during `expo prebuild`.
 */
class UberReaderPackage : ReactPackage {
    override fun createNativeModules(ctx: ReactApplicationContext): List<NativeModule> =
        listOf(UberReaderModule(ctx))

    override fun createViewManagers(ctx: ReactApplicationContext): List<ViewManager<*, *>> =
        emptyList()
}
