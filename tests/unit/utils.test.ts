/**
 * Sample unit test to verify Jest configuration
 * Real utility tests will be added as utilities are created
 */
describe('Jest Configuration', () => {
  it('should run basic tests', () => {
    expect(1 + 1).toBe(2);
  });

  it('should have access to DOM APIs via jsdom', () => {
    const element = document.createElement('div');
    element.textContent = 'Hello';
    expect(element.textContent).toBe('Hello');
  });

  it('should support async/await', async () => {
    const result = await Promise.resolve('test');
    expect(result).toBe('test');
  });
});
