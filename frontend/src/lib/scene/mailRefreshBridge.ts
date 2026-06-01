type MailRefreshListener = () => void;

const mailRefreshListeners = new Set<MailRefreshListener>();

export function emitMailRefreshRequested(): void {
  mailRefreshListeners.forEach((listener) => {
    listener();
  });
}

export function onMailRefreshRequested(listener: MailRefreshListener): () => void {
  mailRefreshListeners.add(listener);
  return () => {
    mailRefreshListeners.delete(listener);
  };
}

export function resetMailRefreshBridgeForTest(): void {
  mailRefreshListeners.clear();
}
