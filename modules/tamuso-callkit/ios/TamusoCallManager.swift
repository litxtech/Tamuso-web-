import Foundation
import CallKit
import AVFoundation
import UIKit

/// CallKit lifecycle — source of truth for native call UI state.
/// LiveKit remains the media connection layer (JS side).
@objc public final class TamusoCallManager: NSObject {
  public static let shared = TamusoCallManager()

  private let provider: CXProvider
  private let controller = CXCallController()
  private var activeUUID: UUID?
  private var callIdByUUID: [UUID: String] = [:]
  private var uuidByCallId: [String: UUID] = [:]
  private var eventSink: (([String: Any]) -> Void)?

  private override init() {
    let config = CXProviderConfiguration(localizedName: "Tamuso")
    config.supportsVideo = true
    config.maximumCallsPerCallGroup = 1
    config.maximumCallGroups = 1
    config.supportedHandleTypes = [.generic]
    if let icon = UIImage(systemName: "phone.fill") {
      config.iconTemplateImageData = icon.pngData()
    }
    provider = CXProvider(configuration: config)
    super.init()
    provider.setDelegate(self, queue: nil)
  }

  public func setEventSink(_ sink: @escaping ([String: Any]) -> Void) {
    eventSink = sink
  }

  private func emit(_ type: String, _ payload: [String: Any] = [:]) {
    var body = payload
    body["type"] = type
    eventSink?(body)
  }

  public func reportIncomingCall(
    callId: String,
    callerName: String,
    hasVideo: Bool,
    completion: @escaping (Error?) -> Void
  ) {
    if let existing = uuidByCallId[callId] {
      completion(nil)
      emit("duplicate", ["callId": callId, "uuid": existing.uuidString])
      return
    }

    let uuid = UUID()
    callIdByUUID[uuid] = callId
    uuidByCallId[callId] = uuid
    activeUUID = uuid

    let update = CXCallUpdate()
    update.remoteHandle = CXHandle(type: .generic, value: callerName)
    update.localizedCallerName = callerName
    update.hasVideo = hasVideo
    update.supportsGrouping = false
    update.supportsUngrouping = false
    update.supportsHolding = false
    update.supportsDTMF = false

    provider.reportNewIncomingCall(with: uuid, update: update) { [weak self] error in
      if let error {
        self?.cleanup(uuid: uuid)
        completion(error)
        self?.emit("failed", ["callId": callId, "error": error.localizedDescription])
        return
      }
      self?.emit("incoming", [
        "callId": callId,
        "uuid": uuid.uuidString,
        "callerName": callerName,
        "hasVideo": hasVideo,
      ])
      completion(nil)
    }
  }

  public func startOutgoingCall(
    callId: String,
    calleeName: String,
    hasVideo: Bool,
    completion: @escaping (Error?) -> Void
  ) {
    if uuidByCallId[callId] != nil {
      completion(nil)
      return
    }

    let uuid = UUID()
    callIdByUUID[uuid] = callId
    uuidByCallId[callId] = uuid
    activeUUID = uuid

    let handle = CXHandle(type: .generic, value: calleeName)
    let action = CXStartCallAction(call: uuid, handle: handle)
    action.isVideo = hasVideo
    let tx = CXTransaction(action: action)
    controller.request(tx) { [weak self] error in
      if let error {
        self?.cleanup(uuid: uuid)
        completion(error)
        return
      }
      let update = CXCallUpdate()
      update.remoteHandle = handle
      update.localizedCallerName = calleeName
      update.hasVideo = hasVideo
      self?.provider.reportCall(with: uuid, updated: update)
      self?.emit("outgoing", [
        "callId": callId,
        "uuid": uuid.uuidString,
        "hasVideo": hasVideo,
      ])
      completion(nil)
    }
  }

  public func reportConnected(callId: String) {
    guard let uuid = uuidByCallId[callId] else { return }
    provider.reportOutgoingCall(with: uuid, connectedAt: Date())
    emit("connected", ["callId": callId, "uuid": uuid.uuidString])
  }

  public func reportConnecting(callId: String) {
    guard let uuid = uuidByCallId[callId] else { return }
    provider.reportOutgoingCall(with: uuid, startedConnectingAt: Date())
    emit("connecting", ["callId": callId, "uuid": uuid.uuidString])
  }

  public func endCall(callId: String, reason: CXCallEndedReason = .remoteEnded) {
    guard let uuid = uuidByCallId[callId] else { return }
    provider.reportCall(with: uuid, endedAt: Date(), reason: reason)
    cleanup(uuid: uuid)
    emit("ended", ["callId": callId, "uuid": uuid.uuidString])
  }

  public func endAll() {
    for (callId, _) in uuidByCallId {
      endCall(callId: callId)
    }
  }

  public func setMuted(callId: String, muted: Bool) {
    guard let uuid = uuidByCallId[callId] else { return }
    let action = CXSetMutedCallAction(call: uuid, muted: muted)
    let tx = CXTransaction(action: action)
    controller.request(tx) { _ in }
  }

  public func activeCallId() -> String? {
    guard let uuid = activeUUID else { return nil }
    return callIdByUUID[uuid]
  }

  private func cleanup(uuid: UUID) {
    if let callId = callIdByUUID[uuid] {
      uuidByCallId.removeValue(forKey: callId)
    }
    callIdByUUID.removeValue(forKey: uuid)
    if activeUUID == uuid {
      activeUUID = nil
    }
  }
}

extension TamusoCallManager: CXProviderDelegate {
  public func providerDidReset(_ provider: CXProvider) {
    for uuid in Array(callIdByUUID.keys) {
      cleanup(uuid: uuid)
    }
    emit("reset", [:])
  }

  public func provider(_ provider: CXProvider, perform action: CXAnswerCallAction) {
    let callId = callIdByUUID[action.callUUID] ?? ""
    emit("answered", ["callId": callId, "uuid": action.callUUID.uuidString])
    action.fulfill()
  }

  public func provider(_ provider: CXProvider, perform action: CXEndCallAction) {
    let callId = callIdByUUID[action.callUUID] ?? ""
    cleanup(uuid: action.callUUID)
    emit("declined_or_ended", ["callId": callId, "uuid": action.callUUID.uuidString])
    action.fulfill()
  }

  public func provider(_ provider: CXProvider, perform action: CXStartCallAction) {
    emit("start_action", [
      "callId": callIdByUUID[action.callUUID] ?? "",
      "uuid": action.callUUID.uuidString,
    ])
    action.fulfill()
  }

  public func provider(_ provider: CXProvider, perform action: CXSetMutedCallAction) {
    let callId = callIdByUUID[action.callUUID] ?? ""
    emit("muted", [
      "callId": callId,
      "uuid": action.callUUID.uuidString,
      "muted": action.isMuted,
    ])
    action.fulfill()
  }

  public func provider(_ provider: CXProvider, didActivate audioSession: AVAudioSession) {
    emit("audio_activated", [:])
  }

  public func provider(_ provider: CXProvider, didDeactivate audioSession: AVAudioSession) {
    emit("audio_deactivated", [:])
  }
}
