package com.runon.app

import android.app.Activity
import android.util.Log
import com.facebook.react.bridge.*
import com.samsung.android.sdk.health.data.HealthDataService
import com.samsung.android.sdk.health.data.HealthDataStore
import com.samsung.android.sdk.health.data.data.HealthDataPoint
import com.samsung.android.sdk.health.data.permission.AccessType
import com.samsung.android.sdk.health.data.permission.Permission
import com.samsung.android.sdk.health.data.request.DataType
import com.samsung.android.sdk.health.data.request.DataType.ExerciseType
import com.samsung.android.sdk.health.data.request.DataType.ExerciseType.PredefinedExerciseType
import com.samsung.android.sdk.health.data.request.DataTypes
import com.samsung.android.sdk.health.data.data.entries.ExerciseSession
import com.samsung.android.sdk.health.data.request.LocalTimeFilter
import com.samsung.android.sdk.health.data.request.Ordering
import kotlinx.coroutines.*
import java.text.SimpleDateFormat
import java.time.LocalDateTime
import java.time.ZoneId
import java.util.*

class SamsungHealthModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    
    private val TAG = "SamsungHealthModule"
    private var healthDataStore: HealthDataStore? = null
    
    init {
        try {
            healthDataStore = HealthDataService.getStore(reactContext.applicationContext)
            Log.d(TAG, "Samsung Health SDK 초기화 성공")
        } catch (e: Exception) {
            Log.e(TAG, "Samsung Health SDK 초기화 실패", e)
        }
    }
    
    override fun getName(): String {
        return "SamsungHealth"
    }
    
    @ReactMethod
    fun isAvailable(promise: Promise) {
        try {
            val result = healthDataStore != null
            promise.resolve(result)
        } catch (e: Exception) {
            Log.e(TAG, "isAvailable 실패", e)
            promise.reject("ERROR", "Samsung Health 사용 가능 여부 확인 실패: ${e.message}", e)
        }
    }
    
    @ReactMethod
    fun checkPermissions(promise: Promise) {
        try {
            if (healthDataStore == null) {
                promise.resolve(createReactMap().apply {
                    putBoolean("isAvailable", false)
                    putBoolean("hasPermissions", false)
                    putString("error", "Samsung Health에 연결되지 않았습니다.")
                })
                return
            }
            
            val permSet = getPermissionSet()
            
            // 코루틴에서 suspend 함수 호출
            CoroutineScope(Dispatchers.IO).launch {
                try {
                    val grantedPermissions = healthDataStore?.getGrantedPermissions(permSet) ?: emptySet()
                    val hasAllPermissions = grantedPermissions.containsAll(permSet)
                    
                    val response = createReactMap().apply {
                        putBoolean("isAvailable", true)
                        putBoolean("hasPermissions", hasAllPermissions)
                        putString("error", null)
                    }
                    
                    withContext(Dispatchers.Main) {
                        promise.resolve(response)
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "checkPermissions 실패", e)
                    withContext(Dispatchers.Main) {
                        promise.reject("ERROR", "권한 확인 실패: ${e.message}", e)
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "checkPermissions 실패", e)
            promise.reject("ERROR", "권한 확인 실패: ${e.message}", e)
        }
    }
    
    @ReactMethod
    fun requestPermissions(promise: Promise) {
        try {
            val activity = reactApplicationContext.currentActivity
            if (activity == null) {
                promise.reject("ERROR", "Activity를 찾을 수 없습니다.")
                return
            }
            
            if (healthDataStore == null) {
                promise.reject("ERROR", "Samsung Health에 연결되지 않았습니다.")
                return
            }
            
            val permSet = getPermissionSet()
            
            // 코루틴에서 suspend 함수 호출
            CoroutineScope(Dispatchers.IO).launch {
                try {
                    // 이미 권한이 있으면 성공 반환
                    val grantedPermissions = healthDataStore?.getGrantedPermissions(permSet) ?: emptySet()
                    if (grantedPermissions.containsAll(permSet)) {
                        withContext(Dispatchers.Main) {
                            promise.resolve(true)
                        }
                        return@launch
                    }
                    
                    // 권한 요청
                    val result = healthDataStore?.requestPermissions(permSet, activity) ?: emptySet()
                    val isGranted = result.containsAll(permSet)
                    
                    withContext(Dispatchers.Main) {
                        promise.resolve(isGranted)
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "requestPermissions 실패", e)
                    withContext(Dispatchers.Main) {
                        promise.reject("ERROR", "권한 요청 실패: ${e.message}", e)
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "requestPermissions 실패", e)
            promise.reject("ERROR", "권한 요청 실패: ${e.message}", e)
        }
    }
    
    @ReactMethod
    fun getSamples(params: ReadableMap, promise: Promise) {
        try {
            if (healthDataStore == null) {
                promise.reject("ERROR", "Samsung Health에 연결되지 않았습니다.")
                return
            }
            
            val startDate = params.getString("startDate")
            val endDate = params.getString("endDate")
            val type = params.getString("type") ?: "Workout"
            
            if (startDate == null || endDate == null) {
                promise.reject("ERROR", "시작일과 종료일이 필요합니다.")
                return
            }
            
            val startTime = parseISOStringToLocalDateTime(startDate)
            val endTime = parseISOStringToLocalDateTime(endDate)
            
            // Exercise 데이터 조회
            val localTimeFilter = LocalTimeFilter.of(startTime, endTime)
            val readRequest = DataTypes.EXERCISE.readDataRequestBuilder
                .setLocalTimeFilter(localTimeFilter)
                .setOrdering(Ordering.DESC)
                .build()
            
            // 코루틴에서 suspend 함수 호출
            CoroutineScope(Dispatchers.IO).launch {
                try {
                    val result = healthDataStore?.readData(readRequest)
                    if (result == null) {
                        withContext(Dispatchers.Main) {
                            promise.reject("ERROR", "데이터 조회를 시작할 수 없습니다.")
                        }
                        return@launch
                    }
                    
                    val dataList = result.dataList
                    val results = mutableListOf<WritableMap>()
                    
                    dataList.forEach { dataPoint ->
                        val workout = createWorkoutMap(dataPoint)
                        if (workout != null) {
                            results.add(workout)
                        }
                    }
                    
                    val response = createReactArray().apply {
                        for (workout in results) {
                            pushMap(workout)
                        }
                    }
                    
                    withContext(Dispatchers.Main) {
                        promise.resolve(response)
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "getSamples 실패", e)
                    withContext(Dispatchers.Main) {
                        promise.reject("ERROR", "샘플 조회 실패: ${e.message}", e)
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "getSamples 실패", e)
            promise.reject("ERROR", "샘플 조회 실패: ${e.message}", e)
        }
    }
    
    @ReactMethod
    fun getWorkoutRouteSamples(params: ReadableMap, promise: Promise) {
        try {
            if (healthDataStore == null) {
                promise.reject("ERROR", "Samsung Health에 연결되지 않았습니다.")
                return
            }
            
            val workoutId = params.getString("id")
            if (workoutId == null) {
                promise.reject("ERROR", "워크아웃 ID가 필요합니다.")
                return
            }
            
            // Exercise Location 데이터 조회 (연관 데이터)
            // TODO: Exercise와 연관된 Location 데이터를 읽는 방법 확인 필요
            promise.reject("ERROR", "이동경로 조회는 아직 구현되지 않았습니다.")
        } catch (e: Exception) {
            Log.e(TAG, "getWorkoutRouteSamples 실패", e)
            promise.reject("ERROR", "이동경로 샘플 조회 실패: ${e.message}", e)
        }
    }
    
    // Helper 메서드들
    private fun getPermissionSet(): MutableSet<Permission> {
        return mutableSetOf(
            Permission.of(DataTypes.EXERCISE, AccessType.READ)
        )
    }
    
    private fun parseISOStringToLocalDateTime(isoString: String): LocalDateTime {
        return try {
            val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
            sdf.timeZone = TimeZone.getTimeZone("UTC")
            val date = sdf.parse(isoString) ?: throw IllegalArgumentException("Invalid date format")
            LocalDateTime.ofInstant(date.toInstant(), ZoneId.systemDefault())
        } catch (e: Exception) {
            Log.e(TAG, "날짜 파싱 실패: $isoString", e)
            LocalDateTime.now()
        }
    }
    
    private fun createWorkoutMap(dataPoint: HealthDataPoint): WritableMap? {
        return try {
            val workout = createReactMap()
            
            // Exercise type 확인 (Running만 필터링)
            val exerciseType = dataPoint.getValue(ExerciseType.EXERCISE_TYPE) as? PredefinedExerciseType
            if (exerciseType != PredefinedExerciseType.RUNNING) {
                return null
            }
            
            val startTime = dataPoint.startTime?.toEpochMilli() ?: 0L
            val endTime = dataPoint.endTime?.toEpochMilli() ?: 0L
            val duration = (endTime - startTime) / 1000 // 초 단위
            
            // SESSIONS에서 distance와 calories 가져오기
            val sessions = dataPoint.getValue(ExerciseType.SESSIONS) as? List<ExerciseSession> ?: emptyList()
            var totalDistance = 0.0
            var totalCalories = 0.0
            
            sessions.forEach { session ->
                session.distance?.let { totalDistance += it.toDouble() }
                totalCalories += session.calories.toDouble()
            }
            
            // HealthKit과 동일한 형식으로 변환
            workout.putString("start", formatDate(startTime))
            workout.putString("end", formatDate(endTime))
            workout.putDouble("duration", duration.toDouble())
            workout.putDouble("distance", totalDistance / 1609.34) // 미터를 마일로 변환 (HealthKit 형식)
            workout.putDouble("calories", totalCalories)
            workout.putString("activityName", "Running")
            workout.putInt("activityId", 1)
            
            workout
        } catch (e: Exception) {
            Log.e(TAG, "워크아웃 데이터 변환 실패", e)
            null
        }
    }
    
    private fun formatDate(timestamp: Long): String {
        val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
        sdf.timeZone = TimeZone.getTimeZone("UTC")
        return sdf.format(Date(timestamp))
    }
    
    private fun createReactMap(): WritableMap {
        return Arguments.createMap()
    }
    
    private fun createReactArray(): WritableArray {
        return Arguments.createArray()
    }
}
