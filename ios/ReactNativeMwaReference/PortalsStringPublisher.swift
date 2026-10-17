import Foundation
import IonicPortals

/// Publishes a string on the shared Portals channel as it is. The SDK's `publish` wraps every value
/// as `{ message: value }`, but the MWAs read some topics, such as `authToken`, as a plain string.
@objc(PortalsStringPublisher)
final class PortalsStringPublisher: NSObject {
  @objc static func requiresMainQueueSetup() -> Bool { false }

  @objc func publish(_ topic: String, value: String) {
    PortalsPubSub.publish(value, to: topic)
  }
}
