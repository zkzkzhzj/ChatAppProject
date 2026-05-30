import { describe, expect, it } from 'vitest';

import { LibraryScene } from './LibraryScene';

describe('LibraryScene', () => {
  it('detects librarian proximity near the desk', () => {
    const scene = new LibraryScene();

    scene.character.position.set(0, 0, -2.6);

    expect(scene.isNearLibrarian()).toBe(true);
    expect(scene.isNearBookshelf()).toBe(false);
  });

  it('detects bookshelf proximity near the left shelf', () => {
    const scene = new LibraryScene();

    scene.character.position.set(-5, 0, -5.1);

    expect(scene.isNearLibrarian()).toBe(false);
    expect(scene.isNearBookshelf()).toBe(true);
  });

  it('detects bookshelf proximity near the right shelf', () => {
    const scene = new LibraryScene();

    scene.character.position.set(5, 0, -5.1);

    expect(scene.isNearLibrarian()).toBe(false);
    expect(scene.isNearBookshelf()).toBe(true);
  });

  it('does not detect bookshelf proximity from the center aisle', () => {
    const scene = new LibraryScene();

    scene.character.position.set(0, 0, -5.1);

    expect(scene.isNearBookshelf()).toBe(false);
  });
});
