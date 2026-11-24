import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?
    private var privacyCover: UIView?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Native Firebase (optional): after adding GoogleService-Info.plist and the Firebase iOS SDK,
        // uncomment the lines below. See docs/IOS_FIREBASE.md.
        // import FirebaseCore
        // FirebaseApp.configure()
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // App-switcher privacy cover: iOS snapshots the screen right after this
        // call, so customer names, addresses and pay never appear in the switcher.
        showPrivacyCover()
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        hidePrivacyCover()
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

    // MARK: - Privacy cover

    private func showPrivacyCover() {
        guard privacyCover == nil, let window = window else { return }
        let cover = UIView(frame: window.bounds)
        cover.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        cover.backgroundColor = UIColor(red: 13 / 255, green: 17 / 255, blue: 23 / 255, alpha: 1)

        let label = UILabel(frame: cover.bounds)
        label.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        label.text = Bundle.main.object(forInfoDictionaryKey: "CFBundleDisplayName") as? String ?? "TurfRoute"
        label.textColor = UIColor(red: 52 / 255, green: 211 / 255, blue: 153 / 255, alpha: 1)
        label.font = .systemFont(ofSize: 30, weight: .bold)
        label.textAlignment = .center
        cover.addSubview(label)

        window.addSubview(cover)
        privacyCover = cover
    }

    private func hidePrivacyCover() {
        guard let cover = privacyCover else { return }
        privacyCover = nil
        UIView.animate(withDuration: 0.15, animations: { cover.alpha = 0 }, completion: { _ in cover.removeFromSuperview() })
    }
}
