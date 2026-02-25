// index.js - Main Discord Bot with yt-dlp (NO API KEYS)
require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const express = require('express');
const InstagramDownloader = require('./instagramDownloader');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize downloader
const downloader = new InstagramDownloader();

// Check if yt-dlp is installed
async function checkYtDlp() {
    try {
        const { stdout } = await execPromise('yt-dlp --version');
        console.log(`✅ yt-dlp version ${stdout.trim()} found`);
        return true;
    } catch (error) {
        console.error('❌ yt-dlp not found! Attempting to install...');
        try {
            await execPromise('pip install yt-dlp');
            console.log('✅ yt-dlp installed successfully');
            return true;
        } catch (installError) {
            console.error('❌ Failed to install yt-dlp:', installError.message);
            return false;
        }
    }
}

// Discord Client Setup
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const TARGET_CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;

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
║   🔥 Instagram Downloader - NO API KEYS NEEDED
║   📥 Powered by yt-dlp
║   © IMPOSTER 2026-2027                          
╚══════════════════════════════════════════════════════════╝
    `);

    // Check yt-dlp installation
    const ytDlpReady = await checkYtDlp();
    if (!ytDlpReady) {
        console.error('❌ Bot cannot function without yt-dlp. Exiting...');
        process.exit(1);
    }

    client.user.setActivity('Instagram Links', { type: 3 });
});

// Message Handler - Auto detect Instagram links
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (message.channel.id !== TARGET_CHANNEL_ID) return;

    const instagramUrl = await downloader.extractInstagramUrl(message.content);
    
    if (!instagramUrl) return;

    console.log(`🔗 Instagram link detected: ${instagramUrl} from ${message.author.tag}`);

    // Send typing indicator
    await message.channel.sendTyping();

    // Send initial status
    const statusMsg = await message.reply({
        content: `📥 Downloading Instagram content...\nURL: ${instagramUrl}`,
        allowedMentions: { repliedUser: true }
    });

    // Download the media
    const media = await downloader.downloadMedia(instagramUrl);

    if (!media) {
        return await statusMsg.edit({
            content: `❌ Failed to download. This might be a private account or an unsupported format.\nURL: ${instagramUrl}`
        });
    }

    // Create embed
    const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('📥 Instagram Downloader')
        .setDescription(`Downloaded for ${message.author}`)
        .addFields(
            { name: '📱 Type', value: media.fileName.endsWith('.mp4') ? 'Video' : 'Image', inline: true },
            { name: '📦 Size', value: `${(media.fileSize / 1024 / 1024).toFixed(2)} MB`, inline: true }
        )
        .setFooter({ text: `IMPOSTER Instagram Bot • No API Required` })
        .setTimestamp();

    if (media.uploader) {
        embed.addFields({ name: '👤 Uploader', value: `@${media.uploader}`, inline: true });
    }

    if (media.description) {
        const shortDesc = media.description.length > 100 
            ? media.description.substring(0, 100) + '...' 
            : media.description;
        embed.addFields({ name: '📝 Caption', value: shortDesc });
    }

    // Send the embed
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
        await message.channel.send(`❌ Failed to send file. The file might be too large for Discord.`);
    }

    // Clean up temp files
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
            <style>
                body {
                    font-family: 'Segoe UI', sans-serif;
                    background: linear-gradient(135deg, #1a1a1a 0%, #2c3e50 100%);
                    color: white;
                    text-align: center;
                    padding: 50px;
                }
                .container {
                    background: rgba(20, 20, 20, 0.95);
                    border-radius: 20px;
                    padding: 40px;
                    max-width: 600px;
                    margin: 0 auto;
                    border: 2px solid #ff0000;
                }
                h1 {
                    color: #ff0000;
                    font-size: 3em;
                }
                .status {
                    background: #2a2a2a;
                    padding: 20px;
                    border-radius: 10px;
                    margin: 20px 0;
                }
                .online {
                    color: #00ff00;
                }
                .feature {
                    background: #333;
                    padding: 10px;
                    margin: 10px 0;
                    border-radius: 5px;
                }
                .footer {
                    margin-top: 30px;
                    color: #ff0000;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>IMPOSTER</h1>
                <h2>Instagram Downloader Bot</h2>
                
                <div class="status">
                    <h3>Bot Status: <span class="online">✅ ONLINE</span></h3>
                    <p>Monitoring Channel: <code>${TARGET_CHANNEL_ID}</code></p>
                </div>
                
                <div class="feature">
                    <strong>🔥 NO API KEYS REQUIRED</strong>
                </div>
                <div class="feature">
                    <strong>📥 Powered by yt-dlp</strong>
                </div>
                <div class="feature">
                    <strong>🎯 Just paste any Instagram link!</strong>
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
});

// Cleanup on exit
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down...');
    await downloader.cleanupAll();
    process.exit(0);
});

// Login to Discord
client.login(process.env.DISCORD_BOT_TOKEN).catch(error => {
    console.error('Failed to login:', error.message);
    process.exit(1);
});
