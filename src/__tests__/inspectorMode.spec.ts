// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';

import { InspectorMode } from '../inspectorMode';

const locale = 'en-US';

describe('InspectorMode', () => {
  let inspectorMode: InspectorMode;

  beforeEach(() => {
    inspectorMode = new InspectorMode({ locale });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('receiveMessage', () => {
    test("shouldn't change anything if the incoming message isnt the correct action", () => {
      const spy = vi.spyOn(document.body.classList, 'toggle');
      // @ts-expect-error -- only for test
      inspectorMode.receiveMessage({ action: 'ENTRY_UPDATED' });
      expect(spy).not.toHaveBeenCalled();
    });

    test('should toggle "contentful-inspector--active" class on document.body based on value of isInspectorActive', () => {
      const spy = vi.spyOn(document.body.classList, 'toggle');
      inspectorMode.receiveMessage({
        from: 'live-preview',
        isInspectorActive: true,
        action: 'INSPECTOR_MODE_CHANGED',
      });
      expect(spy).toHaveBeenCalledWith('contentful-inspector--active', true);
    });
  });
});
