import { DiscordSDK } from "@discord/embedded-app-sdk";
import type { SessionUser } from "./lobby";

export const DISCORD_CLIENT_ID =
  import.meta.env.VITE_DISCORD_CLIENT_ID || "1539691461774155776";

export function isRunningInsideDiscord() {
  const params = new URLSearchParams(window.location.search);
  return params.has("frame_id") && params.has("instance_id");
}

export const discordSdk =
  isRunningInsideDiscord() ? new DiscordSDK(DISCORD_CLIENT_ID) : null;

export async function initDiscord() {
  if (!discordSdk) {
    return {
      connected: false as const,
      reason: "Mode navigateur",
      instanceId: null as string | null
    };
  }

  try {
    await discordSdk.ready();

    return {
      connected: true as const,
      instanceId: discordSdk.instanceId ?? null,
      channelId: discordSdk.channelId ?? null,
      guildId: discordSdk.guildId ?? null
    };
  } catch (error) {
    console.error("Erreur Discord SDK :", error);
    return {
      connected: false as const,
      reason: "Erreur de connexion Discord",
      instanceId: null as string | null
    };
  }
}

export async function authenticateActivity(): Promise<SessionUser> {
  if (!discordSdk) throw new Error("Cette page n'est pas ouverte dans Discord.");

  await discordSdk.ready();

  const { code } = await discordSdk.commands.authorize({
    client_id: DISCORD_CLIENT_ID,
    response_type: "code",
    state: "",
    prompt: "none",
    scope: ["identify"]
  });

  const response = await fetch("/api/auth/discord/activity", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code })
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error || "Échec de l'authentification Discord.");
  }

  const data = await response.json();

  await discordSdk.commands.authenticate({
    access_token: data.access_token
  });

  return data.user;
}
