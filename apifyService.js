const axios = require('axios');

class ApifyService {
    constructor(apiToken) {
        this.apiToken = apiToken;
        this.baseUrl = 'https://api.apify.com/v2';
    }

    async getProfileDetails(username) {
        console.log(`🔍 Fetching profile for: ${username}`);
        
        try {
            const response = await axios.post(
                `${this.baseUrl}/acts/coderx~instagram-profile-scraper-api/runs`,
                { usernames: [username] },
                { 
                    params: { 
                        token: this.apiToken, 
                        waitForFinish: 60 
                    } 
                }
            );

            const runId = response.data.data.id;
            console.log(`⏳ Waiting for profile data...`);
            await this.delay(5000);
            
            const datasetResponse = await axios.get(
                `${this.baseUrl}/acts/coderx~instagram-profile-scraper-api/runs/${runId}/dataset/items`,
                { params: { token: this.apiToken } }
            );

            return this.formatProfileData(datasetResponse.data[0], username);
        } catch (error) {
            console.error('Profile fetch error:', error.message);
            return this.getFallbackProfileData(username);
        }
    }

    formatProfileData(data, username) {
        if (!data || Object.keys(data).length === 0) {
            return this.getFallbackProfileData(username);
        }

        const isBanned = this.detectBanStatus(data);
        const isPrivate = data.private || false;
        const isVerified = data.verified || false;

        return {
            username: data.username || username,
            fullName: data.fullName || 'N/A',
            biography: data.biography || 'No bio',
            followersCount: data.followersCount || 0,
            followsCount: data.followsCount || 0,
            postsCount: data.postsCount || 0,
            isPrivate: isPrivate,
            isVerified: isVerified,
            isBanned: isBanned,
            banReason: isBanned ? this.getBanReason(data) : null,
            profilePicUrl: data.profilePicUrl || null,
            hdProfilePicUrl: data.hdProfilePicUrl || null,
            externalUrl: data.external_url || null,
            isBusinessAccount: data.isBusinessAccount || false,
            recentPosts: (data.latestPosts || []).slice(0, 5).map(post => ({
                shortCode: post.shortCode,
                url: `https://instagram.com/p/${post.shortCode}`,
                caption: (post.caption || '').substring(0, 100),
                likesCount: post.likesCount || 0,
                commentsCount: post.commentsCount || 0,
                timestamp: post.timestamp,
                mediaType: post.mediaType,
                isVideo: post.is_video || false
            }))
        };
    }

    detectBanStatus(data) {
        const banIndicators = [
            data.isBanned === true,
            data.accountStatus === 'banned',
            data.accountStatus === 'disabled',
            data.accountStatus === 'suspended',
            data.error?.includes('banned'),
            data.error?.includes('disabled'),
            !data.username && !data.fullName && data.error
        ];
        return banIndicators.some(indicator => indicator === true);
    }

    getBanReason(data) {
        if (data.banReason) return data.banReason;
        if (data.error) return data.error;
        if (data.accountStatus === 'banned') return 'Account banned by Instagram';
        if (data.accountStatus === 'disabled') return 'Account disabled';
        if (data.accountStatus === 'suspended') return 'Account suspended';
        return 'Account may be banned or restricted';
    }

    getFallbackProfileData(username) {
        return {
            username: username,
            fullName: 'Unknown',
            biography: 'Could not fetch profile',
            followersCount: 0,
            followsCount: 0,
            postsCount: 0,
            isPrivate: false,
            isVerified: false,
            isBanned: false,
            banReason: null,
            profilePicUrl: null,
            recentPosts: [],
            error: 'Profile may be private, banned, or does not exist'
        };
    }

    async getStories(username) {
        console.log(`📖 Fetching stories for: ${username}`);
        
        try {
            const response = await axios.post(
                `${this.baseUrl}/acts/igview-owner~instagram-story-viewer/runs`,
                { 
                    usernames: [username], 
                    includeUserInfo: true, 
                    includeStickers: true 
                },
                { 
                    params: { 
                        token: this.apiToken, 
                        waitForFinish: 60 
                    } 
                }
            );

            const runId = response.data.data.id;
            console.log(`⏳ Waiting for story data...`);
            await this.delay(5000);
            
            const datasetResponse = await axios.get(
                `${this.baseUrl}/acts/igview-owner~instagram-story-viewer/runs/${runId}/dataset/items`,
                { params: { token: this.apiToken } }
            );

            return this.formatStoriesData(datasetResponse.data);
        } catch (error) {
            console.error('Story fetch error:', error.message);
            return [];
        }
    }

    formatStoriesData(data) {
        if (!data || !Array.isArray(data) || data.length === 0) return [];

        const stories = [];
        data.forEach(item => {
            if (item.stories && Array.isArray(item.stories)) {
                item.stories.forEach(story => {
                    stories.push({
                        id: story.id,
                        takenAt: story.taken_at,
                        expiresAt: story.expires_at,
                        mediaType: story.media_type,
                        mediaUrl: story.video_url || story.image_url,
                        thumbnailUrl: story.thumbnail_url,
                        dimensions: story.dimensions,
                        mentions: story.mentions || [],
                        hashtags: story.hashtags || [],
                        music: story.music_info || null
                    });
                });
            }
        });
        return stories;
    }

    async getReel(reelUrl) {
        console.log(`🎬 Fetching reel: ${reelUrl}`);
        
        try {
            const response = await axios.post(
                `${this.baseUrl}/acts/codenest~instagram-reels-downloader-scraper/runs`,
                { reel_urls: [{ url: reelUrl }] },
                { 
                    params: { 
                        token: this.apiToken, 
                        waitForFinish: 60 
                    } 
                }
            );

            const runId = response.data.data.id;
            console.log(`⏳ Waiting for reel data...`);
            await this.delay(5000);
            
            const datasetResponse = await axios.get(
                `${this.baseUrl}/acts/codenest~instagram-reels-downloader-scraper/runs/${runId}/dataset/items`,
                { params: { token: this.apiToken } }
            );

            return this.formatReelData(datasetResponse.data);
        } catch (error) {
            console.error('Reel fetch error:', error.message);
            return null;
        }
    }

    formatReelData(data) {
        if (!data || !Array.isArray(data) || data.length === 0) return null;

        const reel = data[0];
        return {
            id: reel.id,
            shortCode: reel.shortcode,
            url: `https://instagram.com/reel/${reel.shortcode}`,
            videoUrl: reel.video_url,
            thumbnailUrl: reel.thumbnail_url,
            caption: reel.caption,
            likesCount: reel.likes_count || 0,
            commentsCount: reel.comments_count || 0,
            playCount: reel.play_count || 0,
            timestamp: reel.timestamp,
            duration: reel.video_duration,
            dimensions: reel.dimensions,
            ownerUsername: reel.owner_username,
            ownerFullName: reel.owner_full_name,
            isVerified: reel.owner_verified || false,
            music: reel.music_info || null
        };
    }

    async getPost(postUrl) {
        console.log(`📸 Fetching post: ${postUrl}`);
        
        try {
            const response = await axios.post(
                `${this.baseUrl}/acts/igview-owner~instagram-video-downloader/runs`,
                { instagram_urls: [postUrl] },
                { 
                    params: { 
                        token: this.apiToken, 
                        waitForFinish: 60 
                    } 
                }
            );

            const runId = response.data.data.id;
            console.log(`⏳ Waiting for post data...`);
            await this.delay(5000);
            
            const datasetResponse = await axios.get(
                `${this.baseUrl}/acts/igview-owner~instagram-video-downloader/runs/${runId}/dataset/items`,
                { params: { token: this.apiToken } }
            );

            return this.formatPostData(datasetResponse.data);
        } catch (error) {
            console.error('Post fetch error:', error.message);
            return null;
        }
    }

    formatPostData(data) {
        if (!data || !Array.isArray(data) || data.length === 0) return null;

        const post = data[0];
        return {
            id: post.id,
            shortCode: post.shortcode,
            url: `https://instagram.com/p/${post.shortcode}`,
            mediaType: post.media_type,
            mediaUrls: post.media_urls || [post.media_url],
            thumbnailUrl: post.thumbnail_url,
            caption: post.caption,
            likesCount: post.likes_count || 0,
            commentsCount: post.comments_count || 0,
            timestamp: post.timestamp,
            ownerUsername: post.owner_username,
            ownerFullName: post.owner_full_name,
            isVerified: post.owner_verified || false,
            location: post.location_name,
            isCarousel: post.media_type === 8,
            carouselItems: post.carousel_media || []
        };
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = ApifyService;
