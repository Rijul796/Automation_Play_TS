import { test, expect, Page } from '@playwright/test';

// Increase the test timeout to 2 minutes
test.setTimeout(120000);

// Helper function to check document links on the current page
type BrokenLink = {
  option: string;
  linkText: string;
  url: string;
  status?: number;
  error?: string;
};

async function checkDocumentLinks(page: Page, optionName = 'Unknown option'): Promise<BrokenLink[]> {
  const broken: BrokenLink[] = [];

  // Collect links for common document types: pdf, doc, docx, ppt, pptx
  const docSelector = 'a[href$=".pdf"], a[href$=".doc"], a[href$=".docx"], a[href$=".ppt"], a[href$=".pptx"], a[href$=".xlsx"]';
  const docLinks = await page.locator(docSelector).all();
  console.log(`Found ${docLinks.length} document links for option: ${optionName}`);

  for (const link of docLinks) {
    const href = await link.getAttribute('href');
    const rawText = await link.textContent();
    const linkText = (rawText || '').trim() || href || '';

    if (!href) continue;

    try {
      const absoluteUrl = new URL(href, page.url()).toString();

      try {
        // Use HEAD where possible; some servers may not support HEAD for static files,
        // so fall back to GET if HEAD returns an error or non-success code.
        let response = await page.request.head(absoluteUrl, { timeout: 10000 }).catch(() => null as any);
        if (!response || response.status() >= 400) {
          response = await page.request.get(absoluteUrl, { timeout: 10000 }).catch(() => null as any);
        }
        if (!response) {
          broken.push({ option: optionName, linkText, url: absoluteUrl, error: 'Request failed' });
          console.error(`ERROR: [${optionName}] Document link "${linkText}" (${absoluteUrl}) request failed`);
          continue;
        }

        const status = response.status();
        const isSuccess = status >= 200 && status < 400;
        console.log(`[${optionName}] Document link "${linkText}" (${absoluteUrl}): ${isSuccess ? 'OK' : 'Failed'} (Status: ${status})`);
        if (!isSuccess) {
          broken.push({ option: optionName, linkText, url: absoluteUrl, status });
          console.error(`WARNING: [${optionName}] Document link "${linkText}" is not accessible (Status: ${status})`);
        }
      } catch (reqError: any) {
        broken.push({ option: optionName, linkText, url: absoluteUrl, error: reqError.message });
        console.error(`ERROR: [${optionName}] Document link "${linkText}" (${absoluteUrl}) request failed: ${reqError.message}`);
        continue;
      }
    } catch (error: any) {
      broken.push({ option: optionName, linkText, url: href, error: error.message });
      console.error(`Error checking document link "${linkText}" (${href}) for option "${optionName}":`, error.message);
      continue;
    }
  }

  return broken;
}

// Global constants (better: use env variables for security)
const BASE_URL = 'https://www.stage.riversidedatamanager.com';
const USER_EMAIL = process.env.TEST_USER_EMAIL || 'devmanual+sdmqa@riversideinsights.com';
const USER_PASSWORD = process.env.TEST_USER_PASSWORD || 'password1';

test('Verified Resources Links', async ({ page }) => {
  // Navigate to login page
  await test.step('Go to login page', async () => {
    await page.goto(`${BASE_URL}/user/signin`, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(/DataManager/i);
  });

  // Fill in login credentials
  await test.step('Enter credentials and login', async () => {
    await page.getByRole('textbox', { name: /email/i }).fill(USER_EMAIL);
    await page.getByRole('textbox', { name: /password/i }).fill(USER_PASSWORD);
    // Click the submit button specifically to avoid matching other buttons with similar accessible names
    await page.locator('button[type="submit"]').click();
  });
  // Check resources
  await test.step('Resources', async () => {
    // Wait for the Resources link and get its href
    const resourcesLink = page.locator('a.header-link[title="Resources"][target="_blank"]');
    await resourcesLink.waitFor({ state: 'visible' });
    
    // Get the new page that will be opened
    const [newPage] = await Promise.all([
      page.context().waitForEvent('page'),
      resourcesLink.click()
    ]);
    console.log('Clicked on Resources link');

    // Wait for the new page to load
    await newPage.waitForLoadState('networkidle');
    await expect(newPage).toHaveURL(/.*\/digitalrsc/);

    // Verify PDF links for each dropdown option
    await test.step('Check PDF links for all dropdown options', async () => {
      // Wait for page to be fully loaded
      await newPage.waitForLoadState('networkidle');

      // Define the dropdown interactions with exact selectors from the HTML
      const dropdownOptions = [
        // { name: 'Iowa Flex™' },
        { name: 'Cognitive Abilities Test™' },
        { name: 'Cognitive Abilities Test™ Screening Form' },
        { name: 'Logramos®' },
        { name: 'Gates-MacGinitie Reading Tests®' },
        { name: 'DataManager' }
      ];

      const dropdownActions = dropdownOptions.map(option => async () => {
        // Wait for and click the dropdown button
        const dropdown = newPage.locator('button.dm-ui-dropdown-button');
        await dropdown.waitFor({ state: 'visible' });
        await dropdown.click();
        
        // Wait for dropdown items to be visible
        await newPage.waitForSelector('ul.dm-ui-dropdown-items', { state: 'visible' });
        
        // Find and click the option by exact text content
        const optionElement = newPage.locator('li.dm-ui-li-item').filter({ hasText: new RegExp(`^${option.name}$`) });
        await optionElement.waitFor({ state: 'visible' });
        await optionElement.click();
        
        return option.name;
      });

  // Collect broken links across all options
  const allBroken: BrokenLink[] = [];

      // First check Iowa Assessments (it's selected by default)
      const iowaOptionName = 'Iowa Assessments™';
      console.log(`\nChecking option: ${iowaOptionName}`);
      await newPage.waitForLoadState('networkidle');
      allBroken.push(...await checkDocumentLinks(newPage, iowaOptionName));

      // Then check each other option
      for (const action of dropdownActions) {
        try {
          // Try to select the option
          const optionText = await action();
          console.log(`\nSelected option: ${optionText}`);
          
          // Wait for the page content to update
          await newPage.waitForLoadState('networkidle');
          await newPage.waitForTimeout(2000); // Additional wait for dynamic content
          
          // Check the PDF links and collect any broken links
          console.log(`Checking PDF links for option: ${optionText}`);
          allBroken.push(...await checkDocumentLinks(newPage, optionText));
        } catch (error: any) {
          console.error(`Failed to check option:`, error.message);
          // Log the current state of the page for debugging
          console.log('Current URL:', await newPage.url());
          throw error;
        }
      }

      // If there are broken links, print a red summary at the end of the step
      if (allBroken.length > 0) {
        // ANSI escape code for bright red text
        const red = '\u001b[31m';
        const reset = '\u001b[0m';
        console.log(`${red}\n=== BROKEN LINKS SUMMARY (${allBroken.length}) ===${reset}`);
        for (const b of allBroken) {
          const statusOrError = b.status ? `Status: ${b.status}` : `Error: ${b.error}`;
          console.log(`${red}- [${b.option}] "${b.linkText}" -> ${b.url} (${statusOrError})${reset}`);
        }
        console.log(`${red}=== END OF BROKEN LINKS SUMMARY ===\n${reset}`);
      } else {
        console.log('\nNo broken links found.');
      }
    });
  });
});