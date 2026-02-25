// instagramDownloader.js - Uses yt-dlp (no API keys needed)
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');
const execPromise = util.promisify(exec);

class InstagramDownloader {
    constructor() {
        this.tempDir = '/tmp/instagram-downloads';
        // Create temp directory if it doesn't exist
        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir, { recursive: true });
        }
    }

    async extractInstagramUrl(text) {
        // Match Instagram URLs (posts, reels, stories)
        const pattern = /https?:\/\/(www\.)?(instagram\.com|instagr\.am)\/(p|reel|tv|stories)\/[a-zA-Z0-9_-]+/;
        const match = text.match(pattern);
        return match ? match[0] : null;
    }

    async downloadMedia(url) {
        console.log(`📥 Downloading from: ${url}`);
        
        try {
            // Generate unique filename
            const timestamp = Date.now();
            const outputTemplate = path.join(this.tempDir, `%(title)s_${timestamp}.%(ext)s`);
            
            // yt-dlp command to download and extract metadata
            // This works WITHOUT any API keys - yt-dlp handles Instagram's anti-scraping automatically
            const command = `yt-dlp ` +
                `-f "best[ext=mp4]/best" ` +  // Best quality video
                `--write-info-json ` +          // Save metadata as JSON
                `--no-warnings ` +              // Suppress warnings
                `--no-playlist ` +               // Don't download playlists
                `--geo-bypass ` +                 // Bypass geographic restrictions
                `--user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" ` + // Proper user agent
                `--add-header "Accept-Language: en-US,en;q=0.9" ` +
                `-o "${outputTemplate}" ` +
                `"${url}"`;
            
            console.log(`⚙️ Running yt-dlp command...`);
            
            // Execute yt-dlp
            const { stdout, stderr } = await execPromise(command);
            
            if (stderr) {
                console.log('yt-dlp stderr:', stderr);
            }
            
            // Find the downloaded file
            const files = fs.readdirSync(this.tempDir);
            const downloadedFile = files.find(f => f.includes(timestamp.toString()));
            const metadataFile = files.find(f => f.includes('.info.json') && f.includes(timestamp.toString()));
            
            if (!downloadedFile) {
                throw new Error('No file downloaded');
            }
            
            const filePath = path.join(this.tempDir, downloadedFile);
            const stats = fs.statSync(filePath);
            
            // Parse metadata if available
            let metadata = { title: 'Instagram Media' };
            if (metadataFile) {
                try {
                    const metadataPath = path.join(this.tempDir, metadataFile);
                    metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
                } catch (e) {
                    console.log('Could not parse metadata');
                }
            }
            
            return {
                filePath,
                fileName: downloadedFile,
                fileSize: stats.size,
                title: metadata.title || metadata.uploader || 'Instagram Media',
                uploader: metadata.uploader || null,
                description: metadata.description || null,
                timestamp: timestamp
            };
            
        } catch (error) {
            console.error('yt-dlp error:', error.message);
            
            // Fallback: try with different format if first attempt fails
            try {
                console.log('🔄 Retrying with different format...');
                const timestamp = Date.now();
                const fallbackCommand = `yt-dlp ` +
                    `-f "best" ` +  // Simpler format selection
                    `--no-warnings ` +
                    `--no-playlist ` +
                    `--geo-bypass ` +
                    `-o "${path.join(this.tempDir, `video_${timestamp}.%(ext)s`)}" ` +
                    `"${url}"`;
                
                const { stdout, stderr } = await execPromise(fallbackCommand);
                
                const files = fs.readdirSync(this.tempDir);
                const downloadedFile = files.find(f => f.includes(timestamp.toString()));
                
                if (!downloadedFile) {
                    throw new Error('Fallback download failed');
                }
                
                const filePath = path.join(this.tempDir, downloadedFile);
                
                return {
                    filePath,
                    fileName: downloadedFile,
                    fileSize: fs.statSync(filePath).size,
                    title: 'Instagram Media',
                    uploader: null,
                    description: null,
                    timestamp: timestamp
                };
                
            } catch (fallbackError) {
                console.error('Fallback also failed:', fallbackError.message);
                return null;
            }
        }
    }

    async cleanup(filePath) {
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log(`🧹 Cleaned up: ${filePath}`);
            }
            
            // Also clean up associated metadata files
            const baseName = path.basename(filePath, path.extname(filePath));
            const dir = path.dirname(filePath);
            const files = fs.readdirSync(dir);
            files.forEach(file => {
                if (file.includes(baseName) || file.includes(path.basename(filePath).split('.')[0])) {
                    const fullPath = path.join(dir, file);
                    if (fs.existsSync(fullPath)) {
                        fs.unlinkSync(fullPath);
                        console.log(`🧹 Cleaned up: ${fullPath}`);
                    }
                }
            });
            
        } catch (error) {
            console.error('Cleanup error:', error.message);
        }
    }

    async cleanupAll() {
        try {
            const files = fs.readdirSync(this.tempDir);
            files.forEach(file => {
                const filePath = path.join(this.tempDir, file);
                fs.unlinkSync(filePath);
            });
            console.log(`🧹 Cleaned up all ${files.length} temp files`);
        } catch (error) {
            console.error('Cleanup all error:', error.message);
        }
    }
}

module.exports = InstagramDownloader;
