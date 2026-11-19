# Échelle de mots

Jeu des doublets, en français. On te donne un mot de départ et un mot au sommet : chaque échelon change **exactement une lettre**, et chaque mot doit exister. Les accents sont ignorés (`tête` = `tete`).

Les défis sont tirés dans un dictionnaire de mots courants (3, 4 ou 5 lettres) et choisis par parcours en largeur : **Nouveau défi** ne propose qu’un couple dont le nombre minimal de pas est déjà connu.

## Lancer

```bash
npm install
npm run dev
```

Ouvre [http://127.0.0.1:4317](http://127.0.0.1:4317).

```bash
npm test        # défis solvables, validation, score
npm run lint
npm run build
npm run preview
```

## Jouer

- **Facile** : 3 ou 4 pas. **Moyen** : 5 ou 6. **Difficile** : 8 à 10.
- Écris le mot suivant et **Grimper**. Une lettre fausse fait trembler le champ.
- **Annuler** retire le dernier échelon. **Indice** révèle le prochain mot d’un chemin optimal (des points en moins, une seule fois par échelon). **Abandonner** montre une solution optimale.
- Le score mêle la difficulté, l’écart au minimum, le temps et les indices. Il est gardé dans le navigateur (`localStorage`), avec les stats : parties, victoires, série.

Le tableau des scores affiche le top 10 : pseudo, score, pas, temps, difficulté, date.
