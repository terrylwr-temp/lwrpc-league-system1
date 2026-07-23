let dialogApi = null;

export function registerAppDialogApi(api) {
  dialogApi = api;
  return () => {
    if (dialogApi === api) dialogApi = null;
  };
}

export function appConfirm(messageOrOptions, options) {
  if (dialogApi) return dialogApi.confirm(messageOrOptions, options);
  const message = typeof messageOrOptions === "string" ? messageOrOptions : messageOrOptions?.message || "";
  return Promise.resolve(window.confirm(message));
}

export function appPrompt(messageOrOptions, options) {
  if (dialogApi) return dialogApi.prompt(messageOrOptions, options);
  const message = typeof messageOrOptions === "string" ? messageOrOptions : messageOrOptions?.message || "";
  return Promise.resolve(window.prompt(message));
}
