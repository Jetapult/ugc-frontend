// Global 401 unauthorized handler
let unauthorizedCallback: (() => void) | null = null;

export const setUnauthorizedHandler = (callback: () => void) => {
  unauthorizedCallback = callback;
};

export const handleUnauthorized = () => {
  if (unauthorizedCallback) {
    unauthorizedCallback();
  }
};

export const clearUnauthorizedHandler = () => {
  unauthorizedCallback = null;
};
