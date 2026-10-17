package com.egym.reactnativemwareference

import android.content.Context
import android.os.Bundle
import android.view.View
import androidx.core.graphics.Insets
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.fragment.app.Fragment
import androidx.fragment.app.FragmentManager
import com.egym.capacitor.mwanavigation.EgymMwa
import com.getcapacitor.CapConfig
import io.ionic.portals.PortalFragment
import org.json.JSONObject

/**
 * Leaves the system bars to the React Native screen that shows a Portal, and keeps the Portal above
 * the keyboard. Without it, Capacitor's SystemBars plugin pads the whole React Native window, and a
 * WebView 140 or newer pads the MWA again.
 */
object PortalInsets : FragmentManager.FragmentLifecycleCallbacks() {
  private val barInsetTypes =
      WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout()

  override fun onFragmentAttached(fm: FragmentManager, f: Fragment, context: Context) {
    if (f !is PortalFragment) return
    f.setConfig(
        CapConfig.Builder(context)
            .setInitialFocus(false)
            .setPluginsConfiguration(
                JSONObject()
                    .put("SystemBars", JSONObject().put("insetsHandling", "disable"))
                    // The package's App plugin would otherwise take Android back from React Native.
                    .put("App", JSONObject().put("disableBackButtonHandler", true)))
            .create())
    // The package's Status Bar plugin makes the MWA add its own safe area padding on top of this screen's.
    f.addWebViewListener(EgymMwa.zeroCssSafeAreaListener())
  }

  override fun onFragmentViewCreated(
      fm: FragmentManager,
      f: Fragment,
      v: View,
      savedInstanceState: Bundle?
  ) {
    if (f !is PortalFragment) return
    ViewCompat.setOnApplyWindowInsetsListener(v) { view, insets ->
      view.setPadding(0, 0, 0, keyboardOverlap(view, insets))
      WindowInsetsCompat.Builder(insets).setInsets(barInsetTypes, Insets.NONE).build()
    }
    ViewCompat.requestApplyInsets(v)
  }

  private fun keyboardOverlap(view: View, insets: WindowInsetsCompat): Int {
    val keyboardTop = view.rootView.height - insets.getInsets(WindowInsetsCompat.Type.ime()).bottom
    val location = IntArray(2)
    view.getLocationInWindow(location)
    return (location[1] + view.height - keyboardTop).coerceAtLeast(0)
  }
}
