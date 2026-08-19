# Discopoly V5 — ordre de jeu + gameplay serveur

## Ce que cette version corrige

Avant, le lobby était synchronisé mais le plateau était local à chaque navigateur.
Donc Lexy pouvait piloter les deux pions depuis son écran, tandis que Dash avait sa propre copie de l'état.

V5 déplace les actions importantes dans le Durable Object :
- détermination de l'ordre avec deux dés ;
- tour courant ;
- lancer de dés ;
- déplacement ;
- passage Départ ;
- taxes ;
- aller en prison ;
- achat ;
- loyer simple ;
- fin du tour.

Le serveur vérifie l'identité de l'utilisateur avant toute action.

## Ordre de jeu

Après que tous les joueurs sont prêts, l'host clique "Déterminer l'ordre".
Chaque joueur doit cliquer lui-même "Lancer pour l'ordre".
Quand tout le monde a lancé, le serveur trie les joueurs par total décroissant.
En cas d'égalité exacte, un petit tie-break aléatoire côté serveur départage les joueurs.

## Test attendu

Lexy + Dash :
1. tous les deux Ready ;
2. host démarre l'ordre ;
3. Lexy lance ses dés d'ordre ;
4. Dash lance ses dés d'ordre ;
5. le plateau s'ouvre pour les deux ;
6. seul le joueur courant a ses boutons actifs ;
7. après "Fin du tour", l'autre joueur peut jouer ;
8. les deux écrans voient le même argent, les mêmes positions et les mêmes propriétés.
