import Foundation
import UIKit
import Capacitor
import StoreKit

/// TurfRoute native bridge (JS name: "TurfRouteNative").
///
/// StoreKit 2 auto-renewable subscriptions for TurfRoute Pro (App Review
/// Guideline 3.1.1): product loading, purchase, restore, current entitlements,
/// a Transaction.updates listener and the system Manage Subscriptions sheet.
/// No server and no third-party SDK; StoreKit verifies the JWS signature.
@objc(TurfRouteNativePlugin)
public class TurfRouteNativePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "TurfRouteNativePlugin"
    public let jsName = "TurfRouteNative"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getProducts", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchase", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restore", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "entitlements", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "manageSubscriptions", returnType: CAPPluginReturnPromise),
    ]

    private var updatesTask: Task<Void, Never>?

    override public func load() {
        // Renewals, Ask to Buy approvals, purchases made on another device,
        // refunds and revocations arrive here. Finish them and tell the web layer.
        updatesTask = Task.detached { [weak self] in
            for await result in Transaction.updates {
                if case .verified(let transaction) = result {
                    await transaction.finish()
                }
                let ids = await TurfRouteNativePlugin.activeProductIDs()
                self?.notifyListeners("entitlementsChanged", data: ["productIds": ids])
            }
        }
    }

    deinit { updatesTask?.cancel() }

    /// Product IDs the user is currently entitled to (active, verified, not revoked).
    static func activeProductIDs() async -> [String] {
        var ids: [String] = []
        for await result in Transaction.currentEntitlements {
            guard case .verified(let transaction) = result else { continue }
            if transaction.revocationDate != nil { continue }
            if let expires = transaction.expirationDate, expires < Date() { continue }
            ids.append(transaction.productID)
        }
        return ids
    }

    @objc func getProducts(_ call: CAPPluginCall) {
        let ids = call.getArray("productIds", String.self) ?? []
        Task {
            do {
                let products = try await Product.products(for: ids)
                let payload: [[String: Any]] = products.map { product in
                    var item: [String: Any] = [
                        "id": product.id,
                        "displayName": product.displayName,
                        "description": product.description,
                        "displayPrice": product.displayPrice,
                        "price": NSDecimalNumber(decimal: product.price).doubleValue,
                    ]
                    if let period = product.subscription?.subscriptionPeriod {
                        item["periodUnit"] = TurfRouteNativePlugin.unitName(period.unit)
                        item["periodValue"] = period.value
                    }
                    return item
                }
                call.resolve(["products": payload])
            } catch {
                call.reject("Could not load subscriptions: \(error.localizedDescription)")
            }
        }
    }

    @objc func purchase(_ call: CAPPluginCall) {
        guard let productId = call.getString("productId") else {
            call.reject("productId is required")
            return
        }
        Task { @MainActor in
            do {
                guard let product = try await Product.products(for: [productId]).first else {
                    call.reject("Subscription not available")
                    return
                }
                let result = try await product.purchase()
                switch result {
                case .success(let verification):
                    switch verification {
                    case .verified(let transaction):
                        await transaction.finish()
                        let ids = await TurfRouteNativePlugin.activeProductIDs()
                        call.resolve(["status": "purchased", "productIds": ids])
                    case .unverified(_, let verificationError):
                        call.reject("Purchase could not be verified: \(verificationError.localizedDescription)")
                    }
                case .userCancelled:
                    call.resolve(["status": "cancelled"])
                case .pending:
                    call.resolve(["status": "pending"])
                @unknown default:
                    call.resolve(["status": "unknown"])
                }
            } catch {
                call.reject("Purchase failed: \(error.localizedDescription)")
            }
        }
    }

    /// "Restore Purchases": syncs with the App Store (may show an Apple ID sign-in sheet).
    @objc func restore(_ call: CAPPluginCall) {
        Task {
            do {
                try await AppStore.sync()
            } catch {
                // The user may cancel the sign-in sheet; still report what we have locally.
            }
            let ids = await TurfRouteNativePlugin.activeProductIDs()
            call.resolve(["productIds": ids])
        }
    }

    @objc func entitlements(_ call: CAPPluginCall) {
        Task {
            let ids = await TurfRouteNativePlugin.activeProductIDs()
            call.resolve(["productIds": ids])
        }
    }

    /// Opens Apple's Manage Subscriptions sheet (iOS 15+).
    @objc func manageSubscriptions(_ call: CAPPluginCall) {
        Task { @MainActor in
            guard let scene = self.bridge?.viewController?.view.window?.windowScene else {
                call.reject("No active window")
                return
            }
            do {
                try await AppStore.showManageSubscriptions(in: scene)
                call.resolve()
            } catch {
                call.reject("Could not open subscriptions: \(error.localizedDescription)")
            }
        }
    }

    private static func unitName(_ unit: Product.SubscriptionPeriod.Unit) -> String {
        switch unit {
        case .day: return "day"
        case .week: return "week"
        case .month: return "month"
        case .year: return "year"
        @unknown default: return "unknown"
        }
    }
}
