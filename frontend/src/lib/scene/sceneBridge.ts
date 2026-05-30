export type SceneName = 'village' | 'library' | 'transitioning';

export interface LibraryInteractionState {
  nearLibrarian: boolean;
  nearBookshelf: boolean;
}

type SceneListener = (scene: SceneName) => void;
type InteractionListener = (state: LibraryInteractionState) => void;

const sceneListeners = new Set<SceneListener>();
const interactionListeners = new Set<InteractionListener>();

let currentScene: SceneName = 'village';
let currentInteraction: LibraryInteractionState = {
  nearLibrarian: false,
  nearBookshelf: false,
};

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

  currentInteraction = state;
  interactionListeners.forEach((listener) => {
    listener(state);
  });
}

export function onLibraryInteractionChange(listener: InteractionListener): () => void {
  listener(currentInteraction);
  interactionListeners.add(listener);
  return () => {
    interactionListeners.delete(listener);
  };
}

export function getSceneSnapshot(): {
  scene: SceneName;
  interaction: LibraryInteractionState;
} {
  return {
    scene: currentScene,
    interaction: currentInteraction,
  };
}
