const { REST, Routes } = require('discord.js');
require('dotenv').config();

const commands = [
    {
        name: 'help',
        description: 'Show all available commands',
    },
    {
        name: 'profile',
        description: 'Get Instagram profile details with ban check',
        options: [
            {
                name: 'username',
                description: 'Instagram username',
                type: 3, // STRING
                required: true,
            },
        ],
    },
    {
        name: 'stories',
        description: 'Get active Instagram stories',
        options: [
            {
                name: 'username',
                description: 'Instagram username',
                type: 3,
                required: true,
            },
        ],
    },
    {
        name: 'reel',
        description: 'Download Instagram reel',
        options: [
            {
                name: 'url',
                description: 'Instagram reel URL',
                type: 3,
                required: true,
            },
        ],
    },
    {
        name: 'post',
        description: 'Download Instagram post',
        options: [
            {
                name: 'url',
                description: 'Instagram post URL',
                type: 3,
                required: true,
            },
        ],
    },
    {
        name: 'stats',
        description: 'Show bot statistics',
    },
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);

(async () => {
    try {
        console.log('🔄 Started refreshing application (/) commands.');
        console.log(`📋 Commands to register: ${commands.map(c => c.name).join(', ')}`);
        console.log(`🔑 Client ID: ${process.env.DISCORD_CLIENT_ID}`);
        console.log(`🔑 Guild ID: ${process.env.DISCORD_GUILD_ID}`);

        // Check if --global flag is passed
        const isGlobal = process.argv.includes('--global');
        
        let route;
        if (isGlobal) {
            console.log('🌍 Registering GLOBAL commands (can take up to 1 hour to appear)');
            route = Routes.applicationCommands(process.env.DISCORD_CLIENT_ID);
        } else {
            console.log('🏠 Registering GUILD commands (instant)');
            route = Routes.applicationGuildCommands(
                process.env.DISCORD_CLIENT_ID,
                process.env.DISCORD_GUILD_ID
            );
        }

        const data = await rest.put(route, { body: commands });

        console.log(`✅ Successfully reloaded ${data.length} application (/) commands.`);
        
        if (isGlobal) {
            console.log('⚠️ Global commands may take up to 1 hour to appear in all servers.');
        } else {
            console.log('✅ Guild commands should appear immediately in your server.');
        }

    } catch (error) {
        console.error('❌ Error registering commands:');
        
        if (error.code === 50001) {
            console.error('❌ Missing Access: Bot lacks permissions or is not in the guild.');
            console.error('📝 Make sure you invited the bot with "applications.commands" scope!');
        } else if (error.code === 50035) {
            console.error('❌ Invalid Form Body: Check your client ID and guild ID.');
        } else if (error.code === 40001) {
            console.error('❌ Unauthorized: Your bot token is invalid.');
        } else {
            console.error(error);
        }

        // Try global commands as fallback for guild commands
        if (!isGlobal) {
            console.log('\n🔄 Attempting to register as global commands instead...');
            try {
                const globalData = await rest.put(
                    Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
                    { body: commands }
                );
                console.log(`✅ Successfully reloaded ${globalData.length} global commands.`);
                console.log('⚠️ Global commands can take up to 1 hour to appear.');
            } catch (globalError) {
                console.error('❌ Global registration also failed:');
                if (globalError.code === 50001) {
                    console.error('❌ Bot still lacks permissions. Check your OAuth2 setup!');
                } else {
                    console.error(globalError);
                }
                process.exit(1);
            }
        } else {
            process.exit(1);
        }
    }
})();
