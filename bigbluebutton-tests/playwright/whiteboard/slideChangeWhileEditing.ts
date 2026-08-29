import { expect } from '@playwright/test';

import { ELEMENT_WAIT_LONGER_TIME } from '../core/constants';
import { elements as e } from '../core/elements';
import { MultiUsers } from '../user/multiusers';

export class SlideChangeWhileEditing extends MultiUsers {
  async doesNotCrashOnSlideChange() {
    const viewerPageErrors: string[] = [];
    this.userPage.page.on('pageerror', (error) => viewerPageErrors.push(error.message));

    await this.modPage.hasElement(e.whiteboard, 'presenter whiteboard is visible', ELEMENT_WAIT_LONGER_TIME);
    await this.userPage.hasElement(e.whiteboard, 'viewer whiteboard is visible');
    await this.modPage.hasElement(e.nextSlide, 'next-slide control is visible');
    await this.modPage.waitAndClick(e.multiUsersWhiteboardOn);
    await this.userPage.waitAndClick(e.wbTextShape);

    const whiteboard = await this.userPage.page.locator(e.whiteboard).boundingBox();
    if (!whiteboard) throw new Error('whiteboard boundingBox is null');
    const x = whiteboard.x + 0.4 * whiteboard.width;
    const y = whiteboard.y + 0.4 * whiteboard.height;
    await this.userPage.page.mouse.click(x, y);
    await this.userPage.page.keyboard.type('Hello');
    await this.userPage.hasElement(e.wbTextTrue, 'viewer text exists');
    await this.userPage.hasElement(e.wbEditingTextArea, 'viewer is actively editing');

    await this.modPage.waitAndClick(e.nextSlide);
    await this.userPage.page.waitForTimeout(2500);
    await this.userPage.page.mouse.click(whiteboard.x + 0.5 * whiteboard.width, whiteboard.y + 0.5 * whiteboard.height);
    await this.userPage.page.waitForTimeout(1000);

    expect(viewerPageErrors.filter((message) => /Expected an editing shape/i.test(message))).toHaveLength(0);
    await this.userPage.hasElement(e.whiteboard, 'viewer whiteboard remains mounted');
  }
}
