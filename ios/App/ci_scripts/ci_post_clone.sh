#!/bin/sh
# Xcode Cloud (included with the Apple Developer Program: 25 compute hours/month).
# Builds the bundled web app and copies it into the iOS project before Xcode
# resolves Swift packages (CapApp-SPM references node_modules/@capacitor/*).
set -eu
cd "$CI_PRIMARY_REPOSITORY_PATH"
if ! command -v node >/dev/null 2>&1; then
  export HOMEBREW_NO_AUTO_UPDATE=1 HOMEBREW_NO_INSTALL_CLEANUP=1
  brew install node@22
  export PATH="$(brew --prefix node@22)/bin:$PATH"
fi
node -v
npm ci
# Firebase web config is public (it identifies the project; security rules
# enforce access). Generate .env from the committed config when CI has none.
if [ ! -f .env ] && [ -f config/firebase/web.config.json ]; then
  npm run firebase:env
fi
npm run brand:check
npm run build
npx cap sync ios
