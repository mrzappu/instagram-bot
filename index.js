// index.js - Main Instagram Discord Bot with Bot Token
require('dotenv').config();
const express = require('express');
const ApifyService = require('./apifyService');
const DiscordService = require('./discordService');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize services
const apify = new ApifyService(process.env.APIFY_API_TOKEN);
const discord = new DiscordService(process.env.DISCORD_BOT_TOKEN, process.env.DISCORD_CHANNEL_ID);

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
                .input-group {
                    margin-bottom: 20px;
                }
                label {
                    color: white;
                    display: block;
                    margin-bottom: 5px;
                }
                input, select {
                    width: 100%;
                    padding: 12px;
                    background: #2a2a2a;
                    border: 2px solid #444;
                    border-radius: 8px;
                    color: white;
                    font-size: 14px;
                }
                input:focus, select:focus {
                    border-color: #ff0000;
                    outline: none;
                }
                button {
                    width: 100%;
                    padding: 15px;
                    background: #ff0000;
                    color: white;
                    border: none;
                    border-radius: 10px;
                    font-size: 16px;
                    font-weight: bold;
                    cursor: pointer;
                    margin-top: 20px;
                }
                button:hover {
                    background: #cc0000;
                }
                .status {
                    margin-top: 20px;
                    padding: 15px;
                    border-radius: 8px;
                    display: none;
                }
                .status.success {
                    background: #004d00;
                    color: #00ff00;
                    display: block;
                }
                .status.error {
                    background: #4d0000;
                    color: #ff6666;
                    display: block;
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
                <div class="subtitle">Instagram Discord Bot</div>
                
                <div class="input-group">
                    <label>Action Type:</label>
                    <select id="actionType">
                        <option value="profile">Profile Details + Ban Check</option>
                        <option value="stories">Active Stories</option>
                        <option value="reel">Reel Download</option>
                        <option value="post">Post Download</option>
                    </select>
                </div>
                
                <div class="input-group">
                    <label>Instagram Username or URL:</label>
                    <input type="text" id="input" placeholder="e.g., cristiano or https://instagram.com/reel/xxx">
                </div>
                
                <button onclick="submitRequest()">🚀 SEND TO DISCORD</button>
                
                <div id="status" class="status"></div>
                
                <div class="footer">
                    © IMPOSTER 2026-2027
                </div>
            </div>
            
            <script>
                async function submitRequest() {
                    const action = document.getElementById('actionType').value;
                    const input = document.getElementById('input').value.trim();
                    const statusDiv = document.getElementById('status');
                    
                    if (!input) {
                        statusDiv.className = 'status error';
                        statusDiv.textContent = 'Please enter a username or URL';
                        return;
                    }
                    
                    statusDiv.className = 'status';
                    statusDiv.textContent = 'Processing...';
                    
                    try {
                        const response = await fetch('/api/fetch', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ action, input })
                        });
                        
                        const data = await response.json();
                        
                        if (response.ok) {
                            statusDiv.className = 'status success';
                            statusDiv.textContent = '✅ Sent to Discord successfully!';
                        } else {
                            statusDiv.className = 'status error';
                            statusDiv.textContent = '❌ Error: ' + data.error;
                        }
                    } catch (error) {
                        statusDiv.className = 'status error';
                        statusDiv.textContent = '❌ Error: ' + error.message;
                    }
                }
            </script>
        </body>
        </html>
    `);
});

// ==================== API ENDPOINT ====================
app.post('/api/fetch', async (req, res) => {
    const { action, input } = req.body;
    
    if (!action || !input) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    
    try {
        switch(action) {
            case 'profile':
                const profile = await apify.getProfileDetails(input);
                await discord.sendProfile(profile);
                break;
                
            case 'stories':
                const stories = await apify.getStories(input);
                await discord.sendStories(input, stories);
                break;
                
            case 'reel':
                const reel = await apify.getReel(input);
                await discord.sendReel(reel);
                break;
                
            case 'post':
                const post = await apify.getPost(input);
                await discord.sendPost(post);
                break;
                
            default:
                return res.status(400).json({ error: 'Invalid action' });
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('API error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== HEALTH CHECK ====================
app.get('/health', (req, res) => {
    res.json({
        status: 'IMPOSTER ONLINE',
        version: '2.0.0',
        discord: discord.ready ? 'CONNECTED' : 'DISCONNECTED',
        copyright: 'IMPOSTER 2026-2027'
    });
});

// ==================== START SERVER ====================
app.listen(PORT, () => {
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
║   🔥 Instagram → Discord Bot Active
║   📊 Features: Profile • Stories • Reels • Posts
║   🤖 Bot Status: ${discord.ready ? '✅ CONNECTED' : '❌ DISCONNECTED'}
║   © IMPOSTER 2026-2027                          
╚══════════════════════════════════════════════════════════╝
    `);
});
