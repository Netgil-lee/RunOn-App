package com.runon.app

import android.app.Activity
import android.content.Intent
import android.util.Log
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.aggregate.AggregationResult
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.*
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.DistanceRecord
import androidx.health.connect.client.records.TotalCaloriesBurnedRecord
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import androidx.activity.result.contract.ActivityResultContracts
import com.facebook.react.bridge.*
import com.runon.app.MainActivity
import kotlinx.coroutines.*
import java.time.Instant
import java.time.ZoneId
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter
import java.util.*

class HealthConnectModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    
    private val TAG = "HealthConnectModule"
    private var healthConnectClient: HealthConnectClient? = null
    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    
    init {
        try {
            healthConnectClient = HealthConnectClient.getOrCreate(reactContext.applicationContext)
            Log.d(TAG, "Health Connect SDK 초기화 성공")
        } catch (e: Exception) {
            Log.e(TAG, "Health Connect SDK 초기화 실패", e)
        }
    }
    
    override fun getName(): String {
        return "HealthConnect"
    }
    
    @ReactMethod
    fun isAvailable(promise: Promise) {
        try {
            val result = healthConnectClient != null
            promise.resolve(result)
        } catch (e: Exception) {
            Log.e(TAG, "isAvailable 실패", e)
            promise.reject("ERROR", "Health Connect 사용 가능 여부 확인 실패: ${e.message}", e)
        }
    }
    
    @ReactMethod
    fun checkPermissions(promise: Promise) {
        try {
            if (healthConnectClient == null) {
                promise.resolve(createReactMap().apply {
                    putBoolean("isAvailable", false)
                    putBoolean("hasPermissions", false)
                    putString("error", "Health Connect에 연결되지 않았습니다.")
                })
                return
            }
            
            val permissions = getRequiredPermissions()
            
            scope.launch {
                try {
                    val permissionController = healthConnectClient!!.permissionController
                    val grantedPermissions = permissionController.getGrantedPermissions()
                    // getGrantedPermissions()와 permissions 모두 Set<String>이므로 직접 비교
                    val hasAllPermissions = grantedPermissions.containsAll(permissions)
                    
                    val response = createReactMap().apply {
                        putBoolean("isAvailable", true)
                        putBoolean("hasPermissions", hasAllPermissions)
                        putString("error", null)
                    }
                    
                    promise.resolve(response)
                } catch (e: Exception) {
                    Log.e(TAG, "checkPermissions 실패", e)
                    promise.reject("ERROR", "권한 확인 실패: ${e.message}", e)
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
            
            if (healthConnectClient == null) {
                promise.reject("ERROR", "Health Connect에 연결되지 않았습니다.")
                return
            }
            
            val permissions = getRequiredPermissions()
            
            scope.launch {
                try {
                    // 이미 권한이 있으면 성공 반환
                    val permissionController = healthConnectClient!!.permissionController
                    val grantedPermissions = permissionController.getGrantedPermissions()
                    // getGrantedPermissions()와 permissions 모두 Set<String>이므로 직접 비교
                    if (grantedPermissions.containsAll(permissions)) {
                        promise.resolve(true)
                        return@launch
                    }
                    
                    // MainActivity에서 ActivityResultLauncher를 통해 실행
                    withContext(Dispatchers.Main) {
                        if (activity is MainActivity) {
                            val mainActivity = activity as MainActivity
                            // permissions는 이미 Set<String>이므로 toList() 사용
                            mainActivity.requestHealthConnectPermissions(permissions.toList(), promise)
                        } else {
                            promise.reject("ERROR", "MainActivity를 찾을 수 없습니다.")
                        }
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "requestPermissions 실패", e)
                    promise.reject("ERROR", "권한 요청 실패: ${e.message}", e)
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
            if (healthConnectClient == null) {
                promise.reject("ERROR", "Health Connect에 연결되지 않았습니다.")
                return
            }
            
            val startDate = params.getString("startDate")
            val endDate = params.getString("endDate")
            val type = params.getString("type") ?: "Workout"
            
            if (startDate == null || endDate == null) {
                promise.reject("ERROR", "시작일과 종료일이 필요합니다.")
                return
            }
            
            val startTime = parseISOStringToInstant(startDate)
            val endTime = parseISOStringToInstant(endDate)
            
            scope.launch {
                try {
                    val timeRangeFilter = TimeRangeFilter.between(startTime, endTime)
                    
                    // ExerciseSession 레코드 조회
                    val exerciseRequest = ReadRecordsRequest(
                        recordType = ExerciseSessionRecord::class,
                        timeRangeFilter = timeRangeFilter
                    )
                    
                    val exerciseResponse = healthConnectClient!!.readRecords(exerciseRequest)
                    val exerciseRecords = exerciseResponse.records.filterIsInstance<ExerciseSessionRecord>()
                        .filter { it.exerciseType == ExerciseSessionRecord.EXERCISE_TYPE_RUNNING }
                    
                    // Distance 레코드 조회
                    val distanceRequest = ReadRecordsRequest(
                        recordType = DistanceRecord::class,
                        timeRangeFilter = timeRangeFilter
                    )
                    val distanceResponse = healthConnectClient!!.readRecords(distanceRequest)
                    val distanceRecords = distanceResponse.records.filterIsInstance<DistanceRecord>()
                    
                    // TotalCaloriesBurned 레코드 조회
                    val caloriesRequest = ReadRecordsRequest(
                        recordType = TotalCaloriesBurnedRecord::class,
                        timeRangeFilter = timeRangeFilter
                    )
                    val caloriesResponse = healthConnectClient!!.readRecords(caloriesRequest)
                    val caloriesRecords = caloriesResponse.records.filterIsInstance<TotalCaloriesBurnedRecord>()
                    
                    val results = mutableListOf<WritableMap>()
                    
                    exerciseRecords.forEach { exerciseRecord ->
                        // 해당 운동 세션의 시간 범위에 맞는 거리와 칼로리 찾기
                        val sessionStart = exerciseRecord.startTime
                        val sessionEnd = exerciseRecord.endTime
                        
                        // 거리 합계 계산
                        var totalDistance = 0.0
                        distanceRecords.forEach { distanceRecord ->
                            if (distanceRecord.startTime >= sessionStart && distanceRecord.endTime <= sessionEnd) {
                                // DistanceRecord의 distance 속성 사용
                                totalDistance += distanceRecord.distance.inMeters.toDouble()
                            }
                        }
                        
                        // 칼로리 합계 계산
                        var totalCalories = 0.0
                        caloriesRecords.forEach { caloriesRecord ->
                            if (caloriesRecord.startTime >= sessionStart && caloriesRecord.endTime <= sessionEnd) {
                                totalCalories += caloriesRecord.energy.inKilocalories
                            }
                        }
                        
                        val workout = createWorkoutMap(exerciseRecord, totalDistance, totalCalories)
                        if (workout != null) {
                            results.add(workout)
                        }
                    }
                    
                    val responseArray = createReactArray().apply {
                        for (workout in results) {
                            pushMap(workout)
                        }
                    }
                    
                    promise.resolve(responseArray)
                } catch (e: Exception) {
                    Log.e(TAG, "getSamples 실패", e)
                    promise.reject("ERROR", "샘플 조회 실패: ${e.message}", e)
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
            if (healthConnectClient == null) {
                promise.reject("ERROR", "Health Connect에 연결되지 않았습니다.")
                return
            }
            
            val workoutId = params.getString("id")
            if (workoutId == null) {
                promise.reject("ERROR", "워크아웃 ID가 필요합니다.")
                return
            }
            
            // Health Connect에서 Location 데이터 조회
            // ExerciseSession과 연관된 Location 데이터를 읽는 방법 확인 필요
            promise.reject("ERROR", "이동경로 조회는 아직 구현되지 않았습니다.")
        } catch (e: Exception) {
            Log.e(TAG, "getWorkoutRouteSamples 실패", e)
            promise.reject("ERROR", "이동경로 샘플 조회 실패: ${e.message}", e)
        }
    }
    
    // Helper 메서드들
    private fun getRequiredPermissions(): Set<String> {
        // HealthPermission.getReadPermission()은 String을 반환
        return setOf(
            HealthPermission.getReadPermission(ExerciseSessionRecord::class),
            HealthPermission.getReadPermission(DistanceRecord::class),
            HealthPermission.getReadPermission(TotalCaloriesBurnedRecord::class)
        )
    }
    
    private fun parseISOStringToInstant(isoString: String): Instant {
        return try {
            val formatter = DateTimeFormatter.ISO_INSTANT
            Instant.parse(isoString)
        } catch (e: Exception) {
            Log.e(TAG, "날짜 파싱 실패: $isoString", e)
            Instant.now()
        }
    }
    
    private fun createWorkoutMap(record: ExerciseSessionRecord, distanceMeters: Double, calories: Double): WritableMap? {
        return try {
            val workout = createReactMap()
            
            val startTime = record.startTime.toEpochMilli()
            val endTime = record.endTime.toEpochMilli()
            val duration = (endTime - startTime) / 1000 // 초 단위
            
            // HealthKit과 동일한 형식으로 변환
            workout.putString("start", formatDate(startTime))
            workout.putString("end", formatDate(endTime))
            workout.putDouble("duration", duration.toDouble())
            workout.putDouble("distance", distanceMeters / 1609.34) // 미터를 마일로 변환 (HealthKit 형식)
            workout.putDouble("calories", calories)
            workout.putString("activityName", "Running")
            workout.putInt("activityId", 1)
            
            workout
        } catch (e: Exception) {
            Log.e(TAG, "워크아웃 데이터 변환 실패", e)
            null
        }
    }
    
    private fun formatDate(timestamp: Long): String {
        val instant = Instant.ofEpochMilli(timestamp)
        return instant.toString()
    }
    
    private fun createReactMap(): WritableMap {
        return Arguments.createMap()
    }
    
    private fun createReactArray(): WritableArray {
        return Arguments.createArray()
    }
}

