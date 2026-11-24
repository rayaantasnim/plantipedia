/**
 * Centralized reactive-lite client state for Plantipedia multi-page JSON hydration.
 */

const initialMountState = () => ({
  status: "idle", // "idle" | "loading" | "ready" | "error"
  error: null,
});

export const appState = {
  speciesCatalog: [],
  mounts: {},
};

export function setMountState(mountKey, patch) {
  const prev = appState.mounts[mountKey] || initialMountState();
  appState.mounts[mountKey] = {
    ...prev,
    ...patch,
  };
}

export function getMountState(mountKey) {
  return appState.mounts[mountKey] || initialMountState();
}

export function setSpeciesCatalog(speciesList) {
  appState.speciesCatalog = Array.isArray(speciesList) ? speciesList : [];
}

export function getSpeciesCatalog() {
  return appState.speciesCatalog;
}
