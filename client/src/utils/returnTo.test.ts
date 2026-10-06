import { getPostLoginDestination, getSafeReturnTo } from './returnTo';

describe('getSafeReturnTo', () => {
  test.each([
    ['/equipment/', '/equipment/'],
    ['/productiondesk/', '/productiondesk/'],
    ['/scheduler/', '/scheduler/'],
    [
      '/equipment/shoots?view=ready#package',
      '/equipment/shoots?view=ready#package',
    ],
  ])('accepts the internal app path %s', (value, expected) => {
    expect(getSafeReturnTo(value)).toBe(expected);
  });

  test.each([
    null,
    '',
    'https://evil.example/',
    'http://evil.example/',
    '//evil.example/',
    'javascript:alert(1)',
    'data:text/html,hello',
    '/\\evil.example/',
    '/not-an-approved-app/',
    '/%E0%A4%A',
  ])('rejects an unsafe or malformed target: %s', (value) => {
    expect(getSafeReturnTo(value)).toBeNull();
  });
});

describe('getPostLoginDestination', () => {
  it('preserves normal Scheduler behavior without returnTo', () => {
    expect(getPostLoginDestination(null, '/meetings/active')).toBe(
      '/meetings/active',
    );
  });

  it('falls back safely when returnTo is invalid', () => {
    expect(getPostLoginDestination('https://evil.example/', '/')).toBe('/');
  });
});
