export const showToast = (message: string) => {
  window.dispatchEvent(new CustomEvent('admin-toast', { detail: message }));
};
