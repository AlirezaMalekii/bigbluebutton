import { expect } from '@playwright/test';

import { elements as e } from '../core/elements';
import { MultiUsers } from './multiusers';

export class MobileDevices extends MultiUsers {
  async mobileTagName() {
    await this.modPage.waitAndClick(e.userListToggleBtn);
    await this.modPage.waitForSelector(e.currentUser);
    await this.modPage.hasElement(e.mobileUser, 'should display the mobile user element for the moderator ');
  }

  async portraitOrientationGuard() {
    const overlay = this.modPage.page.locator('#skyroom-phone-portrait-overlay');
    await expect(overlay).toHaveCount(0);

    // Simulate the viewport reduction caused by a soft keyboard while the
    // device remains portrait. It must not trigger the orientation blocker.
    await this.modPage.page.setViewportSize({ width: 390, height: 500 });
    await this.modPage.page.waitForTimeout(250);
    await expect(overlay).toHaveCount(0);
    await expect(this.modPage.page.locator('html')).not.toHaveAttribute('data-skyroom-phone-landscape', 'true');

    await this.modPage.page.setViewportSize({ width: 844, height: 390 });
    await expect(overlay).toBeVisible();
    await expect(overlay).toContainText(/عمودی|portrait/i);
    await expect(overlay).toBeInViewport();

    await this.modPage.page.setViewportSize({ width: 390, height: 844 });
    await expect(overlay).toHaveCount(0);
    await expect(this.modPage.page.locator('body')).not.toHaveAttribute('data-skyroom-phone-portrait-lock', 'true');
  }
}
