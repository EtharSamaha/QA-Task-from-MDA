import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { PdfPermissionValidator } from '../helper/pdfValidator';
import { DriveHelper } from '../helper/driveHelper';

const downloadDir = path.resolve(__dirname, 'downloads');
const credentialsPath = path.resolve(__dirname, '../credentials.json');
const tokenPath = path.resolve(__dirname, '../token.json');

if (!fs.existsSync(downloadDir)) fs.mkdirSync(downloadDir);

const validator = new PdfPermissionValidator();
const driveHelper = new DriveHelper(credentialsPath, tokenPath);
const password = 'Owner123';

let authClient: any;

test.beforeAll(async () => {
  authClient = await driveHelper.authenticate();
});

async function uploadAndCheck(browser, localPdfPath: string, fileName:string): Promise<boolean> {
  const publicUrl = await driveHelper.uploadPdf(authClient, localPdfPath);
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();

  const downloadedPdfPath = await validator.downloadPdf(fileName,context, page, publicUrl, downloadDir, password);
  const permissions = await validator.getPdfPermissions(downloadedPdfPath, password);
  const pdfjsLib = await validator.loadPdfJs();
  const flags = pdfjsLib.PermissionFlag;
  
  console.log('🔒 PDF Permissions (Raw):', permissions);
  
  const allAllowed = !permissions || permissions.length === 0;
  
  console.log('🔑 PDF Permission Flags Breakdown:');
  Object.entries(flags).forEach(([key, value]) => {
    const isEnabled = allAllowed || permissions.includes(value);
    const status = isEnabled ? '✅' : '❌';
    console.log(`  ${status} ${key} (${value})`);
  });
  

  await context.close();
  console.log('🧹 Context closed. Returning result...');

  const canPrint = !permissions || permissions.length === 0 || 
                 permissions.includes(flags.PRINT) || 
                 permissions.includes(flags.PRINT_HIGH_QUALITY);
return canPrint;

}

test.setTimeout(120_000); // 120 seconds (2 minutes)


test('disallow print — password-protected, no permission', async ({ browser }) => {
  const localPdf = path.resolve(__dirname, '../pdfs/no_print_permission.pdf');
  const isPrintable = await uploadAndCheck(browser, localPdf, 'no_print_permission.pdf');
  expect(isPrintable).toBe(false);
  console.log('✅ Test disallow print — password-protected, no permission completed'); 
});

test('allow print — no password', async ({ browser }) => {
  const localPdf = path.resolve(__dirname, '../pdfs/printable.pdf');
  const isPrintable = await uploadAndCheck(browser, localPdf, 'printable.pdf');
  expect(isPrintable).toBe(true);
  console.log('✅ Test allow print — no password completed'); 
});

test('allow print — password-protected', async ({ browser }) => {
    const localPdf = path.resolve(__dirname, '../pdfs/printable_with_password.pdf');
    const isPrintable = await uploadAndCheck(browser, localPdf, 'printable_with_password.pdf');
    expect(isPrintable).toBe(true);
    console.log('✅ Test allow print — password-protected completed'); 
});


test.afterAll(async () => {
  console.log('🧹 Cleaning up Google Drive folder after all tests...');
  const folderId = '11DQ3aYC90myC2AKXbPwzjPRn6_4tATmZ'; 
  await driveHelper.cleanupFolder(authClient, folderId);
});
  