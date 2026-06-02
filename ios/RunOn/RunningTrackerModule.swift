import Foundation
import CoreLocation
import React

@objc(RunningTrackerModule)
class RunningTrackerModule: RCTEventEmitter {

  private let locationManager = CLLocationManager()
  private var lastLocation: CLLocation?
  private var isPaused: Bool = false
  private var isTracking: Bool = false
  private var trackingStartDate: Date?

  // Pace: 30-second sliding window of (deltaMeters, timestamp) pairs
  private var paceSamples: [(deltaMeters: Double, timestamp: Date)] = []
  private let paceWindowSec: TimeInterval = 30
  private let paceWarmupSec: TimeInterval = 3

  override init() {
    super.init()
    locationManager.delegate = self
    locationManager.desiredAccuracy = kCLLocationAccuracyBestForNavigation
    locationManager.distanceFilter = 2
    locationManager.activityType = .fitness
    locationManager.pausesLocationUpdatesAutomatically = false
    locationManager.allowsBackgroundLocationUpdates = true
    locationManager.showsBackgroundLocationIndicator = true
  }

  override static func requiresMainQueueSetup() -> Bool { return false }

  override func supportedEvents() -> [String]! {
    return ["onLocationUpdate", "onTrackingError"]
  }

  // MARK: - JS-callable methods

  @objc func startTracking(_ resolve: @escaping RCTPromiseResolveBlock,
                            rejecter reject: @escaping RCTPromiseRejectBlock) {
    lastLocation = nil
    isPaused = false
    isTracking = true
    paceSamples = []
    trackingStartDate = Date()
    locationManager.startUpdatingLocation()
    resolve(nil)
  }

  @objc func stopTracking(_ resolve: @escaping RCTPromiseResolveBlock,
                           rejecter reject: @escaping RCTPromiseRejectBlock) {
    isTracking = false
    locationManager.stopUpdatingLocation()
    resolve(nil)
  }

  @objc func pauseTracking(_ resolve: @escaping RCTPromiseResolveBlock,
                            rejecter reject: @escaping RCTPromiseRejectBlock) {
    isPaused = true
    paceSamples = []
    resolve(nil)
  }

  @objc func resumeTracking(_ resolve: @escaping RCTPromiseResolveBlock,
                              rejecter reject: @escaping RCTPromiseRejectBlock) {
    // Reset lastLocation so the gap from pause doesn't count as distance
    lastLocation = nil
    isPaused = false
    resolve(nil)
  }

  // MARK: - Pace

  private func appendPaceSample(deltaMeters: Double, at timestamp: Date) -> String {
    guard let start = trackingStartDate,
          timestamp.timeIntervalSince(start) >= paceWarmupSec else {
      return "--:--/km"
    }
    let cutoff = timestamp.addingTimeInterval(-paceWindowSec)
    paceSamples.append((deltaMeters: deltaMeters, timestamp: timestamp))
    paceSamples = paceSamples.filter { $0.timestamp >= cutoff }

    let totalDist = paceSamples.reduce(0.0) { $0 + $1.deltaMeters }
    guard totalDist >= 5, let firstTs = paceSamples.first?.timestamp else { return "--:--/km" }

    let elapsed = timestamp.timeIntervalSince(firstTs)
    guard elapsed >= 3 else { return "--:--/km" }

    let speedMps = totalDist / elapsed
    guard speedMps > 0.3, speedMps.isFinite else { return "--:--/km" }

    let paceSecPerKm = 1000.0 / speedMps
    let min = Int(paceSecPerKm / 60)
    let sec = Int(paceSecPerKm.truncatingRemainder(dividingBy: 60))
    return String(format: "%d:%02d/km", min, sec)
  }
}

// MARK: - CLLocationManagerDelegate

extension RunningTrackerModule: CLLocationManagerDelegate {

  func locationManager(_ manager: CLLocationManager,
                       didUpdateLocations locations: [CLLocation]) {
    guard isTracking else { return }

    for location in locations {
      let accuracy = location.horizontalAccuracy
      // Reject fixes with unknown or very poor accuracy
      guard accuracy >= 0, accuracy <= 65 else { continue }

      let coord = location.coordinate
      var deltaMeters: Double = 0
      var paceText = "--:--/km"

      if !isPaused, let last = lastLocation {
        let rawDelta = location.distance(from: last)
        let timeInterval = location.timestamp.timeIntervalSince(last.timestamp)

        // Speed guard: >12 m/s (43 km/h) is impossible while running
        if timeInterval > 0 {
          let speed = rawDelta / timeInterval
          if speed > 12 { lastLocation = location; continue }
        }

        // Filter sub-half-metre noise and teleportation
        guard rawDelta >= 0.5, rawDelta <= 800 else { lastLocation = location; continue }

        // 45-second gap → discard (same logic as before, but native-side)
        if timeInterval > 45 {
          lastLocation = location
          paceSamples = []
          continue
        }

        deltaMeters = rawDelta
        paceText = appendPaceSample(deltaMeters: deltaMeters, at: location.timestamp)
      }

      lastLocation = location

      sendEvent(withName: "onLocationUpdate", body: [
        "latitude": coord.latitude,
        "longitude": coord.longitude,
        "accuracy": accuracy,
        "deltaMeters": deltaMeters,     // JS accumulates total distance
        "currentPaceText": paceText,
        "timestamp": location.timestamp.timeIntervalSince1970 * 1000,
        "isPaused": isPaused,
      ])
    }
  }

  func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
    sendEvent(withName: "onTrackingError", body: ["message": error.localizedDescription])
  }
}
