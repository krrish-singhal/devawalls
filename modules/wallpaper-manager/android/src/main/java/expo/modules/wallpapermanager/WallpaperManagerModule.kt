package expo.modules.wallpapermanager

import android.app.WallpaperManager
import android.graphics.BitmapFactory
import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.InputStream
import java.net.URL

class WallpaperManagerModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("WallpaperManager")

    AsyncFunction("setWallpaperAsync") { uri: String, screenType: String ->
      val context = appContext.reactContext ?: throw Exception("React context is not available")
      val wallpaperManager = WallpaperManager.getInstance(context)

      val inputStream: InputStream = if (uri.startsWith("file://")) {
        val cleanPath = uri.substring(7)
        java.io.File(cleanPath).inputStream()
      } else if (uri.startsWith("http://") || uri.startsWith("https://")) {
        URL(uri).openStream()
      } else {
        context.contentResolver.openInputStream(android.net.Uri.parse(uri))
          ?: throw Exception("Could not open input stream for URI: $uri")
      }

      val bitmap = BitmapFactory.decodeStream(inputStream)
        ?: throw Exception("Could not decode bitmap from stream")

      when (screenType) {
        "home" -> {
          if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            wallpaperManager.setBitmap(bitmap, null, true, WallpaperManager.FLAG_SYSTEM)
          } else {
            wallpaperManager.setBitmap(bitmap)
          }
        }
        "lock" -> {
          if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            wallpaperManager.setBitmap(bitmap, null, true, WallpaperManager.FLAG_LOCK)
          } else {
            throw Exception("Setting lock screen wallpaper is not supported on this Android version")
          }
        }
        "both" -> {
          if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            wallpaperManager.setBitmap(bitmap, null, true, WallpaperManager.FLAG_SYSTEM or WallpaperManager.FLAG_LOCK)
          } else {
            wallpaperManager.setBitmap(bitmap)
          }
        }
        else -> throw Exception("Invalid screen type: $screenType")
      }
    }
  }
}
