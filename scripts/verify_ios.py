#!/usr/bin/env python3
"""Static checks for the iOS project that can run on Linux (CI / no Xcode).

Swift compilation itself still needs macOS (Xcode Cloud or a Mac).
"""
import json
import plistlib
import re
import struct
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
IOS = ROOT / "ios/App"
errors = []


def check(cond, msg):
    print(("✓ " if cond else "✗ ") + msg)
    if not cond:
        errors.append(msg)


def png_info(path):
    data = path.read_bytes()[:33]
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        return None
    width, height, _depth, color_type = struct.unpack(">IIBB", data[16:26])
    return width, height, color_type


info = plistlib.loads((IOS / "App/Info.plist").read_bytes())
check(info.get("ITSAppUsesNonExemptEncryption") is False, "Info.plist ITSAppUsesNonExemptEncryption = NO")
check(len(info.get("NSLocationWhenInUseUsageDescription", "")) > 40, "Info.plist NSLocationWhenInUseUsageDescription is descriptive")
check("NSLocationAlwaysAndWhenInUseUsageDescription" not in info, "Info.plist does not request Always location")
schemes = [s for t in info.get("CFBundleURLTypes", []) for s in t.get("CFBundleURLSchemes", [])]
check("turfroute" in schemes or len(schemes) == 1, f"Info.plist URL scheme registered ({', '.join(schemes)})")
check(info.get("UIRequiredDeviceCapabilities") == ["arm64"], "Info.plist requires arm64")

privacy = plistlib.loads((IOS / "App/PrivacyInfo.xcprivacy").read_bytes())
check(privacy.get("NSPrivacyTracking") is False, "PrivacyInfo.xcprivacy: no tracking")
reasons = {a["NSPrivacyAccessedAPIType"] for a in privacy.get("NSPrivacyAccessedAPITypes", [])}
check("NSPrivacyAccessedAPICategoryUserDefaults" in reasons, "PrivacyInfo.xcprivacy declares UserDefaults reason")

for xml_file in [
    IOS / "App/Base.lproj/Main.storyboard",
    IOS / "App/Base.lproj/LaunchScreen.storyboard",
    IOS / "App.xcodeproj/xcshareddata/xcschemes/App.xcscheme",
]:
    try:
        ET.parse(xml_file)
        check(True, f"{xml_file.relative_to(ROOT)} is well-formed XML")
    except ET.ParseError as e:
        check(False, f"{xml_file.relative_to(ROOT)}: {e}")

main = ET.parse(IOS / "App/Base.lproj/Main.storyboard").getroot()
vc = main.find(".//viewController")
check(vc is not None and vc.get("customClass") == "TurfRouteViewController" and vc.get("customModule") == "App",
      "Main.storyboard uses TurfRouteViewController (registers the StoreKit plugin)")

scheme = (IOS / "App.xcodeproj/xcshareddata/xcschemes/App.xcscheme").read_text()
check("StoreKitConfigurationFileReference" in scheme, "Shared scheme points at the .storekit test config")

storekit = json.loads((IOS / "App/TurfRoute.storekit").read_text())
subs = [s for g in storekit["subscriptionGroups"] for s in g["subscriptions"]]
check({s["recurringSubscriptionPeriod"] for s in subs} == {"P1M", "P1Y"}, "StoreKit config has monthly + yearly subscriptions")

pbx = (IOS / "App.xcodeproj/project.pbxproj").read_text()
check(pbx.count("{") == pbx.count("}"), "project.pbxproj braces balanced")
for swift in ["AppDelegate.swift", "TurfRouteNativePlugin.swift", "TurfRouteViewController.swift"]:
    check(f"{swift} in Sources" in pbx and (IOS / "App" / swift).exists(), f"{swift} exists and is compiled")
check("PrivacyInfo.xcprivacy in Resources" in pbx, "PrivacyInfo.xcprivacy is bundled")
check(re.search(r"TARGETED_DEVICE_FAMILY = 1;", pbx) is not None, "iPhone-only target")

cap = json.loads((ROOT / "capacitor.config.json").read_text())
check("url" not in cap.get("server", {}), "capacitor.config.json has no remote server.url (bundled app)")

icon = IOS / "App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png"
pi = png_info(icon)
check(pi is not None and pi[:2] == (1024, 1024), "App icon is 1024x1024 PNG")
check(pi is not None and pi[2] in (0, 2), "App icon has no alpha channel")
for src in ["resources/icon.png", "resources/splash.png"]:
    p = png_info(ROOT / src)
    check(p is not None and p[2] in (0, 2), f"{src} is an opaque PNG")

ci = IOS / "ci_scripts/ci_post_clone.sh"
check(ci.exists() and ci.stat().st_mode & 0o111, "ci_scripts/ci_post_clone.sh exists and is executable")

swift = (IOS / "App/TurfRouteNativePlugin.swift").read_text()
for needle in ["Transaction.updates", "Transaction.currentEntitlements", "AppStore.sync()", "product.purchase()",
               "showManageSubscriptions", "CAPBridgedPlugin", 'jsName = "TurfRouteNative"']:
    check(needle in swift, f"StoreKit plugin uses {needle}")

if errors:
    print(f"\n{len(errors)} iOS check(s) failed")
    sys.exit(1)
print("\nAll static iOS checks passed (Swift compile still requires Xcode).")
