import { bottomPadding, offsetAfterPrepend } from '../ios/scroll';

describe('iPhone chat scrolling', () => {
  const anchor = { offset: 40, height: 2000, oldestId: 51 };

  it('waits for the older page before moving the reader', () => {
    expect(offsetAfterPrepend(anchor, 2030, 51)).toBeNull();
  });

  it('keeps the same message on screen once older rows are prepended', () => {
    expect(offsetAfterPrepend(anchor, 3200, 1)).toBe(1240);
  });

  it('pads the end by the keyboard the composer is lifted over', () => {
    expect(bottomPadding(120, 0)).toBe(120);
    expect(bottomPadding(120, 253)).toBe(373);
  });
});
