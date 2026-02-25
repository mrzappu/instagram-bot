#!/bin/bash

echo "╔══════════════════════════════════════════════════════════╗"
echo "║         IMPOSTER INSTAGRAM BOT - STARTUP SCRIPT         ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# Check environment variables
echo "🔍 Checking environment variables..."
if [ -z "$DISCORD_BOT_TOKEN" ]; then 
    echo "❌ DISCORD_BOT_TOKEN not set"
    exit 1
else 
    echo "✅ DISCORD_BOT_TOKEN set"
fi

if [ -z "$DISCORD_CHANNEL_ID" ]; then 
    echo "❌ DISCORD_CHANNEL_ID not set"
    exit 1
else 
    echo "✅ DISCORD_CHANNEL_ID set to $DISCORD_CHANNEL_ID"
fi

echo ""

# Check if yt-dlp exists
echo "🔍 Checking yt-dlp..."
if [ -f "/usr/local/bin/yt-dlp" ]; then
    VERSION=$(/usr/local/bin/yt-dlp --version 2>/dev/null)
    echo "✅ yt-dlp found at /usr/local/bin/yt-dlp (version $VERSION)"
else
    echo "❌ yt-dlp not found at /usr/local/bin/yt-dlp"
    echo "⚠️ Bot may not function correctly"
fi

echo ""

# Start the bot
echo "🤖 Starting Discord bot..."
node index.js
