import Foundation
import PushKit
import UIKit

/// PushKit VoIP token + incoming VoIP push → CallKit report.
/// Separate from expo-notifications / Expo Push Token.
@objc public final class TamusoPushKitManager: NSObject, PKPushRegistryDelegate {
  public static let shared = TamusoPushKitManager()

  private var registry: PKPushRegistry?
  private var voipTokenHex: String?
  private var eventSink: (([String: Any]) -> Void)?
  private var started = false

  private override init() {
    super.init()
  }

  public func setEventSink(_ sink: @escaping ([String: Any]) -> Void) {
    eventSink = sink
  }

  public func start() {
    guard !started else { return }
    started = true
    let reg = PKPushRegistry(queue: DispatchQueue.main)
    reg.desiredPushTypes = [.voIP]
    reg.delegate = self
    registry = reg
  }

  public func currentToken() -> String? {
    voipTokenHex
  }

  private func emit(_ type: String, _ payload: [String: Any] = [:]) {
    var body = payload
    body["type"] = type
    eventSink?(body)
  }

  private func hexString(from data: Data) -> String {
    data.map { String(format: "%02x", $0) }.joined()
  }

  // MARK: - PKPushRegistryDelegate

  public func pushRegistry(
    _ registry: PKPushRegistry,
    didUpdate pushCredentials: PKPushCredentials,
    for type: PKPushType
  ) {
    guard type == .voIP else { return }
    let hex = hexString(from: pushCredentials.token)
    voipTokenHex = hex
    emit("voip_token", ["token": hex])
  }

  public func pushRegistry(
    _ registry: PKPushRegistry,
    didInvalidatePushTokenFor type: PKPushType
  ) {
    guard type == .voIP else { return }
    voipTokenHex = nil
    emit("voip_token_invalidated", [:])
  }

  public func pushRegistry(
    _ registry: PKPushRegistry,
    didReceiveIncomingPushWith payload: PKPushPayload,
    for type: PKPushType,
    completion: @escaping () -> Void
  ) {
    guard type == .voIP else {
      completion()
      return
    }

    let dict = payload.dictionaryPayload
    let callId = (dict["callId"] as? String)
      ?? (dict["call_id"] as? String)
      ?? UUID().uuidString
    let callerName = (dict["callerName"] as? String)
      ?? (dict["caller_name"] as? String)
      ?? "Tamuso"
    var hasVideo = false
    if let v = dict["hasVideo"] as? Bool {
      hasVideo = v
    } else if let v = dict["has_video"] as? Bool {
      hasVideo = v
    } else if (dict["callType"] as? String) == "video" {
      hasVideo = true
    } else if (dict["call_type"] as? String) == "video" {
      hasVideo = true
    }

    // Apple: VoIP push MUST report to CallKit promptly.
    TamusoCallManager.shared.reportIncomingCall(
      callId: callId,
      callerName: callerName,
      hasVideo: hasVideo
    ) { [weak self] error in
      if let error {
        self?.emit("voip_push_failed", [
          "callId": callId,
          "error": error.localizedDescription,
        ])
      } else {
        self?.emit("voip_push", [
          "callId": callId,
          "callerName": callerName,
          "hasVideo": hasVideo,
          "payload": dict,
        ])
      }
      completion()
    }
  }
}
