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

  it('detects bookshelf proximity along the filled back wall', () => {
    const scene = new LibraryScene();

    scene.character.position.set(0, 0, -5.1);

    expect(scene.isNearBookshelf()).toBe(true);
  });

  it('renders the librarian as a cohesive owl keeper marker', () => {
    const scene = new LibraryScene();
    const roles: string[] = [];

    scene.scene.traverse((obj) => {
      if (obj.userData.libraryRole) {
        roles.push(String(obj.userData.libraryRole));
      }
    });

    expect(roles).toContain('librarian-owl-keeper');
  });

  it('keeps the character out of furniture and bookshelf collision boxes', () => {
    const scene = new LibraryScene();

    scene.character.position.set(0, 0, -2);
    scene.resolveCollisions();
    expect(scene.character.position.z).toBeGreaterThan(-1.25);

    scene.character.position.set(5.5, 0, -5);
    scene.resolveCollisions();
    expect(scene.character.position.z < -5.45 || scene.character.position.z > -4.35).toBe(true);
  });
});
