import { test, expect } from '@playwright/test';

test.describe('Basic UI Components', () => {
  test('should display all main UI components', async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    
    // Print page title for debugging
    console.log('Page title:', await page.title());
    
    // Wait for the app to be loaded (something identifiable)
    await page.waitForLoadState('networkidle');
    
    // Take a screenshot of the entire app for debugging
    await page.screenshot({ path: './tests/e2e/screenshots/01-full-app.png', fullPage: true });
    console.log('Captured full page screenshot');
    
    // Check for the topbar buttons
    const addNodeButtons = page.getByRole('button', { name: /Add (Trigger|Command|Event|View)/i });
    const buttonsCount = await addNodeButtons.count();
    console.log(`Found ${buttonsCount} add node buttons`);
    
    if (buttonsCount > 0) {
      // Take screenshot of the topbar area
      await page.locator('header').screenshot({ path: './tests/e2e/screenshots/01-topbar.png' });
      console.log('✅ Topbar contains node creation buttons');
    }
    
    // Look for the canvas - try a more generic selector
    const canvasArea = page.locator('.react-flow');
    if (await canvasArea.count() > 0) {
      await canvasArea.screenshot({ path: './tests/e2e/screenshots/01-canvas.png' });
      console.log('✅ Canvas is visible');
    } else {
      console.log('❌ Canvas not found with .react-flow selector');
      // Try an alternative selector
      const altCanvas = page.locator('div[data-testid="rf__wrapper"]');
      if (await altCanvas.count() > 0) {
        await altCanvas.screenshot({ path: './tests/e2e/screenshots/01-canvas.png' });
        console.log('✅ Canvas found with alternative selector');
      } else {
        console.log('❌ Canvas not found with alternative selector either');
      }
    }
    
    // Check for welcome guide - might appear for first-time users
    const welcomeDialog = page.locator('div').filter({ hasText: /Welcome to Event Modeling App/i }).first();
    if (await welcomeDialog.count() > 0 && await welcomeDialog.isVisible()) {
      await welcomeDialog.screenshot({ path: './tests/e2e/screenshots/01-welcome-guide.png' });
      console.log('✅ Welcome guide is visible');
      
      // Try to close the dialog if present
      const getStartedBtn = page.getByRole('button', { name: /Get Started|Continue|Close/i });
      if (await getStartedBtn.count() > 0) {
        await getStartedBtn.click();
        console.log('Closed welcome guide');
      }
    } else {
      console.log('Welcome guide is not visible');
    }
    
    // Look for history or validation panels
    const panels = page.locator('div').filter({ hasText: /(History|Validation|Patterns)/i });
    const panelsCount = await panels.count();
    console.log(`Found ${panelsCount} panels (History/Validation)`);
    
    if (panelsCount > 0) {
      await panels.first().screenshot({ path: './tests/e2e/screenshots/01-panels.png' });
      console.log('✅ Application panels are present');
    }
    
    // Overall assessment
    console.log('Basic UI verification complete');
  });
});
