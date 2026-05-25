import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

/**
 * Decode the state param to extract the post-login redirect destination.
 * Supports two formats:
 *   - New: base64(JSON.stringify({ redirectUri, next }))
 *   - Legacy: base64(redirectUri string)
 */
function getNextFromState(state: string): string {
  try {
    const decoded = Buffer.from(state, "base64").toString("utf8");
    try {
      const parsed = JSON.parse(decoded);
      if (parsed && typeof parsed.next === "string" && parsed.next.startsWith("http")) {
        // Extract just the path+search from the next URL so we redirect to a
        // relative path (avoids open-redirect issues with external URLs).
        const url = new URL(parsed.next);
        return url.pathname + url.search;
      }
    } catch {
      // Fall through — legacy format
    }
  } catch {
    // Ignore decode errors
  }
  return "/app";
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      // Redirect to the post-login destination encoded in state, defaulting to /app
      const next = getNextFromState(state);
      res.redirect(302, next);
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}
