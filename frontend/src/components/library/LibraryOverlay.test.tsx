import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  emitLibraryInteractionChange,
  emitSceneChange,
  getSceneSnapshot,
  type LibraryInteractionState,
  onLibraryInteractionChange,
  onSceneChange,
  resetSceneBridgeForTest,
} from '@/lib/scene/sceneBridge';

describe('sceneBridge', () => {
  beforeEach(() => {
    resetSceneBridgeForTest();
  });

  afterEach(() => {
    resetSceneBridgeForTest();
  });

  it('notifies scene listeners immediately and on change', () => {
    const listener = vi.fn();
    const unsubscribe = onSceneChange(listener);

    expect(listener).toHaveBeenCalledWith('village');

    emitSceneChange('library');

    expect(listener).toHaveBeenLastCalledWith('library');
    expect(getSceneSnapshot().scene).toBe('library');

    unsubscribe();
  });

  it('does not notify scene listeners after unsubscribe', () => {
    const listener = vi.fn();
    const unsubscribe = onSceneChange(listener);

    unsubscribe();
    emitSceneChange('library');

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith('village');
  });

  it('notifies interaction listeners immediately and on change', () => {
    const listener = vi.fn();
    const unsubscribe = onLibraryInteractionChange(listener);

    expect(listener).toHaveBeenCalledWith({ nearLibrarian: false, nearBookshelf: false });

    emitLibraryInteractionChange({ nearLibrarian: true, nearBookshelf: false });

    expect(listener).toHaveBeenLastCalledWith({ nearLibrarian: true, nearBookshelf: false });
    expect(getSceneSnapshot().interaction).toEqual({ nearLibrarian: true, nearBookshelf: false });

    unsubscribe();
  });

  it('does not notify interaction listeners after unsubscribe', () => {
    const listener = vi.fn();
    const unsubscribe = onLibraryInteractionChange(listener);

    unsubscribe();
    emitLibraryInteractionChange({ nearLibrarian: true, nearBookshelf: false });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({ nearLibrarian: false, nearBookshelf: false });
  });

  it('does not notify interaction listeners when state is unchanged', () => {
    const listener = vi.fn();
    const unsubscribe = onLibraryInteractionChange(listener);

    emitLibraryInteractionChange({ nearLibrarian: true, nearBookshelf: false });
    emitLibraryInteractionChange({ nearLibrarian: true, nearBookshelf: false });

    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenLastCalledWith({ nearLibrarian: true, nearBookshelf: false });

    unsubscribe();
  });

  it('protects interaction state from caller mutation', () => {
    let listenerState: LibraryInteractionState | undefined;
    const listener = vi.fn((state: LibraryInteractionState) => {
      listenerState = state;
    });
    const state = { nearLibrarian: true, nearBookshelf: false };

    emitLibraryInteractionChange(state);
    state.nearLibrarian = false;
    getSceneSnapshot().interaction.nearBookshelf = true;
    const unsubscribe = onLibraryInteractionChange(listener);

    expect(getSceneSnapshot().interaction).toEqual({
      nearLibrarian: true,
      nearBookshelf: false,
    });
    expect(listener).toHaveBeenCalledWith({
      nearLibrarian: true,
      nearBookshelf: false,
    });

    expect(listenerState).toBeDefined();
    if (!listenerState) {
      throw new Error('Expected listener state to be captured');
    }

    listenerState.nearLibrarian = false;

    expect(getSceneSnapshot().interaction).toEqual({
      nearLibrarian: true,
      nearBookshelf: false,
    });

    unsubscribe();
  });
});
