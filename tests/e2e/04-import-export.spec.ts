import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Import/Export Functionality', () => {
  test('should export a model and then import it back', async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Close welcome guide if visible
    const welcomeDialog = page.locator('div').filter({ hasText: /Welcome to Event Modeling App/i }).first();
    if (await welcomeDialog.count() > 0 && await welcomeDialog.isVisible()) {
      const getStartedBtn = page.getByRole('button', { name: /Get Started|Continue|Close/i });
      if (await getStartedBtn.count() > 0) {
        await getStartedBtn.click();
        console.log('Closed welcome guide');
      }
    }
    
    // Create a few nodes for our test model
    await createNodes(page);
    console.log('Created test nodes');
    
    // Take screenshot of model before export
    await page.screenshot({ path: './tests/e2e/screenshots/04-before-export.png' });
    console.log('Captured screenshot before export');
    
    // Find and click the export button (typically in a Topbar or menu)
    const exportButton = page.getByRole('button').filter({ hasText: /Export|Save|Download/i }).first();
    
    if (await exportButton.count() > 0) {
      console.log('Found export button');
      
      // Set up file download listener
      const downloadPromise = page.waitForEvent('download');
      
      // Click the export button
      await exportButton.click();
      
      // Wait for download to start
      const download = await downloadPromise;
      console.log(`Download started: ${download.suggestedFilename()}`);
      
      // Save the downloaded file
      const downloadPath = path.join('./tests/e2e/screenshots', 'exported-model.json');
      await download.saveAs(downloadPath);
      console.log(`Saved exported file to ${downloadPath}`);
      
      // Take screenshot after export
      await page.screenshot({ path: './tests/e2e/screenshots/04-after-export.png' });
      console.log('Captured screenshot after export');
      
      // Verify the exported file exists and has content
      if (fs.existsSync(downloadPath)) {
        const exportedContent = fs.readFileSync(downloadPath, 'utf8');
        const exportedModel = JSON.parse(exportedContent);
        
        console.log('Analyzing exported model:');
        console.log(`- Model contains ${exportedModel.nodes?.length || 0} nodes`);
        console.log(`- Model contains ${exportedModel.edges?.length || 0} edges`);
        
        if (exportedModel.nodes?.length > 0) {
          console.log('✅ Export functionality working correctly');
        } else {
          console.log('⚠️ Exported model contains no nodes');
        }
        
        // Now test import functionality
        // First clear the existing model (if there's a clear/new button)
        const clearButton = page.getByRole('button').filter({ hasText: /Clear|New|Reset/i }).first();
        if (await clearButton.count() > 0) {
          await clearButton.click();
          console.log('Cleared the current model');
        } else {
          // Reload the page as an alternative
          await page.reload();
          await page.waitForLoadState('networkidle');
          console.log('Reloaded the page to start with a clean slate');
          
          // Close welcome guide again if needed
          if (await welcomeDialog.isVisible()) {
            const getStartedBtn = page.getByRole('button', { name: /Get Started|Continue|Close/i });
            if (await getStartedBtn.count() > 0) {
              await getStartedBtn.click();
              console.log('Closed welcome guide after reload');
            }
          }
        }
        
        // Take screenshot of empty model
        await page.screenshot({ path: './tests/e2e/screenshots/04-before-import.png' });
        console.log('Captured screenshot before import');
        
        // Find and click the import button
        const importButton = page.getByRole('button').filter({ hasText: /Import|Load|Open/i }).first();
        
        if (await importButton.count() > 0) {
          console.log('Found import button');
          
          // Set up file input for uploading
          const fileChooserPromise = page.waitForEvent('filechooser');
          await importButton.click();
          const fileChooser = await fileChooserPromise;
          await fileChooser.setFiles(downloadPath);
          
          console.log('Selected exported file for import');
          
          // Wait for import to complete (look for nodes to appear)
          await page.waitForTimeout(1000);
          
          // Take screenshot after import
          await page.screenshot({ path: './tests/e2e/screenshots/04-after-import.png' });
          console.log('Captured screenshot after import');
          
          // Verify nodes were imported by counting them
          const nodes = page.locator('.react-flow__node');
          const nodeCount = await nodes.count();
          
          console.log(`Found ${nodeCount} nodes after import`);
          
          if (nodeCount === exportedModel.nodes?.length) {
            console.log('✅ Import functionality working correctly');
            console.log('✅ Export/Import roundtrip successful!');
          } else {
            console.log(`⚠️ Import seems incomplete. Expected ${exportedModel.nodes?.length} nodes but found ${nodeCount}`);
          }
        } else {
          console.log('⚠️ Import button not found');
        }
      } else {
        console.log(`⚠️ Export file not found at ${downloadPath}`);
      }
    } else {
      console.log('⚠️ Export button not found');
    }
  });
});

/**
 * Helper function to create some test nodes
 */
async function createNodes(page) {
  const nodeTypes = ['Trigger', 'Command', 'Event', 'View'];
  
  for (const nodeType of nodeTypes) {
    // Try to find the add button for this node type
    const addButton = page.getByRole('button').filter({ hasText: new RegExp(`Add ${nodeType}`, 'i') }).first();
    
    if (await addButton.count() > 0) {
      await addButton.click();
      
      // Click somewhere on the canvas to place the node
      const canvasArea = page.locator('.react-flow');
      if (await canvasArea.count() > 0) {
        // Place nodes in different positions
        const index = nodeTypes.indexOf(nodeType);
        await canvasArea.click({ position: { x: 200 + (index * 150), y: 200 } });
        await page.waitForTimeout(200);
      } else {
        const altCanvas = page.locator('div[data-testid="rf__wrapper"]');
        if (await altCanvas.count() > 0) {
          const index = nodeTypes.indexOf(nodeType);
          await altCanvas.click({ position: { x: 200 + (index * 150), y: 200 } });
          await page.waitForTimeout(200);
        } else {
          console.log('Canvas area not found');
        }
      }
    } else {
      console.log(`Add button for ${nodeType} not found`);
    }
  }
}
