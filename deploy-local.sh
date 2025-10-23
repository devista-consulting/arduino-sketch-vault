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

# Step 1: Install/update dependencies
echo "📦 Step 1: Installing dependencies..."
npm install
if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed"
else
    echo "❌ Dependency installation failed"
    exit 1
fi
echo ""

# Step 2: Compile TypeScript
echo "🔨 Step 2: Compiling TypeScript..."
npm run compile
if [ $? -eq 0 ]; then
    echo "✅ Compilation successful"
else
    echo "❌ Compilation failed"
    exit 1
fi
echo ""

# Step 3: Package extension
echo "📦 Step 3: Packaging extension..."
npm run package
if [ $? -eq 0 ]; then
    echo "✅ Packaging successful"
else
    echo "❌ Packaging failed"
    exit 1
fi
echo ""

# Step 4: Clean old installations (all versions)
echo "🧹 Step 4: Cleaning old installations..."

# Remove all old deployment directories
DEPLOYED_PLUGINS_DIR="$ARDUINO_IDE_DIR/deployedPlugins"
if [ -d "$DEPLOYED_PLUGINS_DIR" ]; then
    FOUND_DIRS=$(find "$DEPLOYED_PLUGINS_DIR" -maxdepth 1 -type d -name "${EXTENSION_NAME}-*" 2>/dev/null)
    if [ -n "$FOUND_DIRS" ]; then
        echo "   Removing old deployment directories matching: ${EXTENSION_NAME}-*"
        find "$DEPLOYED_PLUGINS_DIR" -maxdepth 1 -type d -name "${EXTENSION_NAME}-*" -exec rm -rf {} +
        echo "   ✅ Removed old deployment directories"
    else
        echo "   ⏭️  No old deployment directories found"
    fi
else
    echo "   ⏭️  No deployedPlugins directory found"
fi

# Remove all old VSIX files
PLUGINS_DIR="$ARDUINO_IDE_DIR/plugins"
if [ -d "$PLUGINS_DIR" ]; then
    FOUND_FILES=$(find "$PLUGINS_DIR" -maxdepth 1 -type f -name "${EXTENSION_NAME}-*.vsix" 2>/dev/null)
    if [ -n "$FOUND_FILES" ]; then
        echo "   Removing old VSIX files matching: ${EXTENSION_NAME}-*.vsix"
        find "$PLUGINS_DIR" -maxdepth 1 -type f -name "${EXTENSION_NAME}-*.vsix" -exec rm -f {} +
        echo "   ✅ Removed old VSIX files"
    else
        echo "   ⏭️  No old VSIX files found"
    fi
else
    echo "   ⏭️  No plugins directory found"
fi
echo ""

# Step 5: Copy new VSIX to plugins directory
echo "📥 Step 5: Installing new extension..."

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

# Step 6: Done
echo "✅ Deployment Complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Restart Arduino IDE"
echo "   2. The extension will be automatically loaded"
echo "   3. Check 'Arduino Sketch Vault' in the Output panel"
echo ""
