import { DiscordSDK } from "@discord/embedded-app-sdk";

const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID;

function isRunningInsideDiscord() {
  const params = new URLSearchParams(window.location.search);
  return params.has("frame_id") && params.has("instance_id");
}

export const discordSdk =
  clientId && isRunningInsideDiscord() ? new DiscordSDK(clientId) : null;

export async function initDiscord() {
  if (!clientId) {
    return { connected: false, reason: "VITE_DISCORD_CLIENT_ID absent" };
  }

  if (!isRunningInsideDiscord()) {
    return { connected: false, reason: "Mode navigateur" };
  }

  if (!discordSdk) {
    return { connected: false, reason: "SDK Discord non initialisé" };
  }

  try {
    await discordSdk.ready();
    return {
      connected: true,
      instanceId: discordSdk.instanceId,
      channelId: discordSdk.channelId,
      guildId: discordSdk.guildId
    };
  } catch (error) {
    console.error("Erreur Discord SDK :", error);
    return { connected: false, reason: "Erreur de connexion Discord" };
  }
}
