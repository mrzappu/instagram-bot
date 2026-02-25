// discordBot.js - Discord Bot with Slash Commands
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

class DiscordBot {
    constructor(botToken, apifyService) {
        this.botToken = botToken;
        this.apify = apifyService;
        this.client = new Client({ 
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent
            ] 
        });
        this.ready = false;
        this.commands = new Map();
        this.setupCommands();
    }

    setupCommands() {
        // Help Command
        this.commands.set('help', {
            execute: this.handleHelp.bind(this)
        });

        // Profile Command
        this.commands.set('profile', {
            execute: this.handleProfile.bind(this)
        });

        // Stories Command
        this.commands.set('stories', {
            execute: this.handleStories.bind(this)
        });

        // Reel Command
        this.commands.set('reel', {
            execute: this.handleReel.bind(this)
        });

        // Post Command
        this.commands.set('post', {
            execute: this.handlePost.bind(this)
        });

        // Stats Command
        this.commands.set('stats', {
            execute: this.handleStats.bind(this)
        });
    }

    async init() {
        this.client.once('ready', () => {
            console.log('✅ Discord Bot connected with slash commands');
            this.ready = true;
            this.setActivity();
        });

        this.client.on('interactionCreate', async (interaction) => {
            if (!interaction.isCommand()) return;

            const command = this.commands.get(interaction.commandName);
            if (!command) return;

            try {
                await interaction.deferReply();
                await command.execute(interaction);
            } catch (error) {
                console.error('Command error:', error);
                await interaction.editReply({ 
                    content: '❌ An error occurred while executing this command.',
                    ephemeral: true 
                });
            }
        });

        this.client.on('error', (error) => {
            console.error('Discord client error:', error);
            this.ready = false;
        });

        await this.client.login(this.botToken);
    }

    setActivity() {
        this.client.user.setActivity('/help | Instagram Bot', { type: 3 }); // 3 = WATCHING
    }

    // ==================== COMMAND HANDLERS ====================

    async handleHelp(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('🤖 IMPOSTER Instagram Bot Commands')
            .setColor(0xff0000)
            .setDescription('Here are all available commands:')
            .addFields(
                { name: '/help', value: 'Show this help menu', inline: false },
                { name: '/profile <username>', value: 'Get Instagram profile details with ban check', inline: false },
                { name: '/stories <username>', value: 'Get active Instagram stories', inline: false },
                { name: '/reel <url>', value: 'Download Instagram reel', inline: false },
                { name: '/post <url>', value: 'Download Instagram post', inline: false },
                { name: '/stats', value: 'Show bot statistics', inline: false }
            )
            .setFooter({ text: 'IMPOSTER Instagram Bot • 2026-2027' })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    }

    async handleProfile(interaction) {
        const username = interaction.options.getString('username');
        
        await interaction.editReply({ content: `🔍 Fetching profile for @${username}...` });

        const profileData = await this.apify.getProfileDetails(username);

        const embed = new EmbedBuilder()
            .setTitle(`📊 Instagram Profile: @${profileData.username}`)
            .setColor(profileData.isBanned ? 0xff0000 : (profileData.isPrivate ? 0xffaa00 : 0x00ff00))
            .setThumbnail(profileData.hdProfilePicUrl || profileData.profilePicUrl || 'https://i.imgur.com/wSTkf2s.png')
            .addFields(
                { name: '👤 Full Name', value: profileData.fullName || 'N/A', inline: true },
                { name: '🔒 Private', value: profileData.isPrivate ? 'Yes' : 'No', inline: true },
                { name: '✅ Verified', value: profileData.isVerified ? 'Yes' : 'No', inline: true },
                { name: '📊 Followers', value: profileData.followersCount.toLocaleString(), inline: true },
                { name: '👥 Following', value: profileData.followsCount.toLocaleString(), inline: true },
                { name: '📸 Posts', value: profileData.postsCount.toLocaleString(), inline: true }
            )
            .setDescription(profileData.biography || 'No bio')
            .setFooter({ text: `Requested by ${interaction.user.tag}` })
            .setTimestamp();

        if (profileData.isBanned) {
            embed.addFields({ 
                name: '⚠️ BAN DETECTED', 
                value: profileData.banReason || 'Account may be banned or restricted', 
                inline: false 
            });
        }

        if (profileData.recentPosts && profileData.recentPosts.length > 0) {
            let postsText = '';
            profileData.recentPosts.slice(0, 3).forEach(post => {
                postsText += `[${post.shortCode}](${post.url}) - ❤️ ${post.likesCount} | 💬 ${post.commentsCount}\n`;
            });
            embed.addFields({ name: '📌 Recent Posts', value: postsText || 'No recent posts', inline: false });
        }

        if (profileData.error) {
            embed.addFields({ name: '⚠️ Error', value: profileData.error, inline: false });
        }

        await interaction.editReply({ content: null, embeds: [embed] });
    }

    async handleStories(interaction) {
        const username = interaction.options.getString('username');
        
        await interaction.editReply({ content: `📖 Fetching stories for @${username}...` });

        const stories = await this.apify.getStories(username);

        if (!stories || stories.length === 0) {
            const embed = new EmbedBuilder()
                .setTitle(`📖 Stories for @${username}`)
                .setColor(0xffaa00)
                .setDescription('No active stories found')
                .setFooter({ text: `Requested by ${interaction.user.tag}` })
                .setTimestamp();

            return await interaction.editReply({ content: null, embeds: [embed] });
        }

        const summaryEmbed = new EmbedBuilder()
            .setTitle(`📖 Stories for @${username}`)
            .setColor(0x00ff00)
            .setDescription(`Found **${stories.length}** active stories`)
            .setFooter({ text: `Requested by ${interaction.user.tag}` })
            .setTimestamp();

        await interaction.editReply({ content: null, embeds: [summaryEmbed] });

        // Send each story
        for (let i = 0; i < Math.min(stories.length, 5); i++) {
            const story = stories[i];
            const isVideo = story.mediaType === 2;
            
            const storyEmbed = new EmbedBuilder()
                .setTitle(`Story #${i + 1}`)
                .setColor(isVideo ? 0x0099ff : 0x00ff00)
                .addFields(
                    { name: '📅 Taken At', value: new Date(story.takenAt * 1000).toLocaleString(), inline: true },
                    { name: '⏰ Expires', value: new Date(story.expiresAt * 1000).toLocaleString(), inline: true },
                    { name: '📱 Type', value: isVideo ? 'Video' : 'Image', inline: true }
                )
                .setImage(isVideo ? null : story.mediaUrl)
                .setFooter({ text: `Requested by ${interaction.user.tag}` })
                .setTimestamp();

            if (story.mentions && story.mentions.length > 0) {
                storyEmbed.addFields({ name: '👥 Mentions', value: story.mentions.join(', '), inline: false });
            }

            await interaction.followUp({ embeds: [storyEmbed] });

            if (isVideo && story.mediaUrl) {
                await this.sendMediaFile(interaction, story.mediaUrl, `story_${story.id}.mp4`);
            }
        }

        if (stories.length > 5) {
            const moreEmbed = new EmbedBuilder()
                .setTitle('📌 Note')
                .setColor(0xffaa00)
                .setDescription(`Showing first 5 of ${stories.length} stories`)
                .setFooter({ text: `Requested by ${interaction.user.tag}` })
                .setTimestamp();

            await interaction.followUp({ embeds: [moreEmbed] });
        }
    }

    async handleReel(interaction) {
        const url = interaction.options.getString('url');
        
        await interaction.editReply({ content: `🎬 Fetching reel...` });

        const reelData = await this.apify.getReel(url);

        if (!reelData) {
            const embed = new EmbedBuilder()
                .setTitle('❌ Reel Not Found')
                .setColor(0xff0000)
                .setDescription('Could not fetch reel data. Make sure the URL is valid.')
                .setFooter({ text: `Requested by ${interaction.user.tag}` })
                .setTimestamp();

            return await interaction.editReply({ content: null, embeds: [embed] });
        }

        const embed = new EmbedBuilder()
            .setTitle(`🎬 Instagram Reel by @${reelData.ownerUsername}`)
            .setURL(reelData.url)
            .setColor(0xff0000)
            .setThumbnail(reelData.thumbnailUrl)
            .addFields(
                { name: '❤️ Likes', value: reelData.likesCount.toLocaleString(), inline: true },
                { name: '💬 Comments', value: reelData.commentsCount.toLocaleString(), inline: true },
                { name: '▶️ Plays', value: reelData.playCount.toLocaleString(), inline: true },
                { name: '⏱️ Duration', value: reelData.duration ? `${reelData.duration}s` : 'N/A', inline: true },
                { name: '✅ Verified', value: reelData.isVerified ? 'Yes' : 'No', inline: true }
            )
            .setDescription(reelData.caption ? reelData.caption.substring(0, 200) : 'No caption')
            .setFooter({ text: `Requested by ${interaction.user.tag}` })
            .setTimestamp();

        await interaction.editReply({ content: null, embeds: [embed] });

        if (reelData.videoUrl) {
            await this.sendMediaFile(interaction, reelData.videoUrl, `reel_${reelData.shortCode}.mp4`);
        }
    }

    async handlePost(interaction) {
        const url = interaction.options.getString('url');
        
        await interaction.editReply({ content: `📸 Fetching post...` });

        const postData = await this.apify.getPost(url);

        if (!postData) {
            const embed = new EmbedBuilder()
                .setTitle('❌ Post Not Found')
                .setColor(0xff0000)
                .setDescription('Could not fetch post data. Make sure the URL is valid.')
                .setFooter({ text: `Requested by ${interaction.user.tag}` })
                .setTimestamp();

            return await interaction.editReply({ content: null, embeds: [embed] });
        }

        const isVideo = postData.mediaType === 2;
        const isCarousel = postData.mediaType === 8;

        const embed = new EmbedBuilder()
            .setTitle(isCarousel ? '📸 Instagram Carousel' : (isVideo ? '🎥 Instagram Video' : '📷 Instagram Photo'))
            .setURL(postData.url)
            .setColor(isVideo ? 0x0099ff : 0x00ff00)
            .setThumbnail(postData.thumbnailUrl)
            .addFields(
                { name: '👤 Owner', value: `@${postData.ownerUsername}${postData.isVerified ? ' ✅' : ''}`, inline: true },
                { name: '❤️ Likes', value: postData.likesCount.toLocaleString(), inline: true },
                { name: '💬 Comments', value: postData.commentsCount.toLocaleString(), inline: true }
            )
            .setDescription(postData.caption ? postData.caption.substring(0, 200) : 'No caption')
            .setFooter({ text: `Requested by ${interaction.user.tag}` })
            .setTimestamp();

        if (postData.location) {
            embed.addFields({ name: '📍 Location', value: postData.location, inline: true });
        }

        await interaction.editReply({ content: null, embeds: [embed] });

        if (isCarousel && postData.carouselItems) {
            for (let i = 0; i < Math.min(postData.carouselItems.length, 5); i++) {
                const item = postData.carouselItems[i];
                const isItemVideo = item.is_video;
                const mediaUrl = item.video_url || item.image_url;
                if (mediaUrl) {
                    const ext = isItemVideo ? 'mp4' : 'jpg';
                    await this.sendMediaFile(interaction, mediaUrl, `carousel_${i}.${ext}`);
                }
            }
        } else if (postData.mediaUrls && postData.mediaUrls.length > 0) {
            for (let i = 0; i < postData.mediaUrls.length; i++) {
                const mediaUrl = postData.mediaUrls[i];
                const ext = isVideo ? 'mp4' : 'jpg';
                await this.sendMediaFile(interaction, mediaUrl, `post_${i}.${ext}`);
            }
        }
    }

    async handleStats(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('📊 Bot Statistics')
            .setColor(0xff0000)
            .addFields(
                { name: '🤖 Bot Name', value: this.client.user.tag, inline: true },
                { name: '📅 Uptime', value: `${Math.floor(process.uptime() / 3600)}h ${Math.floor((process.uptime() % 3600) / 60)}m`, inline: true },
                { name: '🔄 Version', value: '3.0.0', inline: true },
                { name: '📌 Servers', value: `${this.client.guilds.cache.size}`, inline: true },
                { name: '👥 Users', value: `${this.client.users.cache.size}`, inline: true },
                { name: '⚡ Commands', value: '6', inline: true }
            )
            .setFooter({ text: 'IMPOSTER Instagram Bot • 2026-2027' })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    }

    // ==================== HELPER METHODS ====================
    async sendMediaFile(interaction, url, filename) {
        try {
            const response = await axios({
                method: 'GET',
                url: url,
                responseType: 'stream'
            });

            const tempPath = `/tmp/${filename}`;
            const writer = fs.createWriteStream(tempPath);
            response.data.pipe(writer);

            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

            await interaction.followUp({ files: [tempPath] });
            fs.unlink(tempPath, () => {});
        } catch (error) {
            console.error('Media send error:', error.message);
            await interaction.followUp({ content: '❌ Failed to download media file.' });
        }
    }

    getStatus() {
        return this.ready ? 'CONNECTED' : 'DISCONNECTED';
    }
}

module.exports = DiscordBot;
