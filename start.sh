#!/bin/bash

echo "╔══════════════════════════════════════════════════════════╗"
echo "║         IMPOSTER INSTAGRAM BOT - STARTUP SCRIPT          ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# Check environment variables
echo "🔍 Checking environment variables..."
if [ -z "$DISCORD_BOT_TOKEN" ]; then echo "❌ DISCORD_BOT_TOKEN not set"; exit 1; else echo "✅ DISCORD_BOT_TOKEN set"; fi
if [ -z "$DISCORD_CLIENT_ID" ]; then echo "❌ DISCORD_CLIENT_ID not set"; exit 1; else echo "✅ DISCORD_CLIENT_ID set"; fi
if [ -z "$DISCORD_GUILD_ID" ]; then echo "❌ DISCORD_GUILD_ID not set"; exit 1; else echo "✅ DISCORD_GUILD_ID set"; fi
if [ -z "$APIFY_API_TOKEN" ]; then echo "❌ APIFY_API_TOKEN not set"; exit 1; else echo "✅ APIFY_API_TOKEN set"; fi

echo ""

# Register slash commands
echo "🚀 Registering slash commands..."
node deploy-commands.js

if [ $? -eq 0 ]; then
    echo "✅ Commands registered successfully!"
else
    echo "❌ Failed to register commands"
    exit 1
fi

echo ""

# Start bot
echo "🤖 Starting Discord bot..."
node index.js
