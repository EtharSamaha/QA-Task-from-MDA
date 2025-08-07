import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { expect } from '@playwright/test';

export class PdfPermissionValidator {
    async loadPdfJs() {
        const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
        const workerPath = path.join(
            path.dirname(require.resolve('pdfjs-dist/package.json')),
            'legacy/build/pdf.worker.mjs'
        );
        pdfjsLib.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href;
        return pdfjsLib;
    }

    async checkPdfLoadedSuccessfully(page) {
        await page.waitForTimeout(5000);
        const pdfContentDiv = page.locator('div.ndfHFb-c4YZDc-cYSp0e-DARUcf-PLDbbf');
        try {
          await pdfContentDiv.waitFor({ timeout: 15000 });
          console.log('✅ PDF loaded successfully.');
        } catch {
          throw new Error('❌ PDF content did not load or is not visible.');
        }
    }

    async downloadPdf(fileName: string, context, page, url: string, downloadDir: string, password: string): Promise<string> {       

        console.log(`🌐 Navigating to QA Task from MDA Folder URL: ${url}`);
        await page.goto(url); 
         await page.waitForLoadState('networkidle');

            const file = page.locator(`text=${fileName}`);
            await file.waitFor({ state: 'visible', timeout: 60000 });

            const [popup] = await Promise.all([
                context.waitForEvent('page'),         
                file.click({ button: 'middle' }),    
            ]);

            await popup.waitForLoadState('networkidle');
            console.log('✅ The file was opened in a new tab.');

            const passwordInput = popup.locator('input[type="password"]');
        
                let download;
                let downloadButton;
            
                if (await passwordInput.isVisible({ timeout: 3000 }).catch(() => false)) {
                    console.log('🔒 Password input detected. Entering password...');
            
                    const sendButton = popup.locator('div[aria-label="إرسال كلمة المرور"]');
            
                    await passwordInput.fill(password);
                    await passwordInput.press('Enter');
                    await popup.waitForTimeout(500);
            
                    await expect(sendButton).toHaveAttribute('aria-disabled', 'false', { timeout: 5000 });
                    await sendButton.click();
                    await Promise.all([
                        popup.waitForNavigation({ waitUntil: 'networkidle' }),
                    ]);
            
                    // 📄 Ensure PDF Page Loaded Correctly
                    await this.checkPdfLoadedSuccessfully(popup)
            
                    // 🔘 Click "Download" button
                    const downloadBtn = popup.locator('div[role="button"][aria-label="تنزيل"]');
                    await downloadBtn.waitFor({ timeout: 10000 });
                    await downloadBtn.click();
                    console.log('⬇️ Download button clicked.');
            
                    // 🆕 Wait for new page to open after clicking "Download"
                    const [newPage] = await Promise.all([
                        context.waitForEvent('page'),
                    ]);
            
                    await newPage.waitForLoadState();
                    console.log('📄 New page opened.');
                    
                    await newPage.waitForTimeout(5000);

                    // ⏬ Check for "Download anyway" button and click if exists
                    downloadButton = newPage.locator('text=Download anyway');
                    if (await downloadButton.isVisible({ timeout: 5000 }).catch(() => false)) {
                        await downloadButton.click();
                        console.log('📥 "Download anyway" button found and clicked.');
                    }
            
                    [download] = await Promise.all([
                        newPage.waitForEvent('download'),
                    ]);
            
                } else {
                    console.log('⏳ Waiting for download button...');
                    // 📄 Ensure PDF Page Loaded Correctly
                    await this.checkPdfLoadedSuccessfully(popup)

                    downloadButton = popup.locator('div[aria-label*="Download"], div[aria-label*="تنزيل"], div[aria-label*="הורדה"]');
                    await downloadButton.waitFor({ timeout: 15000 });
                    downloadButton.click();
                    
                    console.log('⬇️ Initiating download...');
                    [download] = await Promise.all([
                        popup.waitForEvent('download'),
                    ]);
                }
            
                const filePath = path.join(downloadDir, await download.suggestedFilename());
                await download.saveAs(filePath);
            
                console.log('✅ Download complete:', filePath);
                return filePath;
    }      
      
    async getPdfPermissions(pdfPath: string, password?: string): Promise<number[]> {
        console.log('🔍 Reading PDF permissions...');
        const pdfjsLib = await this.loadPdfJs();
        const data = fs.readFileSync(pdfPath);
        let pdf;
    
        try {
            const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(data) });
            pdf = await loadingTask.promise;
        } catch (error: any) {
            if (error?.name === 'PasswordException') {
                if (!password) {
                    throw new Error('❌ PDF requires a password but none was provided.');
                }
    
                console.log('🔐 Password required. Retrying with provided password...');
                const loadingTaskWithPassword = pdfjsLib.getDocument({
                    data: new Uint8Array(data),
                    password: password,
                });
                pdf = await loadingTaskWithPassword.promise;
            } else {
                throw error;
            }
        }
    
        const permissions = await pdf.getPermissions();
        console.log('✅ Permissions retrieved.');
    
        if (!permissions) {
            console.log('ℹ️ No explicit permissions found — assuming all allowed.');
            return []; // empty list means "all allowed"
        }
    
        const flags = pdfjsLib.PermissionFlag;
    
        // 🔍 Check specifically for PRINT or PRINT_HIGH_QUALITY
        const canPrint = permissions.includes(flags.PRINT) || permissions.includes(flags.PRINT_HIGH_QUALITY);
        if (canPrint) {
            console.log('✅ Printing is allowed.');
        } else {
            console.log('⚠️ Printing is NOT allowed.');
        }
    
        await pdf.destroy();
        return permissions;
    }   
}