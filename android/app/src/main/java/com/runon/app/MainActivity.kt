package com.runon.app
import expo.modules.splashscreen.SplashScreenManager

import android.os.Build
import android.os.Bundle
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.result.ActivityResultLauncher
import android.content.Context
import android.content.Intent
import android.content.res.Configuration
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import com.facebook.react.bridge.Promise
import android.util.Log
import kotlinx.coroutines.*

import com.facebook.react.ReactActivity
import com.runon.app.R
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

import expo.modules.ReactActivityDelegateWrapper

class MainActivity : ReactActivity() {
    private var healthConnectPermissionLauncher: ActivityResultLauncher<Set<String>>? = null
    private var pendingPermissionPromise: Promise? = null

    /**
     * 시스템 글씨 크기(fontScale)를 앱 전체에서 최대 1.15배로 제한한다.
     * 사용자가 휴대폰 설정에서 글씨 크기를 크게 키워도 텍스트가 컨테이너를 넘거나
     * 화면 밖으로 나가는 레이아웃 깨짐을 방지한다. (모든 Text/TextInput에 일괄 적용)
     */
    override fun attachBaseContext(newBase: Context) {
        val configuration = Configuration(newBase.resources.configuration)
        if (configuration.fontScale > MAX_FONT_SCALE) {
            configuration.fontScale = MAX_FONT_SCALE
        }
        val context = newBase.createConfigurationContext(configuration)
        super.attachBaseContext(context)
    }

    companion object {
        private const val MAX_FONT_SCALE = 1.15f
    }
    
    private fun setupHealthConnectPermissionLauncher() {
        try {
            // Health Connect 표준 권한 요청 계약(Contract) 사용 - 결과로 부여된 권한 Set을 직접 받음
            val requestPermissionContract = PermissionController.createRequestPermissionResultContract()
            healthConnectPermissionLauncher = registerForActivityResult(requestPermissionContract) { granted ->
                val promise = pendingPermissionPromise
                pendingPermissionPromise = null

                if (promise != null) {
                    // 경로 권한(선택)은 판정에서 제외하고 핵심 권한(운동/거리/칼로리)만으로 판정
                    val corePermissions = getCoreHealthPermissions()
                    val hasAllPermissions = granted.containsAll(corePermissions)

                    Log.d("MainActivity", "권한 요청 결과 - 부여된 권한: $granted")
                    Log.d("MainActivity", "핵심 권한 모두 부여됨: $hasAllPermissions")
                    promise.resolve(hasAllPermissions)
                }
            }
        } catch (e: Exception) {
            Log.e("MainActivity", "Health Connect 권한 launcher 설정 실패", e)
        }
    }
    
    // 권한 판정 기준이 되는 핵심 권한(운동 세션/거리/칼로리)
    private fun getCoreHealthPermissions(): Set<String> {
        // HealthPermission.getReadPermission()은 String을 반환
        return setOf(
            HealthPermission.getReadPermission(androidx.health.connect.client.records.ExerciseSessionRecord::class),
            HealthPermission.getReadPermission(androidx.health.connect.client.records.DistanceRecord::class),
            HealthPermission.getReadPermission(androidx.health.connect.client.records.TotalCaloriesBurnedRecord::class)
        )
    }

    // 실제로 요청(launch)하는 권한 집합 = 핵심 권한 + 이동경로(선택)
    // 경로 권한은 지원 기기에서만 부여되며, 판정에는 포함하지 않는다.
    private fun getRequestedHealthPermissions(): Set<String> {
        return getCoreHealthPermissions() + "android.permission.health.READ_EXERCISE_ROUTES"
    }
    
    fun requestHealthConnectPermissions(permissions: List<String>, promise: Promise) {
        try {
            Log.d("MainActivity", "Health Connect 권한 요청 시작")

            pendingPermissionPromise = promise

            if (healthConnectPermissionLauncher == null) {
                setupHealthConnectPermissionLauncher()
            }

            val launcher = healthConnectPermissionLauncher
            if (launcher != null) {
                // 표준 계약으로 Health Connect 권한 부여 화면 실행
                // (Android 14+ OS 내장 / Android 13 이하 APK 모두 동일하게 동작)
                launcher.launch(getRequestedHealthPermissions())
                Log.d("MainActivity", "Health Connect 권한 요청 화면 실행됨")
            } else {
                pendingPermissionPromise = null
                Log.e("MainActivity", "healthConnectPermissionLauncher가 null입니다.")
                promise.reject("ERROR", "권한 요청 launcher를 초기화할 수 없습니다.")
            }
        } catch (e: Exception) {
            pendingPermissionPromise = null
            Log.e("MainActivity", "권한 요청 실패", e)
            promise.reject("ERROR", "권한 요청 실패: ${e.message}", e)
        }
    }
  override fun onCreate(savedInstanceState: Bundle?) {
    // Android 12 이전 버전에서는 스플래시 화면 테마를 명시적으로 설정
    // Android 12+ (API 31+)에서는 AndroidManifest.xml의 테마가 자동으로 적용됨
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
      // Android 12 이전 버전에서는 스플래시 화면 테마를 설정
      setTheme(R.style.Theme_App_SplashScreen)
    }
    // @generated begin expo-splashscreen - expo prebuild (DO NOT MODIFY) sync-f3ff59a738c56c9a6119210cb55f0b613eb8b6af
    SplashScreenManager.registerOnActivity(this)
    // @generated end expo-splashscreen
    super.onCreate(null)
    
    // Health Connect 권한 launcher 설정
    setupHealthConnectPermissionLauncher()
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "main"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate {
    return ReactActivityDelegateWrapper(
          this,
          BuildConfig.IS_NEW_ARCHITECTURE_ENABLED,
          object : DefaultReactActivityDelegate(
              this,
              mainComponentName,
              fabricEnabled
          ){})
  }

  /**
    * Align the back button behavior with Android S
    * where moving root activities to background instead of finishing activities.
    * @see <a href="https://developer.android.com/reference/android/app/Activity#onBackPressed()">onBackPressed</a>
    */
  override fun invokeDefaultOnBackPressed() {
      if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.R) {
          if (!moveTaskToBack(false)) {
              // For non-root activities, use the default implementation to finish them.
              super.invokeDefaultOnBackPressed()
          }
          return
      }

      // Use the default back button implementation on Android S
      // because it's doing more than [Activity.moveTaskToBack] in fact.
      super.invokeDefaultOnBackPressed()
  }
}
