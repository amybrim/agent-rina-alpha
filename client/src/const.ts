export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Generate login URL at runtime so redirect URI reflects the current origin.
export const getLoginUrl = (returnPath?: string) => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;
  // redirectUri MUST be a clean URL with no query string — the OAuth portal
  // appends ?code=...&state=... to it, so any existing query params break the flow.
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  // Encode the desired post-login destination in the state.
  // The server reads state, decodes it to get redirectUri, then redirects to
  // the next param after completing the token exchange.
  const next = returnPath
    ? `${window.location.origin}${returnPath.startsWith("/") ? returnPath : `/${returnPath}`}`
    : `${window.location.origin}/app`;
  const state = btoa(JSON.stringify({ redirectUri, next }));
  const url = new URL(`${oauthPortalUrl}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");
  return url.toString();
};
