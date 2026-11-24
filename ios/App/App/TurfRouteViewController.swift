import UIKit
import Capacitor

/// Root view controller (set in Main.storyboard). Registers the app's own
/// native plugin, which lives in this target rather than in an npm package.
class TurfRouteViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(TurfRouteNativePlugin())
    }
}
