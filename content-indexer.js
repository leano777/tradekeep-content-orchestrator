const fs = require('fs');
const path = require('path');

// TradeKeep Content Indexer
// Scans all directories and builds a comprehensive content database

const contentIndex = {
    totalFiles: 0,
    totalSize: 0,
    directories: {
        dataReserve: 'C:\\Users\\Marco - ESDC\\OneDrive - Elite SD Construction\\Documents\\TK\\Tradekeep Data Reserve',
        systems: 'C:\\Users\\Marco - ESDC\\OneDrive - Elite SD Construction\\Documents\\TK\\Tradekeep Systems',
        branding: 'C:\\Users\\Marco - ESDC\\OneDrive - Elite SD Construction\\Documents\\TK\\Branding'
    },
    content: {
        marketing: [],
        technical: [],
        visual: [],
        automation: [],
        documentation: [],
        email: [],
        social: [],
        branding: []
    },
    statistics: {
        byType: {},
        byCategory: {},
        byDirectory: {},
        recentlyModified: [],
        largestFiles: []
    }
};

// File type mappings
const fileTypeMappings = {
    '.html': { type: 'Web', category: 'technical' },
    '.md': { type: 'Documentation', category: 'documentation' },
    '.json': { type: 'Configuration', category: 'technical' },
    '.js': { type: 'Script', category: 'automation' },
    '.png': { type: 'Image', category: 'visual' },
    '.jpg': { type: 'Image', category: 'visual' },
    '.jpeg': { type: 'Image', category: 'visual' },
    '.webp': { type: 'Image', category: 'visual' },
    '.svg': { type: 'Vector', category: 'visual' },
    '.pdf': { type: 'Document', category: 'documentation' },
    '.txt': { type: 'Text', category: 'documentation' },
    '.csv': { type: 'Data', category: 'technical' },
    '.bat': { type: 'Batch', category: 'automation' },
    '.ps1': { type: 'PowerShell', category: 'automation' }
};

// Category detection based on path
function detectCategory(filePath, fileName) {
    const pathLower = filePath.toLowerCase();
    const nameLower = fileName.toLowerCase();
    
    if (pathLower.includes('marketing') || pathLower.includes('campaign')) return 'marketing';
    if (pathLower.includes('email')) return 'email';
    if (pathLower.includes('instagram') || pathLower.includes('twitter') || pathLower.includes('social')) return 'social';
    if (pathLower.includes('visual') || pathLower.includes('assets')) return 'visual';
    if (pathLower.includes('brand')) return 'branding';
    if (pathLower.includes('script') || pathLower.includes('automation')) return 'automation';
    if (pathLower.includes('technical') || pathLower.includes('implementation')) return 'technical';
    if (pathLower.includes('documentation') || pathLower.includes('docs')) return 'documentation';
    
    // Check file name patterns
    if (nameLower.includes('email')) return 'email';
    if (nameLower.includes('instagram') || nameLower.includes('twitter') || nameLower.includes('x-')) return 'social';
    if (nameLower.includes('logo')) return 'branding';
    if (nameLower.includes('landing') || nameLower.includes('page')) return 'marketing';
    
    // Default based on extension
    const ext = path.extname(fileName);
    const mapping = fileTypeMappings[ext];
    return mapping ? mapping.category : 'documentation';
}

// Get file metadata
function getFileMetadata(filePath) {
    try {
        const stats = fs.statSync(filePath);
        const ext = path.extname(filePath);
        const fileName = path.basename(filePath);
        const mapping = fileTypeMappings[ext] || { type: 'File', category: 'other' };
        
        return {
            name: fileName,
            path: filePath,
            size: stats.size,
            sizeFormatted: formatFileSize(stats.size),
            modified: stats.mtime,
            created: stats.birthtime,
            extension: ext,
            type: mapping.type,
            category: detectCategory(filePath, fileName),
            isDirectory: stats.isDirectory()
        };
    } catch (error) {
        console.error(`Error reading file: ${filePath}`, error.message);
        return null;
    }
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Scan directory recursively
function scanDirectory(dirPath, depth = 0, maxDepth = 5) {
    if (depth > maxDepth) return;
    
    try {
        const items = fs.readdirSync(dirPath);
        
        items.forEach(item => {
            // Skip node_modules and hidden directories
            if (item.startsWith('.') || item === 'node_modules') return;
            
            const fullPath = path.join(dirPath, item);
            const metadata = getFileMetadata(fullPath);
            
            if (!metadata) return;
            
            if (metadata.isDirectory) {
                // Recursively scan subdirectories
                scanDirectory(fullPath, depth + 1, maxDepth);
            } else {
                // Add file to index
                contentIndex.totalFiles++;
                contentIndex.totalSize += metadata.size;
                
                // Add to appropriate category
                const category = metadata.category;
                if (contentIndex.content[category]) {
                    contentIndex.content[category].push({
                        id: contentIndex.totalFiles,
                        title: metadata.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
                        fileName: metadata.name,
                        type: metadata.type,
                        category: category,
                        path: metadata.path,
                        relativePath: path.relative(process.cwd(), metadata.path),
                        size: metadata.sizeFormatted,
                        sizeBytes: metadata.size,
                        modified: metadata.modified.toISOString().split('T')[0],
                        modifiedFull: metadata.modified,
                        extension: metadata.extension
                    });
                }
                
                // Update statistics
                contentIndex.statistics.byType[metadata.type] = 
                    (contentIndex.statistics.byType[metadata.type] || 0) + 1;
                contentIndex.statistics.byCategory[category] = 
                    (contentIndex.statistics.byCategory[category] || 0) + 1;
                
                // Track recently modified files
                contentIndex.statistics.recentlyModified.push({
                    name: metadata.name,
                    path: metadata.path,
                    modified: metadata.modified,
                    category: category
                });
                
                // Track largest files
                contentIndex.statistics.largestFiles.push({
                    name: metadata.name,
                    path: metadata.path,
                    size: metadata.size,
                    sizeFormatted: metadata.sizeFormatted,
                    category: category
                });
            }
        });
    } catch (error) {
        console.error(`Error scanning directory: ${dirPath}`, error.message);
    }
}

// Generate content report
function generateReport() {
    // Sort recently modified files
    contentIndex.statistics.recentlyModified.sort((a, b) => b.modified - a.modified);
    contentIndex.statistics.recentlyModified = contentIndex.statistics.recentlyModified.slice(0, 20);
    
    // Sort largest files
    contentIndex.statistics.largestFiles.sort((a, b) => b.size - a.size);
    contentIndex.statistics.largestFiles = contentIndex.statistics.largestFiles.slice(0, 20);
    
    // Create summary
    const summary = {
        totalFiles: contentIndex.totalFiles,
        totalSize: formatFileSize(contentIndex.totalSize),
        categories: Object.keys(contentIndex.content).map(cat => ({
            name: cat,
            count: contentIndex.content[cat].length,
            percentage: ((contentIndex.content[cat].length / contentIndex.totalFiles) * 100).toFixed(1) + '%'
        })),
        fileTypes: Object.entries(contentIndex.statistics.byType)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([type, count]) => ({ type, count })),
        recentActivity: contentIndex.statistics.recentlyModified.slice(0, 10).map(file => ({
            name: file.name,
            category: file.category,
            modified: file.modified.toISOString().split('T')[0]
        })),
        largestAssets: contentIndex.statistics.largestFiles.slice(0, 10).map(file => ({
            name: file.name,
            size: file.sizeFormatted,
            category: file.category
        }))
    };
    
    return summary;
}

// Main execution
function indexContent() {
    console.log('🚀 Starting TradeKeep Content Indexing...\n');
    
    // Scan each directory
    Object.entries(contentIndex.directories).forEach(([key, dirPath]) => {
        if (fs.existsSync(dirPath)) {
            console.log(`📁 Scanning ${key}: ${dirPath}`);
            scanDirectory(dirPath);
            contentIndex.statistics.byDirectory[key] = contentIndex.totalFiles;
        } else {
            console.log(`⚠️  Directory not found: ${dirPath}`);
        }
    });
    
    // Generate and display report
    const report = generateReport();
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 TRADEKEEP CONTENT INDEX REPORT');
    console.log('='.repeat(60));
    
    console.log(`\n📈 Overall Statistics:`);
    console.log(`   Total Files: ${report.totalFiles}`);
    console.log(`   Total Size: ${report.totalSize}`);
    
    console.log(`\n📂 Content by Category:`);
    report.categories.forEach(cat => {
        if (cat.count > 0) {
            console.log(`   ${cat.name}: ${cat.count} files (${cat.percentage})`);
        }
    });
    
    console.log(`\n🏷️  Top File Types:`);
    report.fileTypes.forEach(type => {
        console.log(`   ${type.type}: ${type.count} files`);
    });
    
    console.log(`\n🕐 Recently Modified:`);
    report.recentActivity.forEach(file => {
        console.log(`   ${file.modified} - ${file.name} [${file.category}]`);
    });
    
    console.log(`\n💾 Largest Assets:`);
    report.largestAssets.forEach(file => {
        console.log(`   ${file.size} - ${file.name} [${file.category}]`);
    });
    
    // Save index to file
    const outputPath = path.join(__dirname, 'content-index.json');
    fs.writeFileSync(outputPath, JSON.stringify(contentIndex, null, 2));
    console.log(`\n✅ Content index saved to: ${outputPath}`);
    
    // Save summary report
    const reportPath = path.join(__dirname, 'content-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`✅ Summary report saved to: ${reportPath}`);
    
    return contentIndex;
}

// Export for use in other modules
module.exports = {
    indexContent,
    getContentIndex: () => contentIndex,
    searchContent: (query) => {
        const results = [];
        Object.values(contentIndex.content).forEach(category => {
            category.forEach(item => {
                if (item.title.toLowerCase().includes(query.toLowerCase()) ||
                    item.fileName.toLowerCase().includes(query.toLowerCase()) ||
                    item.type.toLowerCase().includes(query.toLowerCase())) {
                    results.push(item);
                }
            });
        });
        return results;
    },
    getContentByCategory: (category) => contentIndex.content[category] || [],
    getContentByType: (type) => {
        const results = [];
        Object.values(contentIndex.content).forEach(category => {
            category.forEach(item => {
                if (item.type === type) {
                    results.push(item);
                }
            });
        });
        return results;
    }
};

// Run if executed directly
if (require.main === module) {
    indexContent();
}