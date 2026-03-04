#!/bin/bash
set -euo pipefail

#──────────────────────────────────────────────────────────
# ScreenQuest — Build, Archive & Upload to App Store Connect
#──────────────────────────────────────────────────────────
# Usage:
#   ./build-and-upload.sh              # auto-increment version & build
#   ./build-and-upload.sh --bump major # bump major version (1.31 → 2.0.0)
#   ./build-and-upload.sh --bump patch # bump patch (1.31.0 → 1.31.1)
#   ./build-and-upload.sh --version 2.0.0 --build 50  # set explicit values
#   ./build-and-upload.sh --skip-upload  # archive only, don't upload
#──────────────────────────────────────────────────────────

# ── Config ───────────────────────────────────────────────
WORKSPACE="ScreenQuest.xcworkspace"
SCHEME="ScreenQuest"
CONFIGURATION="Release"
EXPORT_OPTIONS="ExportOptions.plist"
ARCHIVE_DIR="archive-output"
ARCHIVE_PATH="$ARCHIVE_DIR/ScreenQuest.xcarchive"
EXPORT_PATH="$ARCHIVE_DIR/ipa"
PBXPROJ="ScreenQuest.xcodeproj/project.pbxproj"
INFO_PLIST="ScreenQuest/Info.plist"

# App Store Connect API
API_KEY_ID="3XU8S3XD9L"
API_ISSUER_ID="8b52d45c-46e9-4237-adf7-7f1c488ecb08"
API_KEY_PATH="$HOME/.appstoreconnect/private_keys/AuthKey_${API_KEY_ID}.p8"

# ── Parse args ───────────────────────────────────────────
BUMP=""
EXPLICIT_VERSION=""
EXPLICIT_BUILD=""
SKIP_UPLOAD=false
USE_STAGING=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --bump)       BUMP="$2"; shift 2 ;;
    --version)    EXPLICIT_VERSION="$2"; shift 2 ;;
    --build)      EXPLICIT_BUILD="$2"; shift 2 ;;
    --skip-upload) SKIP_UPLOAD=true; shift ;;
    --staging)    USE_STAGING=true; shift ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# ── Navigate to ios directory ────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ── Read current version & build ─────────────────────────
CURRENT_VERSION=$(grep 'MARKETING_VERSION' "$PBXPROJ" | head -1 | sed 's/.*= //;s/;.*//' | tr -d ' ')
CURRENT_BUILD=$(grep 'CURRENT_PROJECT_VERSION' "$PBXPROJ" | head -1 | sed 's/.*= //;s/;.*//' | tr -d ' ')

echo "┌─────────────────────────────────────────┐"
echo "│  ScreenQuest Build & Upload Script       │"
echo "├─────────────────────────────────────────┤"
echo "│  Current version: $CURRENT_VERSION"
echo "│  Current build:   $CURRENT_BUILD"
echo "└─────────────────────────────────────────┘"

# ── Compute new version ──────────────────────────────────
# Split version into components (handle x.y and x.y.z)
IFS='.' read -ra PARTS <<< "$CURRENT_VERSION"
MAJOR="${PARTS[0]:-0}"
MINOR="${PARTS[1]:-0}"
PATCH="${PARTS[2]:-0}"

if [[ -n "$EXPLICIT_VERSION" ]]; then
  NEW_VERSION="$EXPLICIT_VERSION"
elif [[ -n "$BUMP" ]]; then
  case "$BUMP" in
    major) MAJOR=$((MAJOR + 1)); MINOR=0; PATCH=0 ;;
    minor) MINOR=$((MINOR + 1)); PATCH=0 ;;
    patch) PATCH=$((PATCH + 1)) ;;
    *) echo "❌ Invalid bump type: $BUMP (use major, minor, or patch)"; exit 1 ;;
  esac
  NEW_VERSION="$MAJOR.$MINOR.$PATCH"
else
  # Default: auto-bump minor
  MINOR=$((MINOR + 1))
  NEW_VERSION="$MAJOR.$MINOR.0"
fi

# ── Compute new build number (always increment) ─────────
if [[ -n "$EXPLICIT_BUILD" ]]; then
  NEW_BUILD="$EXPLICIT_BUILD"
else
  NEW_BUILD=$((CURRENT_BUILD + 1))
fi

echo ""
echo "▶ New version: $NEW_VERSION"
echo "▶ New build:   $NEW_BUILD"
echo ""

# ── Confirm ──────────────────────────────────────────────
read -p "Proceed with archive & upload? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 0
fi

# ── Update version in project.pbxproj ───────────────────
echo "📝 Updating version to $NEW_VERSION (build $NEW_BUILD) in project.pbxproj..."
sed -i '' "s/MARKETING_VERSION = .*/MARKETING_VERSION = $NEW_VERSION;/" "$PBXPROJ"
sed -i '' "s/CURRENT_PROJECT_VERSION = .*/CURRENT_PROJECT_VERSION = $NEW_BUILD;/" "$PBXPROJ"

# ── Update Info.plist too ────────────────────────────────
echo "📝 Updating Info.plist..."
/usr/libexec/PlistBuddy -c "Set :CFBundleShortVersionString $NEW_VERSION" "$INFO_PLIST"
/usr/libexec/PlistBuddy -c "Set :CFBundleVersion $NEW_BUILD" "$INFO_PLIST"

# ── Set ENVFILE for react-native-config ──────────────────
# Ensures the production .env file is used for Release builds,
# so API_URL points to the production backend (not localhost).
if [[ "$USE_STAGING" == true ]]; then
  export ENVFILE="$SCRIPT_DIR/../.env.staging"
else
  export ENVFILE="$SCRIPT_DIR/../.env.production"
fi
echo "🔧 ENVFILE set to $ENVFILE"

# ── Clean previous archive artifacts ────────────────────
echo "🧹 Cleaning previous archive..."
rm -rf "$ARCHIVE_DIR"
mkdir -p "$ARCHIVE_DIR"

# ── Clean Xcode derived data to ensure fresh JS bundle ──
echo "🧹 Cleaning Xcode build cache..."
xcodebuild \
  -workspace "$WORKSPACE" \
  -scheme "$SCHEME" \
  clean 2>/dev/null || true

# ── Archive ──────────────────────────────────────────────
echo "📦 Archiving ScreenQuest..."
# Use absolute path to entry file — relative paths resolve from the
# monorepo root instead of the mobile directory.
SCRIPT_PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
export ENTRY_FILE="$SCRIPT_PROJECT_ROOT/index.js"
xcodebuild \
  -workspace "$WORKSPACE" \
  -scheme "$SCHEME" \
  -configuration "$CONFIGURATION" \
  -destination 'generic/platform=iOS' \
  -archivePath "$ARCHIVE_PATH" \
  -allowProvisioningUpdates \
  -authenticationKeyPath "$API_KEY_PATH" \
  -authenticationKeyID "$API_KEY_ID" \
  -authenticationKeyIssuerID "$API_ISSUER_ID" \
  SENTRY_DISABLE_AUTO_UPLOAD=true \
  archive

echo "✅ Archive succeeded: $ARCHIVE_PATH"

# ── Export IPA ───────────────────────────────────────────
if [[ "$SKIP_UPLOAD" == true ]]; then
  echo "⏭  --skip-upload specified, skipping export & upload."
else
  echo "📤 Exporting IPA..."
  xcodebuild \
    -exportArchive \
    -archivePath "$ARCHIVE_PATH" \
    -exportPath "$EXPORT_PATH" \
    -exportOptionsPlist "$EXPORT_OPTIONS" \
    -allowProvisioningUpdates \
    -authenticationKeyPath "$API_KEY_PATH" \
    -authenticationKeyID "$API_KEY_ID" \
    -authenticationKeyIssuerID "$API_ISSUER_ID"

  echo "✅ IPA exported and uploaded to App Store Connect!"
fi

# ── Summary ──────────────────────────────────────────────
echo ""
echo "┌─────────────────────────────────────────┐"
echo "│  Build Complete                          │"
echo "├─────────────────────────────────────────┤"
echo "│  Version: $NEW_VERSION (build $NEW_BUILD)"
echo "│  Archive: $ARCHIVE_PATH"
if [[ "$SKIP_UPLOAD" == false ]]; then
echo "│  Status:  Uploaded to App Store Connect  │"
else
echo "│  Status:  Archive only (upload skipped)  │"
fi
echo "└─────────────────────────────────────────┘"
