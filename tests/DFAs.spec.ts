import { test, expect, Page, Locator } from '@playwright/test';

// Increase default test timeout to 2 minutes for slower pages
test.setTimeout(120000);

export const BASE_URL = 'https://www.stage.riversidedatamanager.com';
export const USER_EMAIL = process.env.TEST_USER_EMAIL || 'devmanual+sdmqa@riversideinsights.com';
export const USER_PASSWORD = process.env.TEST_USER_PASSWORD || 'password1';

export type BrokenLink = {
  linkText: string;
  url: string;
  status?: number;
  error?: string;
};

async function checkAllLinks(page: Page): Promise<BrokenLink[]> {
  const broken: BrokenLink[] = [];

  // collect all anchor elements with an href
  const anchors = await page.locator('a[href]').all();
  console.log(`Found ${anchors.length} anchors on page ${page.url()}`);

  const seen = new Set<string>();
  for (const a of anchors) {
    const href = await a.getAttribute('href');
    const rawText = await a.textContent();
    const linkText = (rawText || '').trim() || href || '';
    if (!href) continue;

    // normalize absolute URL
    let absolute: string;
    try {
      absolute = new URL(href, page.url()).toString();
    } catch (e: any) {
      console.error(`Skipping malformed URL for link "${linkText}": ${href}`);
      broken.push({ linkText, url: href, error: 'malformed URL' });
      continue;
    }

    if (seen.has(absolute)) continue;
    seen.add(absolute);

    try {
      // Use HEAD to avoid downloading large content. Some servers may not support HEAD; fall back to GET if needed.
      // skip non-http(s) schemes
      if (!absolute.startsWith('http://') && !absolute.startsWith('https://')) {
        console.log(`Skipping non-HTTP link: ${absolute}`);
        continue;
      }

      let response = await page.request.head(absolute, { timeout: 10000 });
      let status = response.status();
      if (status === 405) {
        // Method not allowed for HEAD — try GET
        response = await page.request.get(absolute, { timeout: 10000 });
        status = response.status();
      }

      const ok = status >= 200 && status < 400;
      console.log(`Link "${linkText}" -> ${absolute}: ${ok ? 'OK' : 'Failed'} (Status: ${status})`);
      if (!ok) {
        broken.push({ linkText, url: absolute, status });
      }
    } catch (reqError: any) {
      console.error(`Request failed for "${linkText}" -> ${absolute}: ${reqError.message}`);
      broken.push({ linkText, url: absolute, error: reqError.message });
      continue;
    }
  }

  return broken;
}

// Check anchors only inside a provided container locator
export async function checkAnchorsInContainer(container: Locator, page: Page, seen: Set<string>): Promise<BrokenLink[]> {
  const broken: BrokenLink[] = [];
  const anchors = await container.locator('a[href]').all();
  console.log(`Found ${anchors.length} anchors in container`);

  for (const a of anchors) {
    const href = await a.getAttribute('href');
    const rawText = await a.textContent();
    const linkText = (rawText || '').trim() || href || '';
    if (!href) continue;

    let absolute: string;
    try {
      absolute = new URL(href, page.url()).toString();
    } catch (e: any) {
      console.error(`Skipping malformed URL for link "${linkText}": ${href}`);
      broken.push({ linkText, url: href, error: 'malformed URL' });
      continue;
    }

    if (seen.has(absolute)) continue;
    seen.add(absolute);

    // skip non-http(s) schemes
    if (!absolute.startsWith('http://') && !absolute.startsWith('https://')) {
      console.log(`Skipping non-HTTP link: ${absolute}`);
      continue;
    }

    try {
      let response = await page.request.head(absolute, { timeout: 10000 });
      let status = response.status();
      if (status === 405) {
        response = await page.request.get(absolute, { timeout: 10000 });
        status = response.status();
      }

      const ok = status >= 200 && status < 400;
      console.log(`Link "${linkText}" -> ${absolute}: ${ok ? 'OK' : 'Failed'} (Status: ${status})`);
      if (!ok) {
        broken.push({ linkText, url: absolute, status });
      }
    } catch (reqError: any) {
      console.error(`Request failed for "${linkText}" -> ${absolute}: ${reqError.message}`);
      broken.push({ linkText, url: absolute, error: reqError.message });
      continue;
    }
  }

  return broken;
}

test('Check DFAs', async ({ page }) => {
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
    
    // Wait for navigation to complete and overview link to appear
    await Promise.all([
      page.waitForURL('**/overview', { timeout: 30000 }),
      page.waitForSelector('text=Overview', { state: 'visible', timeout: 30000 })
    ]).catch(async (error) => {
      console.log('Login state check:', await page.url());
      throw error;
    });
  });

  // Navigate to Overview and open the Directions/Resources page
  await test.step('Open Directions/Resources', async () => {
    await page.goto(`${BASE_URL}/overview`, { waitUntil: 'domcontentloaded' });
    // Click Access Admin if present
    const accessAdmin = page.getByRole('link', { name: /Access Admin/i });
    if (await accessAdmin.count() > 0) {
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
        accessAdmin.click()
      ]);
      await page.waitForSelector('body', { state: 'visible' });
    }

    // Click the 'Download Directions for' link — it may open a new page
    const downloadLink = page.getByRole('link', { name: /Download Directions for/i });
    if (await downloadLink.count() === 0) {
      console.warn('Download Directions link not found on overview page');
      return;
    }

    // Prefer opening the link by href in a fresh page (avoids popup blockers / closed pages)
    let target: Page = page;
    const href = await downloadLink.getAttribute('href');
    if (href) {
      try {
        const absolute = new URL(href, page.url()).toString();
        const newPage = await page.context().newPage();
        await newPage.goto(absolute);
        await newPage.waitForSelector('.jqtree-tree', { state: 'visible', timeout: 30000 });
        target = newPage;
      } catch (err) {
        // fallback to clicking if opening by URL fails
        const msg = err && typeof err === 'object' && 'message' in err ? (err as any).message : String(err);
        console.warn('Opening by href failed, falling back to click:', msg);
        const newPagePromise = page.context().waitForEvent('page', { timeout: 3000 }).catch(() => null);
        await downloadLink.click();
        const resourcesPage = await newPagePromise;
        if (resourcesPage) target = resourcesPage as Page;
        await target.waitForSelector('.jqtree-tree', { state: 'visible', timeout: 30000 });
      }
    } else {
      // No href — try to click and detect a new page
      const newPagePromise = page.context().waitForEvent('page', { timeout: 3000 }).catch(() => null);
      await downloadLink.click();
      const resourcesPage = await newPagePromise;
      if (resourcesPage) target = resourcesPage as Page;
      await target.waitForLoadState('networkidle');
    }

    // Expand specific jqtree items using their aria-labels so links become visible
    const treeLabels = [
      'Cognitive Abilities Test™ (CogAT®)',
      'Cognitive Abilities Test™ (CogAT®) Screening Form',
      'Iowa Assessments™',
      'Logramos® Tercera Edición'
    ];

    const allBroken: BrokenLink[] = [];
    const seen = new Set<string>();

    for (const label of treeLabels) {
      try {
        const span = target.locator(`span[aria-label="${label}"]`);
        if (await span.count() === 0) {
          console.log(`Tree item not found for label: ${label}`);
          continue;
        }

        // click toggler if present to expand
        const node = span.locator('xpath=ancestor::div[contains(@class, "jqtree-element")]').first();
        const toggler = node.locator('a.jqtree-toggler').first();
        if (await toggler.count() > 0) {
          try { await toggler.click(); await target.waitForTimeout(400); } catch { }
        }
        // Prefer the UL that follows this label (many tree widgets render children in a following <ul>)
        let container: Locator | null = null;
        const followingUL = target.locator(`xpath=//span[@aria-label="${label}"]/following::ul[1]`);
        if (await followingUL.count() > 0) {
          container = followingUL.first();
        } else {
          // fallback: use the node's descendant area
          container = node;
        }

        // Now check anchors inside the chosen container only
        const broken = await checkAnchorsInContainer(container, target as Page, seen);
        allBroken.push(...broken);
      } catch (err) {
        console.warn(`Error processing ${label}: ${err}`);
      }
    }

    // Also include any visible jqtree lists that may not be direct children of the labels
    // (the user provided several <ul class="jqtree_common"> groups that should be scanned)
    try {
      const extraULs = target.locator('ul.jqtree_common[role="group"]');
      const extraCount = await extraULs.count();
      if (extraCount > 0) {
        console.log(`Found ${extraCount} additional jqtree <ul> groups — scanning anchors inside them`);
        for (let i = 0; i < extraCount; i++) {
          const ul = extraULs.nth(i);
          const broken = await checkAnchorsInContainer(ul, target as Page, seen);
          allBroken.push(...broken);
        }
      }
    } catch (err) {
      console.warn('Error scanning extra jqtree <ul> groups:', err);
    }

    // Print red summary if any broken links
    if (allBroken.length > 0) {
      const red = '\u001b[31m';
      const reset = '\u001b[0m';
      console.log(`${red}\n=== BROKEN LINKS SUMMARY (${allBroken.length}) ===${reset}`);
      for (const b of allBroken) {
        const statusOrError = b.status ? `Status: ${b.status}` : `Error: ${b.error}`;
        console.log(`${red}- "${b.linkText}" -> ${b.url} (${statusOrError})${reset}`);
      }
      console.log(`${red}=== END OF BROKEN LINKS SUMMARY ===\n${reset}`);
    } else {
      console.log('\nNo broken links found in the selected sections.');
    }
  });
});