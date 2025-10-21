#!/bin/bash

set -e  # Exit on error

echo "🔨 Arduino Sketch Vault - Local Deployment Script"
echo "=================================================="
echo ""

# Configuration - extract from package.json
EXTENSION_NAME=$(node -p "require('./package.json').name")
VERSION=$(node -p "require('./package.json').version")
VSIX_FILENAME="${EXTENSION_NAME}-${VERSION}.vsix"

# Arduino IDE directory (configurable via environment variable)
ARDUINO_IDE_DIR="${ARDUINO_IDE_DIR:-$HOME/.arduinoIDE}"

echo "📦 Extension: $EXTENSION_NAME"
echo "📌 Version: $VERSION"
echo "📁 Arduino IDE Directory: $ARDUINO_IDE_DIR"
echo ""

# Step 0: Ensure correct Node version
echo "🔧 Step 0: Setting Node version..."
if [ -f ~/.nvm/nvm.sh ]; then
    source ~/.nvm/nvm.sh
    nvm use 20
    if [ $? -eq 0 ]; then
        echo "✅ Using Node $(node --version)"
    else
        echo "❌ Failed to set Node version"
        exit 1
    fi
else
    echo "⚠️  NVM not found, using system Node $(node --version)"
fi
echo ""

# Step 1: Compile TypeScript
echo "📦 Step 1: Compiling TypeScript..."
npm run compile
if [ $? -eq 0 ]; then
    echo "✅ Compilation successful"
else
    echo "❌ Compilation failed"
    exit 1
fi
echo ""

# Step 2: Package extension
echo "📦 Step 2: Packaging extension..."
npm run package
if [ $? -eq 0 ]; then
    echo "✅ Packaging successful"
else
    echo "❌ Packaging failed"
    exit 1
fi
echo ""

# Step 3: Clean old installation
echo "🧹 Step 3: Cleaning old installation..."

OLD_DEPLOYMENT_DIR="$ARDUINO_IDE_DIR/deployedPlugins/${EXTENSION_NAME}-${VERSION}"
OLD_VSIX_FILE="$ARDUINO_IDE_DIR/plugins/${VSIX_FILENAME}"

if [ -d "$OLD_DEPLOYMENT_DIR" ]; then
    echo "   Removing old deployment directory: $OLD_DEPLOYMENT_DIR"
    rm -rf "$OLD_DEPLOYMENT_DIR"
    echo "   ✅ Removed old deployment directory"
else
    echo "   ⏭️  No old deployment directory found"
fi

if [ -f "$OLD_VSIX_FILE" ]; then
    echo "   Removing old VSIX file: $OLD_VSIX_FILE"
    rm -f "$OLD_VSIX_FILE"
    echo "   ✅ Removed old VSIX file"
else
    echo "   ⏭️  No old VSIX file found"
fi
echo ""

# Step 4: Copy new VSIX to plugins directory
echo "📥 Step 4: Installing new extension..."

PLUGINS_DIR="$ARDUINO_IDE_DIR/plugins"
NEW_VSIX_FILE="./${VSIX_FILENAME}"

# Create plugins directory if it doesn't exist
if [ ! -d "$PLUGINS_DIR" ]; then
    echo "   Creating plugins directory: $PLUGINS_DIR"
    mkdir -p "$PLUGINS_DIR"
fi

if [ -f "$NEW_VSIX_FILE" ]; then
    echo "   Copying VSIX to: $PLUGINS_DIR"
    cp "$NEW_VSIX_FILE" "$PLUGINS_DIR/"
    echo "   ✅ Extension installed"
else
    echo "   ❌ VSIX file not found: $NEW_VSIX_FILE"
    exit 1
fi
echo ""

# Step 5: Done
echo "✅ Deployment Complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Restart Arduino IDE"
echo "   2. The extension will be automatically loaded"
echo "   3. Check 'Arduino Sketch Vault' in the Output panel"
echo ""
