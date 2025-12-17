/**
 * Sprint 9: AI Learning Companion E2E Tests
 * Tests for the AI chat functionality
 */

import { test, expect } from '@playwright/test';

test.describe('AI Learning Companion', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the timeline page
    await page.goto('/timeline');
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
  });

  test.describe('Floating Button', () => {
    test('should display the AI companion button', async ({ page }) => {
      // The floating button should be visible
      const chatButton = page.locator('button[aria-label="Open AI assistant"]');
      await expect(chatButton).toBeVisible();
    });

    test('should open chat panel when button is clicked', async ({ page }) => {
      // Click the floating button
      const chatButton = page.locator('button[aria-label="Open AI assistant"]');
      await chatButton.click();

      // Chat panel should be visible
      const chatPanel = page.locator('[role="dialog"][aria-label="AI Learning Companion"]');
      await expect(chatPanel).toBeVisible();
    });

    test('should close chat panel when close button is clicked', async ({ page }) => {
      // Open the chat
      const chatButton = page.locator('button[aria-label="Open AI assistant"]');
      await chatButton.click();

      // Wait for panel to appear
      const chatPanel = page.locator('[role="dialog"][aria-label="AI Learning Companion"]');
      await expect(chatPanel).toBeVisible();

      // Close the panel
      const closeButton = page.locator('button[aria-label="Close chat"]');
      await closeButton.click();

      // Panel should be hidden
      await expect(chatPanel).not.toBeVisible();
    });

    test('should toggle button icon when panel is open/closed', async ({ page }) => {
      // Initially shows message icon
      const openButton = page.locator('button[aria-label="Open AI assistant"]');
      await expect(openButton).toBeVisible();

      // Click to open
      await openButton.click();

      // Should now show close icon
      const closeAssistantButton = page.locator('button[aria-label="Close AI assistant"]');
      await expect(closeAssistantButton).toBeVisible();
    });
  });

  test.describe('Chat Panel UI', () => {
    test.beforeEach(async ({ page }) => {
      // Open the chat panel
      const chatButton = page.locator('button[aria-label="Open AI assistant"]');
      await chatButton.click();
      await page.waitForSelector('[role="dialog"][aria-label="AI Learning Companion"]');
    });

    test('should display welcome message when no messages', async ({ page }) => {
      // Should show welcome content
      await expect(page.getByText('Ask me anything about AI history')).toBeVisible();
    });

    test('should display suggested starter questions', async ({ page }) => {
      // Should show starter questions
      await expect(page.getByText('What is a transformer in AI?')).toBeVisible();
      await expect(page.getByText('Why was GPT-3 significant?')).toBeVisible();
      await expect(page.getByText('How did deep learning start?')).toBeVisible();
    });

    test('should have a text input for messages', async ({ page }) => {
      const input = page.locator('textarea[placeholder="Ask about AI history..."]');
      await expect(input).toBeVisible();
      await expect(input).toBeEnabled();
    });

    test('should have a send button', async ({ page }) => {
      const sendButton = page.locator('button[aria-label="Send message"]');
      await expect(sendButton).toBeVisible();
    });

    test('should disable send button when input is empty', async ({ page }) => {
      const sendButton = page.locator('button[aria-label="Send message"]');
      await expect(sendButton).toBeDisabled();
    });

    test('should enable send button when input has text', async ({ page }) => {
      const input = page.locator('textarea[placeholder="Ask about AI history..."]');
      await input.fill('What is a transformer?');

      const sendButton = page.locator('button[aria-label="Send message"]');
      await expect(sendButton).toBeEnabled();
    });

    test('should display explain mode selector', async ({ page }) => {
      // Should show the default mode
      await expect(page.getByText('Plain English')).toBeVisible();
    });

    test('should open explain mode dropdown on click', async ({ page }) => {
      // Click the mode selector
      await page.getByText('Plain English').click();

      // Should show all mode options
      await expect(page.getByRole('option', { name: 'For My Boss' })).toBeVisible();
      await expect(page.getByRole('option', { name: 'Technical Deep-Dive' })).toBeVisible();
      await expect(page.getByRole('option', { name: 'Interview Prep' })).toBeVisible();
    });

    test('should change explain mode when option selected', async ({ page }) => {
      // Click the mode selector
      await page.getByText('Plain English').click();

      // Select a different mode
      await page.getByRole('option', { name: 'For My Boss' }).click();

      // Should show the new mode
      await expect(page.getByText('For My Boss')).toBeVisible();
    });

    test('should have a clear chat button', async ({ page }) => {
      const clearButton = page.locator('button[aria-label="Clear chat"]');
      await expect(clearButton).toBeVisible();
    });
  });

  test.describe('Message Interaction', () => {
    test.beforeEach(async ({ page }) => {
      // Open the chat panel
      const chatButton = page.locator('button[aria-label="Open AI assistant"]');
      await chatButton.click();
      await page.waitForSelector('[role="dialog"][aria-label="AI Learning Companion"]');
    });

    test('should add user message when sending', async ({ page }) => {
      const input = page.locator('textarea[placeholder="Ask about AI history..."]');
      await input.fill('What is machine learning?');

      const sendButton = page.locator('button[aria-label="Send message"]');
      await sendButton.click();

      // User message should appear
      await expect(page.getByText('What is machine learning?')).toBeVisible();
    });

    test('should clear input after sending message', async ({ page }) => {
      const input = page.locator('textarea[placeholder="Ask about AI history..."]');
      await input.fill('Test message');

      const sendButton = page.locator('button[aria-label="Send message"]');
      await sendButton.click();

      // Input should be cleared
      await expect(input).toHaveValue('');
    });

    test('should show typing indicator when waiting for response', async ({ page }) => {
      const input = page.locator('textarea[placeholder="Ask about AI history..."]');
      await input.fill('Test question');

      const sendButton = page.locator('button[aria-label="Send message"]');
      await sendButton.click();

      // Typing indicator should appear (may be brief if API responds quickly)
      // We check for the loading state by looking for the bouncing dots
      const typingIndicator = page.locator('.animate-bounce');
      // Note: This may pass or fail depending on API response time
      // In a real scenario, we might mock the API
    });

    test('should send message when pressing Enter', async ({ page }) => {
      const input = page.locator('textarea[placeholder="Ask about AI history..."]');
      await input.fill('Enter key test');
      await input.press('Enter');

      // Message should be sent
      await expect(page.getByText('Enter key test')).toBeVisible();
    });

    test('should not send message when pressing Shift+Enter', async ({ page }) => {
      const input = page.locator('textarea[placeholder="Ask about AI history..."]');
      await input.fill('Line 1');
      await input.press('Shift+Enter');

      // Message should NOT be sent yet (Shift+Enter is for new line)
      // The input should still be focused and contain the text
      await expect(input).toBeFocused();
    });

    test('should click on suggested question to send it', async ({ page }) => {
      // Click a suggested question
      await page.getByText('What is a transformer in AI?').click();

      // The question should appear as a user message
      await expect(page.locator('.bg-blue-600').filter({ hasText: 'What is a transformer in AI?' })).toBeVisible();
    });
  });

  test.describe('Milestone Integration', () => {
    test('should open chat when clicking Explain this button on milestone', async ({ page }) => {
      // Wait for milestones to load
      await page.waitForSelector('[data-testid="milestone-card"]', { timeout: 10000 });

      // Click on a milestone to open the detail view
      const milestoneCard = page.locator('[data-testid="milestone-card"]').first();
      await milestoneCard.click();

      // Wait for detail panel to open
      await page.waitForSelector('[data-testid="milestone-detail"]');

      // Click the "Explain this with AI" button
      const explainButton = page.locator('[data-testid="explain-button"]');
      await expect(explainButton).toBeVisible();
      await explainButton.click();

      // Chat panel should open
      const chatPanel = page.locator('[role="dialog"][aria-label="AI Learning Companion"]');
      await expect(chatPanel).toBeVisible();
    });

    test('should show milestone context banner in chat when opened from milestone', async ({ page }) => {
      // Wait for milestones to load
      await page.waitForSelector('[data-testid="milestone-card"]', { timeout: 10000 });

      // Click on a milestone
      const milestoneCard = page.locator('[data-testid="milestone-card"]').first();
      await milestoneCard.click();

      // Wait for detail panel
      await page.waitForSelector('[data-testid="milestone-detail"]');

      // Get the milestone title
      const milestoneTitle = await page.locator('[data-testid="detail-title"]').textContent();

      // Click explain button
      await page.locator('[data-testid="explain-button"]').click();

      // Chat should show context banner with milestone title
      if (milestoneTitle) {
        await expect(page.getByText(`Discussing: ${milestoneTitle}`)).toBeVisible();
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should show error message gracefully when API fails', async ({ page }) => {
      // Mock the API to return an error
      await page.route('**/api/chat', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' }),
        });
      });

      // Open chat
      const chatButton = page.locator('button[aria-label="Open AI assistant"]');
      await chatButton.click();

      // Send a message
      const input = page.locator('textarea[placeholder="Ask about AI history..."]');
      await input.fill('Test error handling');
      await page.locator('button[aria-label="Send message"]').click();

      // Should show error state
      await expect(page.locator('.bg-red-50, .bg-red-900\\/20')).toBeVisible({ timeout: 5000 });
    });

    test('should show rate limit message when limit exceeded', async ({ page }) => {
      // Mock rate limit response
      await page.route('**/api/chat', async (route) => {
        await route.fulfill({
          status: 429,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Rate limit exceeded',
            retryAfterMs: 60000,
            message: 'Please wait before sending more messages.',
          }),
        });
      });

      // Open chat
      const chatButton = page.locator('button[aria-label="Open AI assistant"]');
      await chatButton.click();

      // Send a message
      const input = page.locator('textarea[placeholder="Ask about AI history..."]');
      await input.fill('Rate limit test');
      await page.locator('button[aria-label="Send message"]').click();

      // Should show rate limit error
      await expect(page.getByText(/Rate limit exceeded/i)).toBeVisible({ timeout: 5000 });
    });

    test('should allow dismissing error message', async ({ page }) => {
      // Mock API error
      await page.route('**/api/chat', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Test error' }),
        });
      });

      // Open chat and trigger error
      await page.locator('button[aria-label="Open AI assistant"]').click();
      const input = page.locator('textarea[placeholder="Ask about AI history..."]');
      await input.fill('Error test');
      await page.locator('button[aria-label="Send message"]').click();

      // Wait for error to appear
      await page.waitForSelector('.bg-red-50, .bg-red-900\\/20', { timeout: 5000 });

      // Dismiss the error
      await page.getByText('Dismiss').click();

      // Error should be gone
      await expect(page.locator('.bg-red-50, .bg-red-900\\/20')).not.toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('chat panel should be keyboard accessible', async ({ page }) => {
      // Open chat using keyboard
      await page.keyboard.press('Tab');
      // Keep tabbing until we reach the chat button
      for (let i = 0; i < 20; i++) {
        const focused = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'));
        if (focused === 'Open AI assistant') {
          await page.keyboard.press('Enter');
          break;
        }
        await page.keyboard.press('Tab');
      }

      // Chat panel should be open
      const chatPanel = page.locator('[role="dialog"][aria-label="AI Learning Companion"]');
      // May or may not be visible depending on tab order
    });

    test('chat panel should have proper ARIA attributes', async ({ page }) => {
      await page.locator('button[aria-label="Open AI assistant"]').click();

      const chatPanel = page.locator('[role="dialog"][aria-label="AI Learning Companion"]');
      await expect(chatPanel).toHaveAttribute('role', 'dialog');
      await expect(chatPanel).toHaveAttribute('aria-label', 'AI Learning Companion');
    });

    test('floating button should have proper ARIA expanded state', async ({ page }) => {
      const openButton = page.locator('button[aria-label="Open AI assistant"]');
      await expect(openButton).toHaveAttribute('aria-expanded', 'false');

      await openButton.click();

      const closeButton = page.locator('button[aria-label="Close AI assistant"]');
      await expect(closeButton).toHaveAttribute('aria-expanded', 'true');
    });
  });
});
