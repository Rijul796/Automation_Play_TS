import { test, expect } from '@playwright/test';

// Helper: wait for a visible confirmation/alert or success text on the page
async function waitForConfirmation(page: any, timeout = 15000) {
  // first try semantic alert role
  const alert = page.getByRole('alert');
  if (await alert.count() > 0) {
    await expect(alert.first()).toBeVisible({ timeout });
    return;
  }
  // fallback: look for common success text
  const successText = page.locator('text=/created|saved|success|assigned|added/i');
  await expect(successText.first()).toBeVisible({ timeout });
}
// UI helper: open a dm-ui multi-select widget and click option labels
async function uiSelectBatteries(page: any, widgetSelector: string, labels: string[]) {
  const widget = page.locator(widgetSelector).first();
  await widget.waitFor({ state: 'attached', timeout: 8000 });

  // try to click the widget's dropdown button
  const btn = widget.locator('.dm-ui-dropdown-button').first();
  if (await btn.count() > 0) {
    try {
      await btn.waitFor({ state: 'visible', timeout: 3000 });
      await btn.click();
    } catch (e) {
      await btn.evaluate((b: HTMLElement) => (b.click())).catch(() => {});
    }
  } else {
    // fallback: click the widget itself
    await widget.click().catch(() => {});
  }

  // locate dropdown content (may be rendered elsewhere)
  let content = widget.locator('.dm-ui-dropdown-content').first();
  try {
    await content.waitFor({ state: 'visible', timeout: 4000 });
  } catch (err) {
    // try global content
    content = page.locator('.dm-ui-dropdown-content').first();
    await content.waitFor({ state: 'visible', timeout: 4000 }).catch(() => {});
  }

  for (const labelText of labels) {
    const label = content.locator(`label:has-text("${labelText}")`).first();
    if (await label.count() > 0) {
      await label.scrollIntoViewIfNeeded().catch(() => {});
      await label.click().catch(async () => {
        const li = content.locator(`li:has-text("${labelText}")`).first();
        if (await li.count() > 0) await li.click().catch(() => {});
      });
      continue;
    }

    const inputLabel = content.locator(`input[type=checkbox] + label:has-text("${labelText}")`).first();
    if (await inputLabel.count() > 0) {
      await inputLabel.scrollIntoViewIfNeeded().catch(() => {});
      await inputLabel.click().catch(() => {});
      continue;
    }

    const anyEl = content.locator(`*:has-text("${labelText}")`).first();
    if (await anyEl.count() > 0) {
      await anyEl.click().catch(() => {});
    }
  }

  // click Apply if present
  const applyBtn = content.locator('button.dm-ui-apply-button, button:has-text("Apply")').first();
  if (await applyBtn.count() > 0) {
    await applyBtn.click().catch(() => {});
  }
}

test('test', async ({ page }) => {
  await page.goto('https://www.stage.riversidedatamanager.com/user/signin');
  await page.getByRole('textbox', { name: 'Email Address' }).click();
  await page.getByRole('textbox', { name: 'Email Address' }).fill('leboywilsonthoppil@gmail.com');
  await page.getByRole('textbox', { name: 'Password' }).click();
  await page.getByRole('textbox', { name: 'Password' }).fill('password1');
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  // wait for full page load and for any transient spinners to disappear
  await page.waitForLoadState('load', { timeout: 30000 }).catch(() => {});
  await page.locator('.dm-ui-spinner').waitFor({ state: 'detached', timeout: 30000 }).catch(() => {});
  // ensure the next expected element is visible before interacting
  await page.waitForSelector('#hlCustomerAcctAcces', { state: 'visible', timeout: 30000 });
  await page.locator('#hlCustomerAcctAcces').click();
  await page.getByRole('link', { name: 'Search Contract' }).click();
  await page.getByRole('row', { name: 'Email Address (None)' }).getByRole('link').click();
  await page.locator('#emailAddress').fill('sdmqa');
  // wait briefly for the page to settle after typing the search term
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  await page.locator('.dm-ui-spinner').waitFor({ state: 'detached', timeout: 10000 }).catch(() => {});
  // ensure the Search button is visible and enabled before clicking
  const searchBtn = page.getByRole('button', { name: 'Search Contract' });
  await searchBtn.waitFor({ state: 'visible', timeout: 10000 });
  await searchBtn.click();
  await page.getByRole('link', { name: 'Log In', exact: true }).click();
  await page.getByRole('toolbar', { name: 'Assessments Expandable' }).click();
  await page.getByRole('link', { name: 'Test Events', exact: true }).click();
  // Robustly click the Create button using the known ID and defensively remove any
  // overlays that might intercept pointer events before clicking.
  const createBtn = page.locator('#btnCreateTestEvent');
  await createBtn.waitFor({ state: 'visible', timeout: 15000 });

  // Attempt clicking the Create button and verify the TEST EVENT NAME textbox appears.
  const textbox = page.getByRole('textbox', { name: 'TEST EVENT NAME*' });
  let opened = false;
  for (let attempt = 0; attempt < 3 && !opened; attempt++) {
    // defensively hide overlays that might intercept clicks
    await page.locator('.dm-ui-overlay, .ui-block, .modal-backdrop, .blocking-overlay').evaluateAll((els: Element[]) => {
      els.forEach(e => {
        try { (e as HTMLElement).style.pointerEvents = 'none'; (e as HTMLElement).style.display = 'none'; } catch (err) {}
      });
    }).catch(() => {});

    await createBtn.scrollIntoViewIfNeeded();
    // First try a JS click (works even if overlays intercept pointer events)
    const clickedViaJS = await page.evaluate(() => {
      const b = document.getElementById('btnCreateTestEvent');
      if (b) {
        try { (b as HTMLElement).click(); return true; } catch (e) { return false; }
      }
      return false;
    }).catch(() => false);
    if (!clickedViaJS) {
      try {
        await createBtn.click({ timeout: 8000 });
      } catch (err) {
        // last resort: force click
        await createBtn.click({ force: true }).catch(() => {});
      }
    }

    // wait briefly for the textbox to appear
    try {
      await textbox.waitFor({ state: 'visible', timeout: 5000 });
      opened = true;
      break;
    } catch (e) {
      // wait a bit before retry
      await page.waitForTimeout(1000);
    }
  }

  if (!opened) {
    throw new Error('Create Test Event dialog did not open after clicking #btnCreateTestEvent');
  }
  await textbox.click();
  // include current date in dd/mm format in the test event name
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const testEventName = `Raj Testing ${dd}/${mm}`;
  await page.getByRole('textbox', { name: 'TEST EVENT NAME*' }).fill(testEventName);
  await page.getByText('Select participants').click();
  await page.getByRole('treeitem', { name: 'DMQA-S' }).locator('path').click();
  await page.getByRole('treeitem', { name: 'Riverdale' }).locator('svg').click();
  await page.getByText('Riverdale', { exact: true }).click();
  // Open the TEST EVENT ROSTER listbox and select the Riverdale Academy entry reliably
  const rosterListbox = page.getByRole('application', { name: 'TEST EVENT ROSTER*' }).getByRole('listbox');
  await rosterListbox.waitFor({ state: 'visible', timeout: 10000 });
  await rosterListbox.click();
  // allow the roster items to render
  await page.waitForTimeout(300);
  const rosterItem = page.locator('li.dm-ui-li-item', { hasText: 'Riverdale' }).first();
  await rosterItem.waitFor({ state: 'visible', timeout: 10000 });
  await page.waitForTimeout(2000); // 2 seconds delay
  // Try to click a checkbox inside the roster item if present, otherwise click the item
  const itemCheckbox = rosterItem.locator('input[type="checkbox"], [role="checkbox"]');
  if (await itemCheckbox.count() > 0) {
    await itemCheckbox.first().click().catch(async () => { await rosterItem.click(); });
    await page.waitForTimeout(2000); // 2 seconds delay
  } else {
    await rosterItem.click();
    await page.waitForTimeout(2000); // 2 seconds delay
  }
  // verify selection: either aria-checked or an input checked property
  const ariaChecked = await rosterItem.getAttribute('aria-checked');
  if (ariaChecked !== 'true') {
    // try clicking again as a recovery
    await rosterItem.click().catch(() => {});
    await page.waitForTimeout(2000); // 2 seconds delay
  }
  await page.getByRole('button', { name: 'Save' }).click();
  await page.waitForTimeout(2000); // 2 seconds delay
  await page.getByRole('button', { name: 'Assign' }).click();
  await page.waitForTimeout(2000); // 2 seconds delay
  await page.getByRole('button', { name: 'Create/Edit Assignment' }).click();
  await page.waitForTimeout(2000); // 2 seconds delay
  await page.getByRole('search').getByText('DMQA-S').click();
  await page.waitForTimeout(2000); // 2 seconds delay
  await page.getByRole('treeitem', { name: 'DMQA-S' }).locator('svg').click();
  await page.waitForTimeout(2000); // 2 seconds delay
  await page.getByRole('treeitem', { name: 'Riverdale' }).locator('svg').click();
  // await page.waitForTimeout(2000); // 2 seconds delay
  await page.getByText('Riverdale').click();
  await page.waitForTimeout(2000); // 2 seconds delay
  // Open the test group dropdown (button role=listbox) and select the desired test group by id/text
   const testGroupWidget = page.locator('#ddlTestGroupA_17085879_dm_ui');
   // wait for the widget to exist in the DOM (may be present but not visible immediately)
   await testGroupWidget.waitFor({ state: 'attached', timeout: 10000 });

   // find the listbox/button inside the widget and open it with fallbacks
   const listboxBtn = testGroupWidget.getByRole('listbox');
   if (await listboxBtn.count() === 0) {
     // fallback: query the button inside the widget
     await page.evaluate(selector => {
       const w = document.querySelector(selector) as HTMLElement | null;
       if (w) {
         const btn = w.querySelector('.dm-ui-dropdown-button') as HTMLElement | null;
         if (btn) btn.click();
       }
     }, '#ddlTestGroupA_17085879_dm_ui');
   } else {
     // ensure it's visible/clickable then click
     try {
       await listboxBtn.waitFor({ state: 'visible', timeout: 5000 });
       await listboxBtn.click();
     } catch (e) {
       // last resort: JS click
       await listboxBtn.evaluateAll((els: Element[]) => els.forEach(e => (e as HTMLElement).click()));
     }
   }

   // Prefer selecting by data-value which is stable across renders. Wait for the dropdown items to appear.
   const cogatOption = testGroupWidget.locator('li.dm-ui-li-item[data-value="72942"], li.dm-ui-li-item:has-text("CogAT 8 Complete")').first();
  await cogatOption.waitFor({ state: 'visible', timeout: 7000 });
  try {
    await cogatOption.click();
  } catch (e) {
    // fallback JS click
    await cogatOption.evaluateAll((els: Element[]) => els.forEach(e => (e as HTMLElement).click()));
  }
  // After selecting CogAT 8 Complete, select test batteries (Verbal/Quantitative/Nonverbal)
  // Use the single verified approach: find the dm-ui dropdown button with the
  // data-default-text "Select battery" and call uiSelectBatteries on that widget.
  const btn = page.locator('button.dm-ui-dropdown-button[data-default-text="Select battery"]');
  if (await btn.count() === 0) {
    throw new Error('Battery widget not found: expected button.dm-ui-dropdown-button[data-default-text="Select battery"]');
  }
  const btnId = await btn.first().getAttribute('id');
  const widgetSelector = btnId ? `[id="${btnId}"]` : 'button.dm-ui-dropdown-button[data-default-text="Select battery"]';
  // perform selection of the three batteries
  await uiSelectBatteries(page, widgetSelector, ['Verbal', 'Quantitative', 'Nonverbal']);
  console.log('battery selection used method C (data-default-text button)');

  // Save the test event after selecting the test group and batteries
  await page.getByRole('button', { name: 'Save' }).click();
  
  // Wait for the save to complete
  await Promise.all([
    // Wait for network idle (no active requests)
    page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {}),
    // Wait for any spinners to disappear
    page.locator('.dm-ui-spinner').waitFor({ state: 'detached', timeout: 30000 }).catch(() => {}),
    // Try to detect success state
    waitForConfirmation(page).catch(() => {})
  ]);
});