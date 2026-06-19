export type SceneName = 'village' | 'library' | 'transitioning';

export interface LibraryInteractionState {
  nearLibrarian: boolean;
  nearBookshelf: boolean;
}

export interface VillageBoardInteractionState {
  nearDashboard: boolean;
  nearSuggestionBoard: boolean;
}

type SceneListener = (scene: SceneName) => void;
type InteractionListener = (state: LibraryInteractionState) => void;
type VillageBoardInteractionListener = (state: VillageBoardInteractionState) => void;
type LibraryEntryBlockedListener = () => void;

const sceneListeners = new Set<SceneListener>();
const interactionListeners = new Set<InteractionListener>();
const villageBoardInteractionListeners = new Set<VillageBoardInteractionListener>();
const libraryEntryBlockedListeners = new Set<LibraryEntryBlockedListener>();

const initialInteraction: LibraryInteractionState = {
  nearLibrarian: false,
  nearBookshelf: false,
};
const initialVillageBoardInteraction: VillageBoardInteractionState = {
  nearDashboard: false,
  nearSuggestionBoard: false,
};

let currentScene: SceneName = 'village';
let currentInteraction: LibraryInteractionState = cloneInteractionState(initialInteraction);
let currentVillageBoardInteraction: VillageBoardInteractionState =
  cloneVillageBoardInteractionState(initialVillageBoardInteraction);

function cloneInteractionState(state: LibraryInteractionState): LibraryInteractionState {
  return {
    nearLibrarian: state.nearLibrarian,
    nearBookshelf: state.nearBookshelf,
  };
}

function cloneVillageBoardInteractionState(
  state: VillageBoardInteractionState,
): VillageBoardInteractionState {
  return {
    nearDashboard: state.nearDashboard,
    nearSuggestionBoard: state.nearSuggestionBoard,
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

export function emitVillageBoardInteractionChange(state: VillageBoardInteractionState): void {
  if (
    currentVillageBoardInteraction.nearDashboard === state.nearDashboard &&
    currentVillageBoardInteraction.nearSuggestionBoard === state.nearSuggestionBoard
  ) {
    return;
  }

  currentVillageBoardInteraction = cloneVillageBoardInteractionState(state);
  villageBoardInteractionListeners.forEach((listener) => {
    listener(cloneVillageBoardInteractionState(currentVillageBoardInteraction));
  });
}

export function onVillageBoardInteractionChange(
  listener: VillageBoardInteractionListener,
): () => void {
  listener(cloneVillageBoardInteractionState(currentVillageBoardInteraction));
  villageBoardInteractionListeners.add(listener);
  return () => {
    villageBoardInteractionListeners.delete(listener);
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
  villageBoardInteraction: VillageBoardInteractionState;
} {
  return {
    scene: currentScene,
    interaction: cloneInteractionState(currentInteraction),
    villageBoardInteraction: cloneVillageBoardInteractionState(currentVillageBoardInteraction),
  };
}

export function resetSceneBridgeForTest(): void {
  currentScene = 'village';
  currentInteraction = cloneInteractionState(initialInteraction);
  currentVillageBoardInteraction = cloneVillageBoardInteractionState(
    initialVillageBoardInteraction,
  );
  sceneListeners.clear();
  interactionListeners.clear();
  villageBoardInteractionListeners.clear();
  libraryEntryBlockedListeners.clear();
}
