import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { google } from 'googleapis';

export class DriveHelper {
  private credentialsPath: string;
  private tokenPath: string;

  constructor(credentialsPath: string, tokenPath: string) {
    this.credentialsPath = credentialsPath;
    this.tokenPath = tokenPath;
  }

  async authenticate() {
    try {
        const content = fs.readFileSync(this.credentialsPath, 'utf-8');
        const credentials = JSON.parse(content);
        const { client_secret, client_id } = credentials.installed;
        const redirect_uri = 'urn:ietf:wg:oauth:2.0:oob';

        const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uri);

        if (fs.existsSync(this.tokenPath)) {
            try {
              const tokenData = fs.readFileSync(this.tokenPath, 'utf-8');
              oAuth2Client.setCredentials(JSON.parse(tokenData));
              return oAuth2Client;
            } catch (e) {
              console.warn('⚠️ Failed to load token, falling back to manual auth:', e.message);
            }
          }

        const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/drive.file'],
        });

        console.log('Authorize this app by visiting this URL:', authUrl);

        const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        });

        const code: string = await new Promise(resolve => {
        rl.question('Enter the code from that page here: ', answer => {
            rl.close();
            resolve(answer);
        });
        });

        const { tokens } = await oAuth2Client.getToken(code);
        oAuth2Client.setCredentials(tokens);
        fs.writeFileSync(this.tokenPath, JSON.stringify(tokens));
        return oAuth2Client;
    } catch (err) {
        throw new Error(`Failed to load credentials: ${err.message}`);
      }    
  }

  async uploadPdf(auth: any, localFilePath: string): Promise<string> {
    try {
        const drive = google.drive({ version: 'v3', auth });

        const fileMetadata = { name: path.basename(localFilePath),  parents: ['11DQ3aYC90myC2AKXbPwzjPRn6_4tATmZ'] };
       

        if (!fs.existsSync(localFilePath)) {
            throw new Error(`File not found: ${localFilePath}`);
        }

        const media = {
        mimeType: 'application/pdf',
        body: fs.createReadStream(localFilePath),
        };

        
        const res = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id',
        });

        if (!res.data.id) {
            throw new Error('File uploaded but no ID returned by Drive API');
        }

        await drive.permissions.create({
        fileId: res.data.id!,
        requestBody: { role: 'reader', type: 'anyone' },
        });

       return 'https://drive.google.com/drive/folders/11DQ3aYC90myC2AKXbPwzjPRn6_4tATmZ';
       
    }
    catch (err) {
        throw new Error(`Upload failed for file "${localFilePath}": ${err.message}`);
    }    
  }

  async cleanupFolder(auth: any, folderId: string): Promise<void> {
  const drive = google.drive({ version: 'v3', auth });

  try {
    let pageToken: string | undefined = undefined;

    do {
      const listRes = await drive.files.list({
        q: `'${folderId}' in parents and trashed = false`,
        fields: 'nextPageToken, files(id, name)',
        spaces: 'drive',
        pageToken: pageToken,
      });

      const files = listRes.data.files || [];

      for (const file of files) {
        console.log(`🗑️ Deleting file: ${file.name} (${file.id})`);
        await drive.files.delete({ fileId: file.id! });
      }

      pageToken = listRes.data.nextPageToken || undefined;

    } while (pageToken);

    console.log(`✅ Cleanup completed for folder: ${folderId}`);
  } catch (err: any) {
    throw new Error(`Failed to cleanup folder ${folderId}: ${err.message}`);
  }
}

}
