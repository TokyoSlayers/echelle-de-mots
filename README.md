# Échelle de mots

Jeu des doublets, en français. On te donne un mot de départ et un mot au sommet : chaque échelon change **exactement une lettre**, et chaque mot doit exister. Les accents sont ignorés (`tête` = `tete`).

Les défis sont tirés dans un dictionnaire de mots courants (3, 4 ou 5 lettres) et choisis par parcours en largeur : **Nouveau défi** ne propose qu’un couple dont le nombre minimal de pas est déjà connu.

## Lancer en local

```bash
npm install
npm run dev
```

Ouvre [http://127.0.0.1:4317](http://127.0.0.1:4317). Sans l’API, le jeu reste jouable et le classement reste sur cet appareil.

```bash
npm test
npm run lint
npm run build
```

## Comptes et classement en ligne

GitHub Pages ne sert que des fichiers statiques. Si l’adresse ou le mot de passe de la base était dans le site, n’importe qui pourrait le lire dans le navigateur. Ce n’est donc pas le site qui parle à la base.

Le navigateur parle uniquement à une API (Cloudflare Worker, offre gratuite). L’API garde le secret, hash les mots de passe (PBKDF2) et pose un cookie `HttpOnly` que le JavaScript de la page ne peut pas lire. La base est Cloudflare D1, gratuite, accessible seulement depuis ce Worker.

Dans le dépôt, on ne trouve que :

- l’adresse publique de l’API (`VITE_API_URL`), qui n’est pas un secret ;
- le nom de la base, qui ne permet pas de s’y connecter depuis l’extérieur.

Le secret `AUTH_SECRET` se pose avec Wrangler ou dans le tableau Cloudflare. Il ne doit jamais être commité.

### 1. Dépôt GitHub et site

Le dépôt doit être **public** pour que GitHub Pages soit gratuit. Le code du jeu peut être public : il ne contient pas le secret.

Depuis WSL, une fois le projet sur ta machine :

```bash
gh auth login
gh repo create echelle-de-mots --public --source=. --remote=github --push
```

Dans le dépôt GitHub : **Settings → Pages → Build and deployment → GitHub Actions**. Le workflow `.github/workflows/pages.yml` publie le site à chaque push sur `main`.

Adresse prévue : `https://tokyoslayers.github.io/echelle-de-mots/`

### 2. Base gratuite et API

```bash
npx wrangler login
npx wrangler d1 create echelle-de-mots
```

Copie l’`database_id` affiché dans `worker/wrangler.toml` (les deux blocs `d1_databases`). Puis :

```bash
npx wrangler d1 migrations apply echelle-de-mots --remote --env production
npx wrangler secret put AUTH_SECRET --env production
npm run deploy:api
```

`AUTH_SECRET` est une longue chaîne aléatoire. La commande la demande au clavier : elle n’apparaît pas dans le dépôt. Le déploiement affiche une adresse `https://echelle-de-mots-api.<compte>.workers.dev`.

Dans GitHub : **Settings → Secrets and variables → Actions → Variables** (pas Secrets), crée `VITE_API_URL` avec cette adresse, sans slash final, puis relance le workflow. C’est une adresse publique, pas un mot de passe.

En local, copie `worker/.dev.vars.example` vers `worker/.dev.vars`, mets-y un secret de développement, puis :

```bash
npm run dev:api
npm run dev
```

Le site de dev transmet `/api` au Worker sur le port 8787.
