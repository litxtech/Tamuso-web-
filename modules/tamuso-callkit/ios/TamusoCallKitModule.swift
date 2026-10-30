import ExpoModulesCore
import CallKit

public class TamusoCallKitModule: Module {
  public func definition() -> ModuleDefinition {
    Name("TamusoCallKit")

    Events("onCallEvent", "onVoipEvent")

    OnCreate {
      TamusoCallManager.shared.setEventSink { [weak self] payload in
        self?.sendEvent("onCallEvent", payload)
      }
      TamusoPushKitManager.shared.setEventSink { [weak self] payload in
        self?.sendEvent("onVoipEvent", payload)
      }
    }

    Function("isSupported") { () -> Bool in
      #if targetEnvironment(simulator)
      return false
      #else
      return true
      #endif
    }

    Function("startPushKit") { () -> Bool in
      TamusoPushKitManager.shared.start()
      return true
    }

    Function("getVoipToken") { () -> String? in
      TamusoPushKitManager.shared.currentToken()
    }

    AsyncFunction("reportIncomingCall") {
      (callId: String, callerName: String, hasVideo: Bool) -> [String: Any] in
      try await withCheckedThrowingContinuation { (cont: CheckedContinuation<[String: Any], Error>) in
        TamusoCallManager.shared.reportIncomingCall(
          callId: callId,
          callerName: callerName,
          hasVideo: hasVideo
        ) { error in
          if let error {
            cont.resume(throwing: error)
          } else {
            cont.resume(returning: [
              "ok": true,
              "callId": callId,
            ])
          }
        }
      }
    }

    AsyncFunction("startOutgoingCall") {
      (callId: String, calleeName: String, hasVideo: Bool) -> [String: Any] in
      try await withCheckedThrowingContinuation { (cont: CheckedContinuation<[String: Any], Error>) in
        TamusoCallManager.shared.startOutgoingCall(
          callId: callId,
          calleeName: calleeName,
          hasVideo: hasVideo
        ) { error in
          if let error {
            cont.resume(throwing: error)
          } else {
            cont.resume(returning: ["ok": true, "callId": callId])
          }
        }
      }
    }

    Function("reportConnecting") { (callId: String) in
      TamusoCallManager.shared.reportConnecting(callId: callId)
    }

    Function("reportConnected") { (callId: String) in
      TamusoCallManager.shared.reportConnected(callId: callId)
    }

    Function("endCall") { (callId: String) in
      TamusoCallManager.shared.endCall(callId: callId, reason: .remoteEnded)
    }

    Function("endCallMissed") { (callId: String) in
      TamusoCallManager.shared.endCall(callId: callId, reason: .unanswered)
    }

    Function("endCallFailed") { (callId: String) in
      TamusoCallManager.shared.endCall(callId: callId, reason: .failed)
    }

    Function("endAllCalls") {
      TamusoCallManager.shared.endAll()
    }

    Function("setMuted") { (callId: String, muted: Bool) in
      TamusoCallManager.shared.setMuted(callId: callId, muted: muted)
    }

    Function("getActiveCallId") { () -> String? in
      TamusoCallManager.shared.activeCallId()
    }
  }
}
