# Discopoly V4 — Menu, OAuth Discord & Lobby multijoueur

Cette mise à jour ajoute le socle réseau de Discopoly.

## Inclus

- connexion Discord sur le web via OAuth2 Authorization Code ;
- connexion dans une Discord Activity via Embedded App SDK ;
- session HTTP signée ;
- création de lobby avec code ;
- lobby automatique par `instanceId` dans Discord ;
- WebSocket temps réel ;
- Durable Object Cloudflare par lobby ;
- host automatique ;
- prêt / pas prêt ;
- sélection de pion avec verrouillage des doublons ;
- reconnexion d'un joueur ;
- transfert du host si l'host se déconnecte ;
- lancement synchronisé vers le plateau 3D.

Le gameplay du plateau reste local dans cette V4. Le lobby, lui, est réellement synchronisé.

## Secrets Cloudflare

Le Worker attend :

- `DISCORD_CLIENT_SECRET`
- `SESSION_SECRET`

Configurer :

```powershell
npx wrangler secret put DISCORD_CLIENT_SECRET
npx wrangler secret put SESSION_SECRET
```

`SESSION_SECRET` peut être une longue chaîne aléatoire.

## OAuth2 Discord

Dans Developer Portal > OAuth2 > Redirects, ajouter :

```text
https://discopoly.lexy-lxt.workers.dev/api/auth/discord/callback
```

Le scope utilisé est `identify`.

Pour l'Activity, le SDK appelle `authorize()` puis envoie le code au Worker.

## Test production

Après déploiement :

1. Ouvrir `https://discopoly.lexy-lxt.workers.dev`.
2. Se connecter avec Discord.
3. Créer un lobby.
4. Copier le code.
5. Ouvrir un autre navigateur/profil avec un autre compte Discord.
6. Rejoindre avec le même code.
7. Tester Ready, pions et Start.

## Test local complet

Le frontend Vite seul (`npm run dev`) ne possède pas le Worker OAuth/WebSocket.
Pour tester frontend + Worker localement :

```powershell
npm run dev:worker
```

Puis ouvrir l'adresse Wrangler affichée (souvent `http://localhost:8787`).

Pour OAuth web local, il faut aussi enregistrer l'URL callback locale exacte dans Discord OAuth2.
Pour le test le plus simple, utiliser la version `workers.dev`.
