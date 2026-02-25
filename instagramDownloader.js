// instagramDownloader.js - Add custom path support
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');
const execPromise = util.promisify(exec);

class InstagramDownloader {
    constructor() {
        this.tempDir = '/tmp/instagram-downloads';
        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir, { recursive: true });
        }
    }

    async extractInstagramUrl(text) {
        const pattern = /https?:\/\/(www\.)?(instagram\.com|instagr\.am)\/(p|reel|tv|stories)\/[a-zA-Z0-9_-]+/;
        const match = text.match(pattern);
        return match ? match[0] : null;
    }

    async downloadMedia(url, ytDlpPath = 'yt-dlp') {
        console.log(`📥 Downloading from: ${url} using ${ytDlpPath}`);
        
        try {
            const timestamp = Date.now();
            const outputTemplate = path.join(this.tempDir, `%(title)s_${timestamp}.%(ext)s`);
            
            const command = `"${ytDlpPath}" ` +
                `-f "best[ext=mp4]/best" ` +
                `--write-info-json ` +
                `--no-warnings ` +
                `--no-playlist ` +
                `--geo-bypass ` +
                `--user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" ` +
                `--add-header "Accept-Language: en-US,en;q=0.9" ` +
                `-o "${outputTemplate}" ` +
                `"${url}"`;
            
            console.log(`⚙️ Running command...`);
            
            const { stdout, stderr } = await execPromise(command);
            
            if (stderr && !stderr.includes('Writing video')) {
                console.log('yt-dlp stderr:', stderr);
            }
            
            const files = fs.readdirSync(this.tempDir);
            const downloadedFile = files.find(f => f.includes(timestamp.toString()) && !f.includes('.json'));
            const metadataFile = files.find(f => f.includes('.info.json') && f.includes(timestamp.toString()));
            
            if (!downloadedFile) {
                throw new Error('No file downloaded');
            }
            
            const filePath = path.join(this.tempDir, downloadedFile);
            const stats = fs.statSync(filePath);
            
            let metadata = { title: 'Instagram Media' };
            if (metadataFile) {
                try {
                    const metadataPath = path.join(this.tempDir, metadataFile);
                    metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
                } catch (e) {}
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
            return null;
        }
    }

    async cleanup(filePath) {
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log(`🧹 Cleaned up: ${filePath}`);
            }
            
            const baseName = path.basename(filePath, path.extname(filePath));
            const dir = path.dirname(filePath);
            const files = fs.readdirSync(dir);
            files.forEach(file => {
                if (file.includes(baseName) && file.endsWith('.json')) {
                    const fullPath = path.join(dir, file);
                    fs.unlinkSync(fullPath);
                }
            });
        } catch (error) {
            console.error('Cleanup error:', error.message);
        }
    }
}

module.exports = InstagramDownloader;
