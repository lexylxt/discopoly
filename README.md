# Discopoly 3D

Prototype 3D d'un jeu de plateau immobilier jouable comme Discord Activity.

## Ce qui est déjà fait
- Plateau 3D complet à 40 cases
- Structure classique : 22 propriétés, 4 transports, 2 services, 4 coins, taxes, Chance/Caisse
- Caméra 3D orbitale
- Plateau éclairé + ombres
- Pions 3D simples et déplacement animé
- Deux dés 3D
- Achat de propriétés et loyers simples
- Passage du Départ
- Aller en prison
- Support du Discord Embedded App SDK
- Mode navigateur sans crash du SDK
- Les 4 images fournies sont dans `public/assets`

## Installation
```powershell
npm install
copy .env.example .env
npm run dev
```

Dans `.env` :
```env
VITE_DISCORD_CLIENT_ID=TON_APPLICATION_ID
```

## Cloudflare Tunnel
Dans un second terminal :
```powershell
cloudflared tunnel --url http://localhost:5173
```

`vite.config.ts` accepte les sous-domaines `.trycloudflare.com`, donc tu n'as plus besoin d'ajouter le nom du tunnel à chaque fois.

## Contrôles 3D
- clic gauche + glisser : rotation
- molette : zoom
- clic droit + glisser : déplacement de la caméra

## Ce qu'il reste avant une vraie partie
Le prototype garde l'état en local. Pour un vrai multijoueur Discord :
1. Authentification Discord
2. récupération des participants
3. backend WebSocket
4. room = `discordSdk.instanceId`
5. dés/règles côté serveur
6. synchronisation de l'état vers tous les joueurs

## Prochaine étape 3D
Les pions actuels sont générés avec des primitives Three.js.
Pour de vrais personnages :
- créer/exporter un modèle `.glb` depuis Blender
- le placer dans `public/models`
- charger le modèle avec `useGLTF` de `@react-three/drei`
- ajouter des animations idle/marche/victoire

La structure actuelle permet d'ajouter ça sans refaire le plateau.
