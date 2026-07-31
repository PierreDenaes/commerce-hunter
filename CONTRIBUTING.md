# Contribuer à CommerceHunter

Merci de votre intérêt ! CommerceHunter est maintenu par [DNADA](https://commercehunter.dnada.cloud) en **best-effort** — les issues et PR sont les bienvenues, sans garantie de délai de réponse.

## Démarrage

```bash
pnpm install
docker compose up -d postgres          # PostgreSQL local (port 5433)
cp .env.example .env                   # puis renseigner au minimum SIRENE_API_TOKEN
pnpm --filter @commercehunter/db exec prisma migrate deploy
pnpm --filter @commercehunter/db exec tsx prisma/seed.ts
pnpm dev
```

Voir le [README](README.md) pour le détail des variables d'environnement (SIRENE est obligatoire pour les scans, le reste est optionnel).

## Avant d'ouvrir une PR

```bash
pnpm build && pnpm lint && pnpm test
```

- Les tests d'intégration (auth, webhook Stripe) nécessitent le PostgreSQL local — ils se désactivent automatiquement sans base.
- Ajoutez un test pour tout correctif de bug.
- TypeScript strict, pas de `any` évitable, messages d'erreur API au format `{ error: string }`.

## Signaler une faille de sécurité

N'ouvrez **pas** d'issue publique : contactez le mainteneur en privé (voir le profil GitHub du dépôt).

## Licence

En contribuant, vous acceptez que votre contribution soit distribuée sous licence [AGPL-3.0](LICENSE).
