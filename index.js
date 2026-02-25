// index.js - Fixed yt-dlp installation
require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const express = require('express');
const InstagramDownloader = require('./instagramDownloader');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize downloader
const downloader = new InstagramDownloader();

// Check multiple possible yt-dlp locations
async function findYtDlp() {
    const possiblePaths = [
        'yt-dlp',                    // in PATH
        '/tmp/yt-dlp',                // downloaded binary
        '/opt/render/.local/bin/yt-dlp', // pipx location
        './yt-dlp',                   // local folder
        '/usr/local/bin/yt-dlp'       // system location
    ];
    
    for (const ytPath of possiblePaths) {
        try {
            const { stdout } = await execPromise(`${ytPath} --version`);
            console.log(`✅ yt-dlp found at ${ytPath} (version ${stdout.trim()})`);
            return ytPath;
        } catch (e) {
            // Not found at this path
        }
    }
    return null;
}

async function installYtDlp() {
    console.log('📦 Attempting to install yt-dlp...');
    
    // Method 1: Download static binary (MOST RELIABLE)
    try {
        console.log('Method 1: Downloading static binary...');
        await execPromise('curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /tmp/yt-dlp');
        await execPromise('chmod a+rx /tmp/yt-dlp');
        const { stdout } = await execPromise('/tmp/yt-dlp --version');
        console.log(`✅ yt-dlp binary installed: version ${stdout.trim()}`);
        return '/tmp/yt-dlp';
    } catch (error) {
        console.log('Method 1 failed:', error.message);
    }
    
    // Method 2: Try pipx (safer than pip)
    try {
        console.log('Method 2: Trying pipx...');
        await execPromise('pipx install yt-dlp');
        await execPromise('pipx ensurepath');
        const { stdout } = await execPromise('/opt/render/.local/bin/yt-dlp --version');
        console.log(`✅ yt-dlp installed via pipx: version ${stdout.trim()}`);
        return '/opt/render/.local/bin/yt-dlp';
    } catch (error) {
        console.log('Method 2 failed:', error.message);
    }
    
    // Method 3: Try with --break-system-packages (last resort)
    try {
        console.log('Method 3: Trying pip with override...');
        await execPromise('pip install --break-system-packages yt-dlp');
        const { stdout } = await execPromise('yt-dlp --version');
        console.log(`✅ yt-dlp installed via pip override: version ${stdout.trim()}`);
        return 'yt-dlp';
    } catch (error) {
        console.log('Method 3 failed:', error.message);
    }
    
    return null;
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

    // Check and install yt-dlp
    let ytPath = await findYtDlp();
    if (!ytPath) {
        console.log('❌ yt-dlp not found, attempting installation...');
        ytPath = await installYtDlp();
    }
    
    if (ytPath) {
        console.log(`✅ Bot ready to download using: ${ytPath}`);
        // Store the path for later use
        process.env.YT_DLP_PATH = ytPath;
    } else {
        console.error('❌ Could not install yt-dlp. Bot cannot function.');
        process.exit(1);
    }

    client.user.setActivity('Instagram Links', { type: 3 });
});

// Message Handler
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (message.channel.id !== TARGET_CHANNEL_ID) return;

    const instagramUrl = await downloader.extractInstagramUrl(message.content);
    
    if (!instagramUrl) return;

    console.log(`🔗 Instagram link detected: ${instagramUrl} from ${message.author.tag}`);

    await message.channel.sendTyping();

    const statusMsg = await message.reply({
        content: `📥 Downloading Instagram content...\nURL: ${instagramUrl}`,
        allowedMentions: { repliedUser: true }
    });

    const media = await downloader.downloadMedia(instagramUrl, process.env.YT_DLP_PATH);

    if (!media) {
        return await statusMsg.edit({
            content: `❌ Failed to download. This might be a private account or an unsupported format.\nURL: ${instagramUrl}`
        });
    }

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

    await statusMsg.edit({ content: null, embeds: [embed] });

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

    await downloader.cleanup(media.filePath);
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
        ytDlpPath: process.env.YT_DLP_PATH || 'Not found',
        uptime: process.uptime()
    });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 Web server running on port ${PORT}`);
});

// Login to Discord
client.login(process.env.DISCORD_BOT_TOKEN).catch(error => {
    console.error('Failed to login:', error.message);
    process.exit(1);
});
