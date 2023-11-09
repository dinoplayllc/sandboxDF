/* eslint-disable no-useless-catch */
import { Dropbox } from 'dropbox';

// Initialize the Dropbox client with your app key and secret.
const config = new Dropbox({
  fetch,
  clientId: 'gy7zj8e87xcu5lv',
});


export const dbx = new Dropbox(config);

export const redirectUr = "http://localhost:8080/auth/dropbox/callback"

export async function uploadFile(filePath, destPath) {
  try {
    const response = await dbx.filesUpload({
      path: destPath,
      contents: filePath,
    });
    return response.result;
  } catch (error) { 
    throw error;
  } 
}

export async function downloadFile(filePath) {
  try {
    const response = await dbx.filesDownload({ path: filePath });
    return response.result;
  } catch (error) {
    throw error;
  }
}

export async function listFiles(folderPath) {
    try {
      const response = await dbx.filesListFolder({ path: folderPath });
      return response.result.entries;
    } catch (error) {
      throw error;
    }
  }

  export async function listSpecificFiles(folderPath, fileUser) {
    try {
      const files = await listFiles(folderPath); // Use the listFiles function from your previous example
      return files.filter((file) => file.name.startsWith(fileUser));
    } catch (error) {
      throw error;
    }
  }

export async function createSharedLink(filePath) {
    try { 
      const response = await dbx.sharingCreateSharedLinkWithSettings({
        path: filePath,
      });
  
      // Extract the shared link URL from the response
      const sharedLinkUrl = response.result.url;
  
      return sharedLinkUrl;
    } catch (error) {
      if (error.status === 409 && error.error.error_summary === 'shared_link_already_exists/metadata/.') {
        // A 409 error indicates that a shared link already exists, so retrieve the existing link
        const existingLinkResponse = await dbx.sharingListSharedLinks({
          path: filePath,
        });
  
        if (existingLinkResponse.result.links.length > 0) {
          // Use the URL of the first shared link (you can modify this logic if needed)
          const sharedLinkUrl = existingLinkResponse.result.links[0].url;
          return sharedLinkUrl;
        }
      } else {
        // Handle other errors here or rethrow the exception
        console.error('Error creating or retrieving shared link:', error);
        throw error;
      }
    }
  }

  export async function getSharedLink(filePath) {
    try {
        const response = await dbx.filesGetTemporaryLink({
            path: filePath, // Replace with the path to your file
        });
        return response.result.link;
    } catch (error) {
        console.error('Error retrieving shared link:', error);
        throw error;
    }
} 