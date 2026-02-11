package com.runon.app
import expo.modules.splashscreen.SplashScreenManager

import android.os.Build
import android.os.Bundle
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.result.ActivityResultLauncher
import android.content.Intent
import androidx.health.connect.client.HealthConnectClient
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
    private var healthConnectPermissionLauncher: ActivityResultLauncher<Intent>? = null
    private var pendingPermissionPromise: Promise? = null
    
    private fun setupHealthConnectPermissionLauncher() {
        try {
            // Health Connect 권한 요청을 위한 ActivityResultLauncher 생성
            healthConnectPermissionLauncher = registerForActivityResult(
                ActivityResultContracts.StartActivityForResult()
            ) { result ->
                val promise = pendingPermissionPromise
                pendingPermissionPromise = null
                
                if (promise != null) {
                    // 권한 요청 후 결과는 코루틴에서 확인
                    val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())
                    scope.launch {
                        try {
                            val healthConnectClient = HealthConnectClient.getOrCreate(this@MainActivity)
                            val permissionController = healthConnectClient.permissionController
                            val requestedPermissions = getRequestedHealthPermissions()
                            val grantedPermissions = permissionController.getGrantedPermissions()
                            
                            Log.d("MainActivity", "권한 요청 결과 확인")
                            Log.d("MainActivity", "요청한 권한: $requestedPermissions")
                            Log.d("MainActivity", "부여된 권한: $grantedPermissions")
                            
                            // getGrantedPermissions()와 requestedPermissions 모두 Set<String>이므로 직접 비교
                            val hasAllPermissions = grantedPermissions.containsAll(requestedPermissions)
                            
                            Log.d("MainActivity", "모든 권한 부여됨: $hasAllPermissions")
                            promise.resolve(hasAllPermissions)
                        } catch (e: Exception) {
                            Log.e("MainActivity", "권한 결과 처리 실패", e)
                            promise.reject("ERROR", "권한 결과 처리 실패: ${e.message}", e)
                        }
                    }
                }
            }
        } catch (e: Exception) {
            Log.e("MainActivity", "Health Connect 권한 launcher 설정 실패", e)
        }
    }
    
    private fun getRequestedHealthPermissions(): Set<String> {
        // HealthConnectModule에서 요청한 권한과 동일하게 설정
        // HealthPermission.getReadPermission()은 String을 반환
        return setOf(
            HealthPermission.getReadPermission(androidx.health.connect.client.records.ExerciseSessionRecord::class),
            HealthPermission.getReadPermission(androidx.health.connect.client.records.DistanceRecord::class),
            HealthPermission.getReadPermission(androidx.health.connect.client.records.TotalCaloriesBurnedRecord::class)
        )
    }
    
    fun requestHealthConnectPermissions(permissions: List<String>, promise: Promise) {
        try {
            Log.d("MainActivity", "Health Connect 권한 요청 시작")
            Log.d("MainActivity", "요청할 권한: $permissions")
            
            pendingPermissionPromise = promise
            
            if (healthConnectPermissionLauncher == null) {
                setupHealthConnectPermissionLauncher()
            }
            
            // Health Connect 앱이 설치되어 있는지 확인
            val healthConnectPackage = "com.google.android.apps.healthdata"
            val packageManager = packageManager
            try {
                packageManager.getPackageInfo(healthConnectPackage, 0)
                Log.d("MainActivity", "Health Connect 앱이 설치되어 있습니다.")
            } catch (e: Exception) {
                Log.e("MainActivity", "Health Connect 앱이 설치되지 않았습니다.", e)
                // Play 스토어로 이동
                try {
                    val intent = Intent(Intent.ACTION_VIEW)
                        .setData(android.net.Uri.parse("market://details?id=$healthConnectPackage"))
                    startActivity(intent)
                    promise.reject("ERROR", "Health Connect 앱이 설치되지 않았습니다. Play 스토어에서 설치해주세요.")
                } catch (fallbackError: Exception) {
                    promise.reject("ERROR", "Health Connect 앱이 설치되지 않았습니다. Play 스토어에서 'Health Connect'를 검색하여 설치해주세요.")
                }
                return
            }
            
            // Health Connect 권한 요청 Intent 생성
            // 최신 Health Connect SDK에서는 이 방식이 권장됨
            val intent = Intent("androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE")
                .setPackage(healthConnectPackage)
            
            // 권한을 Intent에 추가
            val requestedPermissions = getRequestedHealthPermissions()
            intent.putExtra("androidx.health.REQUESTED_PERMISSIONS", 
                requestedPermissions.toTypedArray())
            
            Log.d("MainActivity", "Health Connect 권한 요청 Intent 생성 완료")
            
            if (healthConnectPermissionLauncher != null) {
                healthConnectPermissionLauncher!!.launch(intent)
                Log.d("MainActivity", "Health Connect 권한 요청 Intent 실행됨")
            } else {
                Log.e("MainActivity", "healthConnectPermissionLauncher가 null입니다.")
                promise.reject("ERROR", "권한 요청 launcher를 초기화할 수 없습니다.")
            }
        } catch (e: Exception) {
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
