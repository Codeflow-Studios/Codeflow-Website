export function isTestEnvironmentHost(hostname: string) {
  return hostname.endsWith('.dev') || hostname.includes('-staging.up.railway.app');
}

export function marketingBrandStorageKey(hostname: string) {
  return isTestEnvironmentHost(hostname)
    ? 'codeflow-marketing-brand-staging'
    : 'codeflow-marketing-brand';
}
