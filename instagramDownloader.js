// instagramDownloader.js - Uses yt-dlp binary
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');
const execPromise = util.promisify(exec);

class InstagramDownloader {
    constructor() {
        this.tempDir = '/tmp/instagram-downloads';
        this.ytDlpPath = '/usr/local/bin/yt-dlp'; // Fixed path from Render build
        
        // Create temp directory
        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir, { recursive: true });
        }
    }

    async extractInstagramUrl(text) {
        // Match Instagram URLs (posts, reels, stories)
        const patterns = [
            /https?:\/\/(www\.)?instagram\.com\/(p|reel|tv)\/[a-zA-Z0-9_-]+/g,
            /https?:\/\/(www\.)?instagram\.com\/stories\/[a-zA-Z0-9_.]+\/\d+/g,
            /https?:\/\/(www\.)?instagr\.am\/(p|reel|tv)\/[a-zA-Z0-9_-]+/g
        ];

        for (const pattern of patterns) {
            const matches = text.match(pattern);
            if (matches && matches.length > 0) {
                // Return clean URL without query parameters
                return matches[0].split('?')[0];
            }
        }
        return null;
    }

    async checkYtDlp() {
        try {
            const { stdout } = await execPromise(`${this.ytDlpPath} --version`);
            console.log(`✅ yt-dlp version ${stdout.trim()} found at ${this.ytDlpPath}`);
            return true;
        } catch (error) {
            console.error('❌ yt-dlp not found at:', this.ytDlpPath);
            
            // Try to find it in PATH as fallback
            try {
                const { stdout } = await execPromise('yt-dlp --version');
                console.log(`✅ yt-dlp version ${stdout.trim()} found in PATH`);
                this.ytDlpPath = 'yt-dlp';
                return true;
            } catch (e) {
                console.error('❌ yt-dlp not found anywhere');
                return false;
            }
        }
    }

    async downloadMedia(url) {
        console.log(`📥 Downloading from: ${url}`);
        
        try {
            const timestamp = Date.now();
            const randomId = Math.random().toString(36).substring(7);
            const outputFile = path.join(this.tempDir, `instagram_${timestamp}_${randomId}.%(ext)s`);
            
            // yt-dlp command optimized for Instagram
            const command = `"${this.ytDlpPath}" ` +
                `"${url}" ` +
                `-f "best[ext=mp4]/best" ` +
                `--no-warnings ` +
                `--no-playlist ` +
                `--geo-bypass ` +
                `--user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" ` +
                `--add-header "Accept-Language: en-US,en;q=0.9" ` +
                `--output "${outputFile}"`;
            
            console.log(`⚙️ Executing: ${command.substring(0, 100)}...`);
            
            const { stdout, stderr } = await execPromise(command);
            
            if (stderr && !stderr.includes('Writing')) {
                console.log('yt-dlp stderr:', stderr);
            }
            
            // Find the downloaded file
            const files = fs.readdirSync(this.tempDir);
            const downloadedFile = files.find(f => f.includes(timestamp.toString()) && f.includes(randomId));
            
            if (!downloadedFile) {
                console.error('No file found after download');
                return null;
            }
            
            const filePath = path.join(this.tempDir, downloadedFile);
            const stats = fs.statSync(filePath);
            
            console.log(`✅ Download complete: ${downloadedFile} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
            
            return {
                filePath,
                fileName: downloadedFile,
                fileSize: stats.size,
                url: url,
                timestamp: timestamp
            };
            
        } catch (error) {
            console.error('Download error:', error.message);
            return null;
        }
    }

    async cleanup(filePath) {
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log(`🧹 Cleaned up: ${path.basename(filePath)}`);
            }
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
            console.log(`🧹 Cleaned up ${files.length} temp files`);
        } catch (error) {
            console.error('Cleanup all error:', error.message);
        }
    }
}

module.exports = InstagramDownloader;
