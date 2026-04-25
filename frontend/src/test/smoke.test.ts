describe('vitest smoke', () => {
  it('runs and basic matchers work', () => {
    expect(1 + 1).toBe(2);
  });

  it('jsdom environment is available', () => {
    const div = document.createElement('div');
    div.textContent = 'hello';
    expect(div.textContent).toBe('hello');
  });
});
