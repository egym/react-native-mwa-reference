package com.egym.reactnativemwareference

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.uimanager.ViewManager
import io.ionic.portals.PortalsPubSub

/**
 * Publishes a string on the shared Portals channel as it is. The SDK's `publish` wraps every value
 * as `{ message: value }`, but the MWAs read some topics, such as `authToken`, as a plain string.
 */
class PortalsStringPublisher(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {
  override fun getName() = "PortalsStringPublisher"

  @ReactMethod
  fun publish(topic: String, value: String) {
    PortalsPubSub.shared.publish(topic, value)
  }
}

class PortalsStringPublisherPackage : ReactPackage {
  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> =
      listOf(PortalsStringPublisher(reactContext))

  override fun createViewManagers(
      reactContext: ReactApplicationContext
  ): List<ViewManager<*, *>> = emptyList()
}
