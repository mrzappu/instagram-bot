// index.js - Instagram Downloader Bot
require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const express = require('express');
const axios = require('axios');
const InstagramAPI = require('./instagramAPI');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Instagram API
const instagramAPI = new InstagramAPI(process.env.RAPIDAPI_KEY);

// Discord Client Setup
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const TARGET_CHANNEL_ID = process.env.DISCORD_CHANNEL_ID || '1475868986301223003';

// Bot Ready Event
client.once('ready', () => {
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
║   📍 Monitoring Channel: ${TARGET_CHANNEL_ID}
║   🔥 Instagram Downloader Bot - NO COMMANDS NEEDED
║   📥 Just paste any Instagram link in the channel
║   © IMPOSTER 2026-2027                          
╚══════════════════════════════════════════════════════════╝
    `);

    // Set bot status
    client.user.setActivity('Instagram Links', { type: 3 }); // WATCHING
});

// Message Handler - Auto detect Instagram links
client.on('messageCreate', async (message) => {
    // Ignore bot messages
    if (message.author.bot) return;
    
    // Only respond in the specified channel
    if (message.channel.id !== TARGET_CHANNEL_ID) return;

    // Extract Instagram URL from message
    const instagramUrl = await instagramAPI.extractInstagramUrl(message.content);
    
    if (!instagramUrl) return;

    console.log(`🔗 Instagram link detected: ${instagramUrl} from ${message.author.tag}`);

    // Send typing indicator
    await message.channel.sendTyping();

    // Download the media
    const media = await instagramAPI.downloadInstagramMedia(instagramUrl);

    if (!media || !media.mediaUrls || media.mediaUrls.length === 0) {
        return message.reply({
            content: '❌ Could not download this Instagram content. It might be private or the link is invalid.',
            allowedMentions: { repliedUser: true }
        });
    }

    // Create embed
    const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('📥 Instagram Downloader')
        .setDescription(`Downloaded for ${message.author}`)
        .setFooter({ text: `IMPOSTER Instagram Bot • ${new Date().toLocaleString()}` });

    if (media.caption) {
        embed.addFields({ name: '📝 Caption', value: media.caption.substring(0, 200) });
    }

    if (media.username) {
        embed.addFields({ name: '👤 User', value: `@${media.username}`, inline: true });
    }

    embed.addFields({ 
        name: '📱 Type', 
        value: media.type.charAt(0).toUpperCase() + media.type.slice(1), 
        inline: true 
    });

    // Send the embed
    await message.reply({ embeds: [embed] });

    // Download and send each media file
    for (let i = 0; i < media.mediaUrls.length; i++) {
        const mediaUrl = media.mediaUrls[i];
        const isVideo = mediaUrl.includes('.mp4') || media.type === 'video';
        const extension = isVideo ? 'mp4' : 'jpg';
        
        try {
            // Download the file
            const response = await axios({
                method: 'GET',
                url: mediaUrl,
                responseType: 'stream'
            });

            // Send to Discord
            await message.channel.send({
                files: [{
                    attachment: response.data,
                    name: `instagram_${Date.now()}_${i + 1}.${extension}`
                }]
            });

            // Small delay between multiple files
            if (i < media.mediaUrls.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        } catch (error) {
            console.error('Error sending file:', error.message);
            
            // Fallback: send the URL if file download fails
            if (i === 0) {
                await message.channel.send(`🔗 Direct link: ${mediaUrl}`);
            }
        }
    }

    // Send success message
    if (media.mediaUrls.length > 0) {
        await message.channel.send(`✅ Successfully downloaded ${media.mediaUrls.length} file(s)!`);
    }
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
                    <p>No commands needed - just paste Instagram links!</p>
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

// Login to Discord
client.login(process.env.DISCORD_BOT_TOKEN).catch(error => {
    console.error('Failed to login:', error.message);
    process.exit(1);
});
