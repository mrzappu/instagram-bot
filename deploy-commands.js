// deploy-commands.js - Register Slash Commands with Discord
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
        console.log('🔄 Registering slash commands...');

        await rest.put(
            Routes.applicationGuildCommands(
                process.env.DISCORD_CLIENT_ID,
                process.env.DISCORD_GUILD_ID
            ),
            { body: commands }
        );

        console.log('✅ Slash commands registered successfully!');
    } catch (error) {
        console.error('❌ Error registering commands:', error);
    }
})();
