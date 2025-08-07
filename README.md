# 📄 PDF Print Permissions Validation – Automated Tests

## 🧪 Task Overview

**Goal**: Automate the validation of print permissions in PDF files.

### ✅ Requirements
[Automation] PDF Print Permissions Validation  
You are required to:
- Prepare two PDF files:
  - One with **restricted print permissions**.
  - One with **print permissions enabled**.
- Implement a test that:
  1. Uploads both files to a cloud storage service (Google Drive).
  2. Opens each file in a **new browser tab**.
  3. Confirms the file loads correctly.
  4. Downloads the file from the browser.
  5. Verifies whether the downloaded file allows printing.

> 🛠️ You may use any programming language and libraries of your choice.

---

## 🏗️ Project Structure & Implementation

This project is implemented using **Playwright** for browser automation and **Google Drive API** for managing file uploads/downloads.

### 🔍 Test Coverage
We implemented **3 test cases** to cover different permission scenarios:

1. **Disallow Print** — PDF is password-protected and has no print permission.
2. **Allow Print** — PDF is not password-protected and printing is enabled.
3. **Allow Print** — PDF is password-protected but printing is allowed.

---

## 🧰 Tools & Technologies
- **Playwright**: For browser automation.
- **Google Drive API**: For uploading/downloading PDFs.
- **pdfjs-dist**: To inspect PDF permissions programmatically.
- **TypeScript**: Main programming environment.

---

## 📁 Key Components

### `DriveHelper` Class

Handles interaction with Google Drive API:
- `authenticate()` – Authenticates using OAuth2 and sets up the API client.
- `uploadPdf()` – Uploads a given PDF file to the target folder in Google Drive.
- `cleanupFolder()` – Deletes all uploaded files from the folder after tests.

### `PdfPermissionValidator` Class

Handles PDF operations and permission checks:
- `loadPdfJs()` – Loads the `pdfjs-dist` library to parse PDF metadata and permissions.
- `checkPdfLoadedSuccessfully()` – Confirms the PDF renders correctly in the browser.
- `downloadPdf()` – Downloads the PDF from the browser, handling both password and non-password flows.
- `getPdfPermissions()` – Extracts and interprets the permission flags to determine if printing is allowed.

---

## 🔁 Test Flow

### 🔐 Before All Tests
Authenticate with Google Drive:

```ts
test.beforeAll(async () => {
  authClient = await driveHelper.authenticate();
});
```

### 🚀 Running the Tests

```ts
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
```

### 🧹 After All Tests
Clean up Google Drive folder:

```ts
test.afterAll(async () => {
  console.log('🧹 Cleaning up Google Drive folder after all tests...');
  const folderId = '11DQ3aYC90myC2AKXbPwzjPRn6_4tATmZ'; 
  await driveHelper.cleanupFolder(authClient, folderId);
});
```

---

## 📦 How to Run

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up your Google API credentials**
   - Place your `credentials.json` in the root directory.
   - Authenticate via browser when prompted on first run.

3. **Run tests**
   ```bash
   npx playwright test tests/pdf_print_permissions_validation.spec.ts --project=chromium --headed --workers=1
   ```
   - tests/pdf_print_permissions_validation.spec.ts – Specifies the test file to run.
   - --project=chromium – Runs the test using the Chromium browser. You can also use --project=firefox or --project=webkit to test on Firefox or WebKit. To run on all supported browsers, remove this flag.
   - --headed – Opens the browser UI during the test (not headless).
   - --workers=1 – Runs tests sequentially using a single worker (no parallelism).

---

## 📌 Notes
- The tests support **all Playwright browsers**: Chromium, Firefox, and WebKit.
- The test automation supports both **password-protected** and **unprotected** PDFs.
- The permission check leverages the internal **PDF permissions flags** defined by the PDF spec.
- Tests simulate realistic browser behavior and Google Drive flows.
