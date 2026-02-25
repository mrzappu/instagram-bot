// instagramAPI.js - RapidAPI Instagram Downloader
const axios = require('axios');

class InstagramAPI {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = 'https://instagram-downloader-download-instagram-videos-stories.p.rapidapi.com';
    }

    async extractInstagramUrl(text) {
        // Match Instagram URLs
        const patterns = [
            /https?:\/\/(www\.)?instagram\.com\/(p|reel|tv|stories)\/[a-zA-Z0-9_-]+/g,
            /https?:\/\/(www\.)?instagram\.com\/[a-zA-Z0-9_.]+\/reel\/[a-zA-Z0-9_-]+/g,
            /https?:\/\/(www\.)?instagram\.com\/[a-zA-Z0-9_.]+\/p\/[a-zA-Z0-9_-]+/g,
            /https?:\/\/(www\.)?instagr\.am\/(p|reel|tv)\/[a-zA-Z0-9_-]+/g
        ];

        for (const pattern of patterns) {
            const matches = text.match(pattern);
            if (matches && matches.length > 0) {
                return matches[0];
            }
        }
        return null;
    }

    async downloadInstagramMedia(url) {
        console.log(`📥 Downloading from: ${url}`);

        try {
            const options = {
                method: 'GET',
                url: this.baseUrl + '/index',
                params: {
                    url: url
                },
                headers: {
                    'X-RapidAPI-Key': this.apiKey,
                    'X-RapidAPI-Host': 'instagram-downloader-download-instagram-videos-stories.p.rapidapi.com'
                }
            };

            const response = await axios.request(options);
            
            if (response.data && response.data) {
                return this.formatMediaData(response.data);
            }
            
            return null;
        } catch (error) {
            console.error('Instagram API error:', error.message);
            return null;
        }
    }

    formatMediaData(data) {
        // Handle different response formats
        const media = {
            type: 'unknown',
            mediaUrls: [],
            thumbnail: null,
            caption: null,
            username: null
        };

        if (data.video) {
            media.type = 'video';
            media.mediaUrls.push(data.video);
            media.thumbnail = data.thumbnail || data.video_thumb;
            media.caption = data.caption || data.title;
            media.username = data.username || data.owner_username;
        } else if (data.images && data.images.length > 0) {
            media.type = 'image';
            media.mediaUrls = data.images;
            media.caption = data.caption || data.title;
            media.username = data.username || data.owner_username;
        } else if (data.video_versions) {
            media.type = 'video';
            media.mediaUrls = data.video_versions.map(v => v.url);
            media.thumbnail = data.image_versions_url;
            media.caption = data.caption;
            media.username = data.user?.username;
        } else if (data.image_versions_url) {
            media.type = 'image';
            media.mediaUrls = [data.image_versions_url];
            media.caption = data.caption;
            media.username = data.user?.username;
        } else if (data.carousel_media) {
            media.type = 'carousel';
            data.carousel_media.forEach(item => {
                if (item.video_versions) {
                    media.mediaUrls.push(item.video_versions[0].url);
                } else if (item.image_versions_url) {
                    media.mediaUrls.push(item.image_versions_url);
                }
            });
            media.caption = data.caption;
            media.username = data.user?.username;
        }

        return media;
    }
}

module.exports = InstagramAPI;
