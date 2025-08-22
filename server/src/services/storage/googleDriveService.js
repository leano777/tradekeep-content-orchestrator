const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const googleAuthService = require('../auth/googleAuthService');
const prisma = require('../../db');

class GoogleDriveService {
  async getDriveService(userId) {
    const auth = await googleAuthService.getAuthenticatedClient(userId);
    return google.drive({ version: 'v3', auth });
  }

  // List files from Google Drive
  async listFiles(userId, options = {}) {
    try {
      const drive = await this.getDriveService(userId);
      
      const params = {
        pageSize: options.limit || 20,
        fields: 'nextPageToken, files(id, name, mimeType, size, modifiedTime, parents, thumbnailLink, webViewLink, iconLink)',
        q: options.folderId ? `'${options.folderId}' in parents` : null,
        orderBy: options.orderBy || 'modifiedTime desc',
        pageToken: options.pageToken
      };
      
      // Add search query if provided
      if (options.search) {
        params.q = params.q ? 
          `${params.q} and name contains '${options.search}'` : 
          `name contains '${options.search}'`;
      }
      
      // Add mime type filter if provided
      if (options.mimeType) {
        const mimeFilter = `mimeType contains '${options.mimeType}'`;
        params.q = params.q ? `${params.q} and ${mimeFilter}` : mimeFilter;
      }
      
      const response = await drive.files.list(params);
      
      return {
        files: response.data.files.map(file => ({
          id: file.id,
          name: file.name,
          mimeType: file.mimeType,
          size: parseInt(file.size || 0),
          modifiedAt: file.modifiedTime,
          parents: file.parents,
          thumbnailUrl: file.thumbnailLink,
          webViewUrl: file.webViewLink,
          iconUrl: file.iconLink,
          provider: 'GOOGLE_DRIVE'
        })),
        nextPageToken: response.data.nextPageToken
      };
    } catch (error) {
      console.error('Error listing Google Drive files:', error);
      throw new Error('Failed to list files from Google Drive');
    }
  }

  // Upload file to Google Drive
  async uploadFile(userId, filePath, metadata = {}) {
    try {
      const drive = await this.getDriveService(userId);
      
      const fileMetadata = {
        name: metadata.name || path.basename(filePath),
        parents: metadata.folderId ? [metadata.folderId] : undefined
      };
      
      const media = {
        mimeType: metadata.mimeType || 'application/octet-stream',
        body: fs.createReadStream(filePath)
      };
      
      const response = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, name, mimeType, size, modifiedTime, parents, webViewLink'
      });
      
      // Create sync log
      await prisma.syncLog.create({
        data: {
          assetId: metadata.assetId,
          operation: 'UPLOAD',
          provider: 'GOOGLE_DRIVE',
          status: 'SUCCESS',
          metadata: JSON.stringify({
            cloudFileId: response.data.id,
            fileName: response.data.name
          })
        }
      });
      
      return {
        id: response.data.id,
        name: response.data.name,
        mimeType: response.data.mimeType,
        size: parseInt(response.data.size || 0),
        modifiedAt: response.data.modifiedTime,
        parents: response.data.parents,
        webViewUrl: response.data.webViewLink,
        provider: 'GOOGLE_DRIVE'
      };
    } catch (error) {
      console.error('Error uploading to Google Drive:', error);
      
      // Log failed upload
      if (metadata.assetId) {
        await prisma.syncLog.create({
          data: {
            assetId: metadata.assetId,
            operation: 'UPLOAD',
            provider: 'GOOGLE_DRIVE',
            status: 'FAILED',
            errorMessage: error.message
          }
        });
      }
      
      throw new Error('Failed to upload file to Google Drive');
    }
  }

  // Download file from Google Drive
  async downloadFile(userId, fileId, destPath) {
    try {
      const drive = await this.getDriveService(userId);
      
      const dest = fs.createWriteStream(destPath);
      
      const response = await drive.files.get(
        { fileId, alt: 'media' },
        { responseType: 'stream' }
      );
      
      return new Promise((resolve, reject) => {
        response.data
          .on('end', () => {
            resolve({ success: true, path: destPath });
          })
          .on('error', err => {
            console.error('Error downloading file:', err);
            reject(new Error('Failed to download file from Google Drive'));
          })
          .pipe(dest);
      });
    } catch (error) {
      console.error('Error downloading from Google Drive:', error);
      throw new Error('Failed to download file from Google Drive');
    }
  }

  // Delete file from Google Drive
  async deleteFile(userId, fileId) {
    try {
      const drive = await this.getDriveService(userId);
      await drive.files.delete({ fileId });
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting from Google Drive:', error);
      throw new Error('Failed to delete file from Google Drive');
    }
  }

  // Get file metadata
  async getFileMetadata(userId, fileId) {
    try {
      const drive = await this.getDriveService(userId);
      
      const response = await drive.files.get({
        fileId,
        fields: 'id, name, mimeType, size, modifiedTime, parents, thumbnailLink, webViewLink, iconLink, description, properties'
      });
      
      return {
        id: response.data.id,
        name: response.data.name,
        mimeType: response.data.mimeType,
        size: parseInt(response.data.size || 0),
        modifiedAt: response.data.modifiedTime,
        parents: response.data.parents,
        thumbnailUrl: response.data.thumbnailLink,
        webViewUrl: response.data.webViewLink,
        iconUrl: response.data.iconLink,
        description: response.data.description,
        properties: response.data.properties,
        provider: 'GOOGLE_DRIVE'
      };
    } catch (error) {
      console.error('Error getting file metadata from Google Drive:', error);
      throw new Error('Failed to get file metadata from Google Drive');
    }
  }

  // Create folder in Google Drive
  async createFolder(userId, folderName, parentId = null) {
    try {
      const drive = await this.getDriveService(userId);
      
      const fileMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: parentId ? [parentId] : undefined
      };
      
      const response = await drive.files.create({
        requestBody: fileMetadata,
        fields: 'id, name, mimeType'
      });
      
      return {
        id: response.data.id,
        name: response.data.name,
        mimeType: response.data.mimeType,
        provider: 'GOOGLE_DRIVE'
      };
    } catch (error) {
      console.error('Error creating folder in Google Drive:', error);
      throw new Error('Failed to create folder in Google Drive');
    }
  }

  // Move file to different folder
  async moveFile(userId, fileId, newParentId) {
    try {
      const drive = await this.getDriveService(userId);
      
      // Get current parents
      const file = await drive.files.get({
        fileId,
        fields: 'parents'
      });
      
      const previousParents = file.data.parents ? file.data.parents.join(',') : '';
      
      // Move file to new parent
      const response = await drive.files.update({
        fileId,
        addParents: newParentId,
        removeParents: previousParents,
        fields: 'id, parents'
      });
      
      return {
        id: response.data.id,
        parents: response.data.parents
      };
    } catch (error) {
      console.error('Error moving file in Google Drive:', error);
      throw new Error('Failed to move file in Google Drive');
    }
  }

  // Get storage quota
  async getStorageQuota(userId) {
    try {
      const drive = await this.getDriveService(userId);
      
      const response = await drive.about.get({
        fields: 'storageQuota'
      });
      
      return {
        limit: parseInt(response.data.storageQuota.limit || 0),
        usage: parseInt(response.data.storageQuota.usage || 0),
        usageInDrive: parseInt(response.data.storageQuota.usageInDrive || 0),
        usageInTrash: parseInt(response.data.storageQuota.usageInTrash || 0)
      };
    } catch (error) {
      console.error('Error getting storage quota from Google Drive:', error);
      throw new Error('Failed to get storage quota from Google Drive');
    }
  }
}

module.exports = new GoogleDriveService();