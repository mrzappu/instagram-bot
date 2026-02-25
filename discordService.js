// discordService.js - Discord Bot Integration
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

class DiscordService {
    constructor(botToken, channelId) {
        this.botToken = botToken;
        this.channelId = channelId;
        this.client = new Client({ 
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent
            ] 
        });
        this.ready = false;
        this.init();
    }

    init() {
        this.client.once('ready', () => {
            console.log('✅ Discord Bot connected');
            this.ready = true;
        });

        this.client.on('error', (error) => {
            console.error('Discord client error:', error);
            this.ready = false;
        });

        this.client.login(this.botToken).catch(err => {
            console.error('Failed to login to Discord:', err.message);
            this.ready = false;
        });
    }

    async getChannel() {
        if (!this.ready || !this.channelId) return null;
        try {
            return await this.client.channels.fetch(this.channelId);
        } catch (error) {
            console.error('Failed to fetch channel:', error.message);
            return null;
        }
    }

    // ==================== SEND PROFILE TO DISCORD ====================
    async sendProfile(profileData) {
        const channel = await this.getChannel();
        if (!channel) return;

        const embed = new EmbedBuilder()
            .setTitle(`📊 Instagram Profile: ${profileData.username}`)
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
            .setFooter({ text: `IMPOSTER Instagram Bot • ${new Date().toLocaleString()}` });

        if (profileData.isBanned) {
            embed.addFields({ name: '⚠️ BAN DETECTED', value: profileData.banReason || 'Account may be banned', inline: false });
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

        await channel.send({ embeds: [embed] });
    }

    // ==================== SEND STORIES TO DISCORD ====================
    async sendStories(username, stories) {
        const channel = await this.getChannel();
        if (!channel) return;

        if (!stories || stories.length === 0) {
            const embed = new EmbedBuilder()
                .setTitle(`📖 Stories for @${username}`)
                .setColor(0xffaa00)
                .setDescription('No active stories found')
                .setFooter({ text: `IMPOSTER Instagram Bot • ${new Date().toLocaleString()}` });
            return channel.send({ embeds: [embed] });
        }

        const summaryEmbed = new EmbedBuilder()
            .setTitle(`📖 Stories for @${username}`)
            .setColor(0x00ff00)
            .setDescription(`Found **${stories.length}** active stories`)
            .setFooter({ text: `IMPOSTER Instagram Bot • ${new Date().toLocaleString()}` });
        await channel.send({ embeds: [summaryEmbed] });

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
                .setFooter({ text: `IMPOSTER Instagram Bot • ${new Date().toLocaleString()}` });

            if (story.mentions && story.mentions.length > 0) {
                storyEmbed.addFields({ name: '👥 Mentions', value: story.mentions.join(', '), inline: false });
            }

            await channel.send({ embeds: [storyEmbed] });

            if (isVideo && story.mediaUrl) {
                await this.sendMediaFile(channel, story.mediaUrl, `story_${story.id}.mp4`);
            }
        }

        if (stories.length > 5) {
            const moreEmbed = new EmbedBuilder()
                .setTitle('📌 Note')
                .setColor(0xffaa00)
                .setDescription(`Showing first 5 of ${stories.length} stories`)
                .setFooter({ text: `IMPOSTER Instagram Bot • ${new Date().toLocaleString()}` });
            await channel.send({ embeds: [moreEmbed] });
        }
    }

    // ==================== SEND REEL TO DISCORD ====================
    async sendReel(reelData) {
        const channel = await this.getChannel();
        if (!channel) return;

        if (!reelData) {
            const embed = new EmbedBuilder()
                .setTitle('❌ Reel Not Found')
                .setColor(0xff0000)
                .setDescription('Could not fetch reel data')
                .setFooter({ text: `IMPOSTER Instagram Bot • ${new Date().toLocaleString()}` });
            return channel.send({ embeds: [embed] });
        }

        const embed = new EmbedBuilder()
            .setTitle(`🎬 Instagram Reel`)
            .setURL(reelData.url)
            .setColor(0xff0000)
            .setThumbnail(reelData.thumbnailUrl)
            .addFields(
                { name: '👤 Owner', value: `@${reelData.ownerUsername}${reelData.isVerified ? ' ✅' : ''}`, inline: true },
                { name: '❤️ Likes', value: reelData.likesCount.toLocaleString(), inline: true },
                { name: '💬 Comments', value: reelData.commentsCount.toLocaleString(), inline: true },
                { name: '▶️ Plays', value: reelData.playCount.toLocaleString(), inline: true },
                { name: '⏱️ Duration', value: reelData.duration ? `${reelData.duration}s` : 'N/A', inline: true },
                { name: '📅 Posted', value: new Date(reelData.timestamp).toLocaleString(), inline: true }
            )
            .setDescription(reelData.caption ? reelData.caption.substring(0, 200) : 'No caption')
            .setFooter({ text: `IMPOSTER Instagram Bot • ${new Date().toLocaleString()}` });

        await channel.send({ embeds: [embed] });

        if (reelData.videoUrl) {
            await this.sendMediaFile(channel, reelData.videoUrl, `reel_${reelData.shortCode}.mp4`);
        }
    }

    // ==================== SEND POST TO DISCORD ====================
    async sendPost(postData) {
        const channel = await this.getChannel();
        if (!channel) return;

        if (!postData) {
            const embed = new EmbedBuilder()
                .setTitle('❌ Post Not Found')
                .setColor(0xff0000)
                .setDescription('Could not fetch post data')
                .setFooter({ text: `IMPOSTER Instagram Bot • ${new Date().toLocaleString()}` });
            return channel.send({ embeds: [embed] });
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
                { name: '💬 Comments', value: postData.commentsCount.toLocaleString(), inline: true },
                { name: '📅 Posted', value: new Date(postData.timestamp).toLocaleString(), inline: true }
            )
            .setDescription(postData.caption ? postData.caption.substring(0, 200) : 'No caption')
            .setFooter({ text: `IMPOSTER Instagram Bot • ${new Date().toLocaleString()}` });

        if (postData.location) {
            embed.addFields({ name: '📍 Location', value: postData.location, inline: true });
        }

        await channel.send({ embeds: [embed] });

        if (isCarousel && postData.carouselItems) {
            for (let i = 0; i < Math.min(postData.carouselItems.length, 5); i++) {
                const item = postData.carouselItems[i];
                const isItemVideo = item.is_video;
                const mediaUrl = item.video_url || item.image_url;
                if (mediaUrl) {
                    const ext = isItemVideo ? 'mp4' : 'jpg';
                    await this.sendMediaFile(channel, mediaUrl, `carousel_${i}.${ext}`);
                }
            }
        } else if (postData.mediaUrls && postData.mediaUrls.length > 0) {
            for (let i = 0; i < postData.mediaUrls.length; i++) {
                const mediaUrl = postData.mediaUrls[i];
                const ext = isVideo ? 'mp4' : 'jpg';
                await this.sendMediaFile(channel, mediaUrl, `post_${i}.${ext}`);
            }
        }
    }

    // ==================== HELPER METHODS ====================
    async sendMediaFile(channel, url, filename) {
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

            await channel.send({ files: [tempPath] });
            fs.unlink(tempPath, () => {});
        } catch (error) {
            console.error('Media send error:', error.message);
        }
    }
}

module.exports = DiscordService;
