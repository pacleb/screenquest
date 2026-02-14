// Bridge for imperative toast calls from non-React code (e.g. api.ts interceptors)
type ToastType = 'error' | 'success' | 'info';
type ToastFn = (message: string, type?: ToastType) => void;

let _showToast: ToastFn | null = null;

export function registerToast(fn: ToastFn) {
  _showToast = fn;
}

export function showToast(message: string, type: ToastType = 'error') {
  _showToast?.(message, type);
}
