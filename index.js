require('dotenv').config();
const express = require('express');
const ApifyService = require('./apifyService');
const DiscordBot = require('./discordBot');

const app = express();
const PORT = process.env.PORT || 3000;

// Log environment variables (without revealing full tokens)
console.log('🔍 Environment Check:');
console.log(`- DISCORD_BOT_TOKEN: ${process.env.DISCORD_BOT_TOKEN ? '✅ Set' : '❌ Missing'}`);
console.log(`- DISCORD_CLIENT_ID: ${process.env.DISCORD_CLIENT_ID ? '✅ Set' : '❌ Missing'}`);
console.log(`- DISCORD_GUILD_ID: ${process.env.DISCORD_GUILD_ID ? '✅ Set' : '❌ Missing'}`);
console.log(`- APIFY_API_TOKEN: ${process.env.APIFY_API_TOKEN ? '✅ Set' : '❌ Missing'}`);
console.log('');

// Initialize services
const apify = new ApifyService(process.env.APIFY_API_TOKEN);
const discordBot = new DiscordBot(process.env.DISCORD_BOT_TOKEN, apify);

// Start Discord bot
discordBot.init();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==================== WEB INTERFACE ====================
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>IMPOSTER Instagram Bot</title>
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
                    border: 1px solid #ff0000;
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
                .command-list {
                    background: #2a2a2a;
                    border-radius: 10px;
                    padding: 20px;
                    margin-bottom: 20px;
                }
                .command-item {
                    color: white;
                    padding: 10px;
                    border-bottom: 1px solid #444;
                }
                .command-item:last-child {
                    border-bottom: none;
                }
                .command-name {
                    color: #ff0000;
                    font-weight: bold;
                }
                .status {
                    text-align: center;
                    padding: 20px;
                    background: #1a1a1a;
                    border-radius: 10px;
                    color: #00ff00;
                    margin-top: 20px;
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
                <div class="subtitle">Instagram Discord Bot with Slash Commands</div>
                
                <div class="command-list">
                    <div class="command-item">
                        <span class="command-name">/help</span> - Show all available commands
                    </div>
                    <div class="command-item">
                        <span class="command-name">/profile &lt;username&gt;</span> - Get Instagram profile details with ban check
                    </div>
                    <div class="command-item">
                        <span class="command-name">/stories &lt;username&gt;</span> - Get active Instagram stories
                    </div>
                    <div class="command-item">
                        <span class="command-name">/reel &lt;url&gt;</span> - Download Instagram reel
                    </div>
                    <div class="command-item">
                        <span class="command-name">/post &lt;url&gt;</span> - Download Instagram post
                    </div>
                    <div class="command-item">
                        <span class="command-name">/stats</span> - Show bot statistics
                    </div>
                </div>
                
                <div class="status">
                    Bot Status: ${discordBot.getStatus() === 'CONNECTED' ? '✅ ONLINE' : '❌ OFFLINE'}
                </div>
                
                <div class="footer">
                    © IMPOSTER 2026-2027
                </div>
            </div>
        </body>
        </html>
    `);
});

// ==================== HEALTH CHECK ====================
app.get('/health', (req, res) => {
    res.json({
        status: 'IMPOSTER ONLINE',
        version: '3.0.0',
        discord: discordBot.getStatus(),
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        copyright: 'IMPOSTER 2026-2027'
    });
});

// ==================== START SERVER ====================
app.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔══════════════════════════════════════════════════════════╗
║   ██╗███╗   ███╗██████╗  ██████╗ ███████╗████████╗     ║
║   ██║████╗ ████║██╔══██╗██╔═══██╗██╔════╝╚══██╔══╝     ║
║   ██║██╔████╔██║██████╔╝██║   ██║███████╗   ██║        ║
║   ██║██║╚██╔╝██║██╔═══╝ ██║   ██║╚════██║   ██║        ║
║   ██║██║ ╚═╝ ██║██║     ╚██████╔╝███████║   ██║        ║
║   ╚═╝╚═╝     ╚═╝╚═╝      ╚═════╝ ╚══════╝   ╚═╝        ║
╠══════════════════════════════════════════════════════════╣
║   📍 Port: ${PORT}                                           
║   🌐 URL: http://localhost:${PORT}                             
║   🔥 Instagram Discord Bot with Slash Commands
║   📊 Commands: /help • /profile • /stories • /reel • /post • /stats
║   🤖 Bot Status: ${discordBot.getStatus()}
║   © IMPOSTER 2026-2027                          
╚══════════════════════════════════════════════════════════╝
    `);
});
