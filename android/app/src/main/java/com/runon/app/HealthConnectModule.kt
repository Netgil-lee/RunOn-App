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
    // readRecords 페이지 크기 (Health Connect 허용 최대값)
    private val READ_PAGE_SIZE = 5000
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
            // SDK 상태로 사용 가능 여부 판단 (Android 14+ OS 내장 / 13 이하 APK 모두 대응)
            val status = HealthConnectClient.getSdkStatus(reactApplicationContext)
            val available = status == HealthConnectClient.SDK_AVAILABLE

            // 사용 가능한데 init 시점에 클라이언트 생성이 실패했다면 지연 생성 재시도
            if (available && healthConnectClient == null) {
                try {
                    healthConnectClient = HealthConnectClient.getOrCreate(reactApplicationContext.applicationContext)
                } catch (e: Exception) {
                    Log.e(TAG, "Health Connect 클라이언트 지연 초기화 실패", e)
                }
            }

            Log.d(TAG, "Health Connect SDK 상태: $status, 사용가능: ${available && healthConnectClient != null}")
            promise.resolve(available && healthConnectClient != null)
        } catch (e: Exception) {
            Log.e(TAG, "isAvailable 실패", e)
            promise.resolve(false)
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
            // 경로 좌표 포함 여부 (기본 true — 기존 호출부 호환). 통계처럼 경로가 필요 없으면 false
            val includeRoutes = if (params.hasKey("includeRoutes")) params.getBoolean("includeRoutes") else true
            
            scope.launch {
                try {
                    val timeRangeFilter = TimeRangeFilter.between(startTime, endTime)
                    
                    // ExerciseSession 레코드 조회 (전체 페이지)
                    val exerciseRecords = readAllRecords(ExerciseSessionRecord::class, timeRangeFilter)
                        .filter { it.exerciseType == ExerciseSessionRecord.EXERCISE_TYPE_RUNNING }
                    
                    // Distance 레코드 조회 (전체 페이지)
                    // 삼성헬스 등은 세션 하나에 거리 레코드를 여러 개 쓰므로 첫 페이지만 읽으면 거리가 누락된다
                    val distanceRecords = readAllRecords(DistanceRecord::class, timeRangeFilter)
                        .sortedBy { it.startTime }
                    val distanceStartTimes = distanceRecords.map { it.startTime }

                    val results = mutableListOf<WritableMap>()
                    
                    exerciseRecords.forEach { exerciseRecord ->
                        // 해당 운동 세션의 시간 범위에 맞는 거리 찾기
                        val sessionStart = exerciseRecord.startTime
                        val sessionEnd = exerciseRecord.endTime

                        // 거리 합계 계산 — 시작 시각 정렬 목록에서 세션 시작 지점부터만 훑는다
                        var totalDistance = 0.0
                        val searchIndex = distanceStartTimes.binarySearch(sessionStart)
                        var index = if (searchIndex >= 0) {
                            // 같은 시작 시각이 여러 개일 수 있으므로 첫 번째 위치까지 되돌린다
                            var first = searchIndex
                            while (first > 0 && distanceStartTimes[first - 1] == sessionStart) first--
                            first
                        } else {
                            -(searchIndex + 1)
                        }
                        while (index < distanceRecords.size && distanceRecords[index].startTime < sessionEnd) {
                            val distanceRecord = distanceRecords[index]
                            if (distanceRecord.endTime <= sessionEnd) {
                                // DistanceRecord의 distance 속성 사용
                                totalDistance += distanceRecord.distance.inMeters
                            }
                            index++
                        }

                        val workout = createWorkoutMap(exerciseRecord, totalDistance, includeRoutes)
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

            scope.launch {
                try {
                    // 단건 조회로 해당 운동 세션의 경로를 읽음
                    val response = healthConnectClient!!.readRecord(ExerciseSessionRecord::class, workoutId)
                    val routeArray = buildRouteArray(response.record)
                    promise.resolve(routeArray)
                } catch (e: Exception) {
                    Log.e(TAG, "getWorkoutRouteSamples 조회 실패", e)
                    // 경로 접근 불가/없음은 오류가 아니라 빈 경로로 처리
                    promise.resolve(createReactArray())
                }
            }
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
            HealthPermission.getReadPermission(DistanceRecord::class)
        )
    }
    
    // readRecords는 한 번에 한 페이지만 돌려주므로 pageToken이 빌 때까지 이어서 읽는다
    private suspend fun <T : Record> readAllRecords(
        recordType: kotlin.reflect.KClass<T>,
        timeRangeFilter: TimeRangeFilter
    ): List<T> {
        val records = mutableListOf<T>()
        var pageToken: String? = null
        do {
            val response = healthConnectClient!!.readRecords(
                ReadRecordsRequest(
                    recordType = recordType,
                    timeRangeFilter = timeRangeFilter,
                    pageSize = READ_PAGE_SIZE,
                    pageToken = pageToken
                )
            )
            records.addAll(response.records)
            pageToken = response.pageToken
        } while (!pageToken.isNullOrEmpty())
        return records
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
    
    private fun createWorkoutMap(record: ExerciseSessionRecord, distanceMeters: Double, includeRoute: Boolean): WritableMap? {
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
            workout.putDouble("calories", 0.0) // 칼로리는 Health Connect에서 읽지 않음(권한 제거). JS는 0 fallback 처리
            workout.putString("activityName", "Running")
            workout.putInt("activityId", 1)

            // 워크아웃 고유 ID (좋아요/메모 키, 경로 재조회에 사용)
            workout.putString("id", record.metadata.id)
            // 이동경로 좌표 (요청 시, 접근 가능한 경우 인라인으로 포함)
            workout.putArray("routeCoordinates", if (includeRoute) buildRouteArray(record) else createReactArray())

            workout
        } catch (e: Exception) {
            Log.e(TAG, "워크아웃 데이터 변환 실패", e)
            null
        }
    }

    // ExerciseSessionRecord에서 이동경로 좌표 배열 추출
    // 접근 권한이 있어 경로가 제공되는 경우(Data)에만 좌표를 반환, 그 외에는 빈 배열
    private fun buildRouteArray(record: ExerciseSessionRecord): WritableArray {
        val array = createReactArray()
        try {
            val routeResult = record.exerciseRouteResult
            if (routeResult is ExerciseRouteResult.Data) {
                routeResult.exerciseRoute.route.forEach { location ->
                    val point = createReactMap().apply {
                        putDouble("latitude", location.latitude)
                        putDouble("longitude", location.longitude)
                    }
                    array.pushMap(point)
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "경로 데이터 변환 실패", e)
        }
        return array
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

