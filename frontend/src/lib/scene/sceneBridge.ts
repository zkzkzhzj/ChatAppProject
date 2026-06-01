export type SceneName = 'village' | 'library' | 'transitioning';

export interface LibraryInteractionState {
  nearLibrarian: boolean;
  nearBookshelf: boolean;
}

type SceneListener = (scene: SceneName) => void;
type InteractionListener = (state: LibraryInteractionState) => void;
type LibraryEntryBlockedListener = () => void;

const sceneListeners = new Set<SceneListener>();
const interactionListeners = new Set<InteractionListener>();
const libraryEntryBlockedListeners = new Set<LibraryEntryBlockedListener>();

const initialInteraction: LibraryInteractionState = {
  nearLibrarian: false,
  nearBookshelf: false,
};

let currentScene: SceneName = 'village';
let currentInteraction: LibraryInteractionState = cloneInteractionState(initialInteraction);

function cloneInteractionState(state: LibraryInteractionState): LibraryInteractionState {
  return {
    nearLibrarian: state.nearLibrarian,
    nearBookshelf: state.nearBookshelf,
  };
}

export function emitSceneChange(scene: SceneName): void {
  currentScene = scene;
  sceneListeners.forEach((listener) => {
    listener(scene);
  });
}

export function onSceneChange(listener: SceneListener): () => void {
  listener(currentScene);
  sceneListeners.add(listener);
  return () => {
    sceneListeners.delete(listener);
  };
}

export function emitLibraryInteractionChange(state: LibraryInteractionState): void {
  if (
    currentInteraction.nearLibrarian === state.nearLibrarian &&
    currentInteraction.nearBookshelf === state.nearBookshelf
  ) {
    return;
  }

  currentInteraction = cloneInteractionState(state);
  interactionListeners.forEach((listener) => {
    listener(cloneInteractionState(currentInteraction));
  });
}

export function onLibraryInteractionChange(listener: InteractionListener): () => void {
  listener(cloneInteractionState(currentInteraction));
  interactionListeners.add(listener);
  return () => {
    interactionListeners.delete(listener);
  };
}

export function emitLibraryEntryBlocked(): void {
  libraryEntryBlockedListeners.forEach((listener) => {
    listener();
  });
}

export function onLibraryEntryBlocked(listener: LibraryEntryBlockedListener): () => void {
  libraryEntryBlockedListeners.add(listener);
  return () => {
    libraryEntryBlockedListeners.delete(listener);
  };
}

export function getSceneSnapshot(): {
  scene: SceneName;
  interaction: LibraryInteractionState;
} {
  return {
    scene: currentScene,
    interaction: cloneInteractionState(currentInteraction),
  };
}

export function resetSceneBridgeForTest(): void {
  currentScene = 'village';
  currentInteraction = cloneInteractionState(initialInteraction);
  sceneListeners.clear();
  interactionListeners.clear();
  libraryEntryBlockedListeners.clear();
}
