// index.js - Complete Instagram Downloader Bot
require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const express = require('express');
const InstagramDownloader = require('./instagramDownloader');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize downloader
const downloader = new InstagramDownloader();
const TARGET_CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;

// Discord Client Setup
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Track processed messages to avoid duplicates
const processedMessages = new Set();

// Bot Ready Event
client.once('ready', async () => {
    console.log(`
╔══════════════════════════════════════════════════════════╗
║   ██╗███╗   ███╗██████╗  ██████╗ ███████╗████████╗     ║
║   ██║████╗ ████║██╔══██╗██╔═══██╗██╔════╝╚══██╔══╝     ║
║   ██║██╔████╔██║██████╔╝██║   ██║███████╗   ██║        ║
║   ██║██║╚██╔╝██║██╔═══╝ ██║   ██║╚════██║   ██║        ║
║   ██║██║ ╚═╝ ██║██║     ╚██████╔╝███████║   ██║        ║
║   ╚═╝╚═╝     ╚═╝╚═╝      ╚═════╝ ╚══════╝   ╚═╝        ║
╠══════════════════════════════════════════════════════════╣
║   📍 Bot: ${client.user.tag}
║   📍 Channel: ${TARGET_CHANNEL_ID}
║   🔥 Instagram Downloader - Ready!
║   © IMPOSTER 2026-2027                          
╚══════════════════════════════════════════════════════════╝
    `);

    // Check yt-dlp installation
    const ytDlpReady = await downloader.checkYtDlp();
    if (!ytDlpReady) {
        console.error('❌ CRITICAL: yt-dlp not available. Bot will not function.');
    } else {
        console.log('✅ Bot ready to download Instagram content');
    }

    // Set bot status
    client.user.setActivity('Instagram Links', { type: 3 });
});

// Message Handler
client.on('messageCreate', async (message) => {
    // Ignore bot messages
    if (message.author.bot) return;
    
    // Ignore if not in target channel
    if (message.channel.id !== TARGET_CHANNEL_ID) return;
    
    // Ignore if already processed
    if (processedMessages.has(message.id)) return;
    processedMessages.add(message.id);
    
    // Clean up old processed messages (keep last 100)
    if (processedMessages.size > 100) {
        const toDelete = Array.from(processedMessages).slice(0, 20);
        toDelete.forEach(id => processedMessages.delete(id));
    }

    // Extract Instagram URL
    const instagramUrl = await downloader.extractInstagramUrl(message.content);
    
    if (!instagramUrl) return;

    console.log(`🔗 Instagram link detected from ${message.author.tag}: ${instagramUrl}`);

    // Send typing indicator
    await message.channel.sendTyping();

    // Send initial status
    const statusMsg = await message.reply({
        content: `📥 Processing Instagram link...\n${instagramUrl}`,
        allowedMentions: { repliedUser: true }
    });

    // Download the media
    const media = await downloader.downloadMedia(instagramUrl);

    if (!media) {
        return await statusMsg.edit({
            content: `❌ Failed to download.\nThis might be a private account or an unsupported format.\n${instagramUrl}`
        });
    }

    // Check file size (Discord limit is 25MB for free tier)
    const fileSizeMB = media.fileSize / 1024 / 1024;
    
    if (fileSizeMB > 25) {
        await statusMsg.edit({
            content: `⚠️ File is too large for Discord (${fileSizeMB.toFixed(2)}MB > 25MB limit).\n${instagramUrl}`
        });
        await downloader.cleanup(media.filePath);
        return;
    }

    // Create embed
    const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('📥 Instagram Downloader')
        .setDescription(`Downloaded for ${message.author}`)
        .addFields(
            { 
                name: '📱 Type', 
                value: media.fileName.endsWith('.mp4') ? 'Video' : media.fileName.endsWith('.jpg') ? 'Image' : 'Media', 
                inline: true 
            },
            { 
                name: '📦 Size', 
                value: `${fileSizeMB.toFixed(2)} MB`, 
                inline: true 
            },
            {
                name: '🔗 Link',
                value: `[Click here](${instagramUrl})`,
                inline: true
            }
        )
        .setFooter({ text: `IMPOSTER Instagram Bot • No API Required` })
        .setTimestamp();

    // Update status message with embed
    await statusMsg.edit({ content: null, embeds: [embed] });

    // Send the file
    try {
        await message.channel.send({
            files: [{
                attachment: media.filePath,
                name: media.fileName
            }]
        });
        console.log(`✅ Successfully sent: ${media.fileName}`);
    } catch (error) {
        console.error('Error sending file:', error.message);
        await message.channel.send(`❌ Failed to send file. Error: ${error.message}`);
    }

    // Clean up temp file
    await downloader.cleanup(media.filePath);
});

// Error Handler
client.on('error', (error) => {
    console.error('Discord client error:', error);
});

// Express server for Render
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>IMPOSTER Instagram Downloader</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                    font-family: 'Segoe UI', sans-serif;
                    background: linear-gradient(135deg, #1a1a1a 0%, #2c3e50 100%);
                    min-height: 100vh;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    padding: 20px;
                }
                .container {
                    background: rgba(20, 20, 20, 0.95);
                    border-radius: 20px;
                    padding: 40px;
                    box-shadow: 0 20px 60px rgba(255, 0, 0, 0.3);
                    max-width: 800px;
                    width: 100%;
                    border: 2px solid #ff0000;
                }
                h1 { 
                    color: #ff0000; 
                    text-align: center; 
                    margin-bottom: 10px;
                    font-size: 3em;
                    text-shadow: 0 0 10px rgba(255,0,0,0.5);
                }
                .subtitle { 
                    text-align: center; 
                    color: #888; 
                    margin-bottom: 30px;
                }
                .status-card {
                    background: #2a2a2a;
                    border-radius: 10px;
                    padding: 20px;
                    margin-bottom: 20px;
                }
                .status-item {
                    color: white;
                    padding: 10px;
                    border-bottom: 1px solid #444;
                }
                .status-item:last-child {
                    border-bottom: none;
                }
                .label {
                    color: #ff0000;
                    font-weight: bold;
                }
                .online {
                    color: #00ff00;
                }
                .footer {
                    margin-top: 30px;
                    text-align: center;
                    color: #ff0000;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>IMPOSTER</h1>
                <div class="subtitle">Instagram Downloader Bot</div>
                
                <div class="status-card">
                    <div class="status-item">
                        <span class="label">Bot Status:</span> <span class="online">✅ ONLINE</span>
                    </div>
                    <div class="status-item">
                        <span class="label">Monitoring Channel:</span> <code>${TARGET_CHANNEL_ID}</code>
                    </div>
                    <div class="status-item">
                        <span class="label">No API Keys Required:</span> ✅ Using yt-dlp
                    </div>
                    <div class="status-item">
                        <span class="label">How to use:</span> Just paste any Instagram link in the channel!
                    </div>
                </div>
                
                <div class="footer">
                    © IMPOSTER 2026-2027
                </div>
            </div>
        </body>
        </html>
    `);
});

app.get('/health', (req, res) => {
    res.json({
        status: 'online',
        bot: client.user?.tag || 'Not connected',
        channel: TARGET_CHANNEL_ID,
        uptime: process.uptime()
    });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 Web server running on port ${PORT}`);
    console.log(`🌐 Web URL: http://localhost:${PORT}`);
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down...');
    await downloader.cleanupAll();
    client.destroy();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Shutting down...');
    await downloader.cleanupAll();
    client.destroy();
    process.exit(0);
});

// Login to Discord
if (!process.env.DISCORD_BOT_TOKEN) {
    console.error('❌ DISCORD_BOT_TOKEN not set in environment variables!');
    process.exit(1);
}

if (!process.env.DISCORD_CHANNEL_ID) {
    console.error('❌ DISCORD_CHANNEL_ID not set in environment variables!');
    process.exit(1);
}

client.login(process.env.DISCORD_BOT_TOKEN).catch(error => {
    console.error('❌ Failed to login to Discord:', error.message);
    process.exit(1);
});
