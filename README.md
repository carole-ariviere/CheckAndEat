# Check&Eat 🍽️

> **Mangez en toute sécurité**

Check&Eat est une webapp qui permet de photographier ou importer un menu de restaurant et de recevoir instantanément une analyse IA des plats en fonction de ses restrictions alimentaires et allergènes personnels.

**Cible** : Personnes avec restrictions alimentaires (allergies, régimes, grossesse, intolérances)  
**Format** : Web app responsive (mobile-first)

---

## Fonctionnalités MVP

### Onboarding (4 étapes)
1. Présentation des fonctionnalités
2. Sélection des restrictions (végétalien, végétarien, sans gluten, sans lactose, grossesse)
3. Ajout d'allergènes personnalisés (14 majeurs UE + champ libre)
4. Confirmation du profil créé

### Accueil
- Affichage des restrictions actives sous forme de tags colorés
- Scan via appareil photo (WebRTC) ou import depuis la galerie
- Accès rapide au dernier scan

### Résultats d'analyse
- 🔴 **À éviter** — contient un allergène ou ingrédient incompatible
- 🟠 **À vérifier** — risque indirect (contamination croisée, ingrédient ambigu)
- 🟢 **OK** — compatible avec le profil
- Recommandation IA globale + filtres par statut

### Profil utilisateur
- Gestion des restrictions avec toggles on/off
- Gestion des allergènes (ajout / suppression)
- Statistiques (menus scannés, alertes évitées)

---

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | React (Vite) |
| Styling | Tailwind CSS |
| State management | Zustand |
| Backend | Next.js API Routes (Vercel Functions) |
| Base de données | Supabase (PostgreSQL) |
| Auth | Supabase Auth (email + Google OAuth) |
| IA vision | Anthropic Claude (Vision) |
| Stockage images | Cloudflare R2 / Supabase Storage |
| Cache | Upstash Redis |
| Déploiement | Vercel |
| Paiement (Phase 3) | Stripe |

---

## Architecture

```
┌─────────────────────────────────────────────┐
│                   CLIENT                    │
│  React · Zustand · Tailwind                 │
│  ┌──────────┐ ┌──────────┐ ┌─────────────┐ │
│  │ Camera   │ │ Profile  │ │  Results    │ │
│  │ WebRTC   │ │ & onbrd. │ │  UI         │ │
│  └──────────┘ └──────────┘ └─────────────┘ │
└─────────────────────┬───────────────────────┘
                      │ HTTPS
┌─────────────────────▼───────────────────────┐
│                   BACKEND                   │
│  Next.js API Routes (Vercel Edge)           │
│  POST /api/analyze · Auth · Rate limiter    │
│  Prompt builder · Redis cache check         │
└─────────────────────┬───────────────────────┘
                      │
┌─────────────────────▼───────────────────────┐
│              SERVICES EXTERNES              │
│  Claude API Vision  ·  Supabase DB + Auth   │
│  Upstash Redis      ·  Cloudflare R2        │
└─────────────────────────────────────────────┘
```

---

## Flux d'analyse (scan → résultat, < 5 secondes)

1. **Capture** — photo ou import image
2. **Compression** — WebP < 1 Mo (Canvas API côté client)
3. **API call** — `POST /api/analyze` (image base64 + profil utilisateur)
4. **Cache check** — Redis (`SHA256(image + profil)`)
5. **Prompt Claude** — appel Claude Vision avec prompt structuré
6. **Parse JSON** — validation de la réponse
7. **Affichage** — résultats avec statuts et recommandations
8. **Sauvegarde** — persistance en base (Supabase)

---

## Modèle de données

```sql
CREATE TABLE profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users,
  name         TEXT,
  restrictions JSONB DEFAULT '[]',
  allergens    JSONB DEFAULT '[]',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE scans (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES profiles(id),
  restaurant  TEXT,
  image_url   TEXT,
  result      JSONB,
  alert_count INT DEFAULT 0,
  scanned_at  TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Variables d'environnement

```env
# Anthropic
ANTHROPIC_API_KEY=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Upstash Redis
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Cloudflare R2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=

# Stripe (Phase 3)
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
```

---

## Roadmap

### Phase 1 — Fondations
- [ ] Setup repo Next.js + Tailwind + Supabase
- [ ] Onboarding 4 étapes + persistance profil
- [ ] Intégration caméra WebRTC + import galerie
- [ ] Route `POST /api/analyze` + intégration Claude Vision
- [ ] Écran résultats fonctionnel
- [ ] Déploiement Vercel

### Phase 2 — Qualité & rétention
- [ ] Auth utilisateur (Supabase Auth)
- [ ] Historique des scans
- [ ] Cache Redis (réduction coûts API ~60%)
- [ ] Export résultat (screenshot / PDF)
- [ ] Tests E2E (Playwright)

### Phase 3 — Monétisation
- [ ] Plan Premium (Stripe) — 5 scans/mois gratuits, illimité en premium
- [ ] Analytics (Mixpanel ou PostHog)
- [ ] A/B test onboarding
- [ ] SEO + landing page marketing

---

## Règles de développement

- Les clés API transitent **uniquement par le backend** — jamais exposées côté client
- Les images sont **compressées côté client** avant envoi (WebP, qualité 0.85, max 1280px)
- La réponse Claude est toujours validée avec un **schema JSON** avant affichage
- Rate limiting : **10 scans / heure / utilisateur** (Redis)
- Les images ne sont **pas stockées** si l'utilisateur n'est pas connecté

---

*Dernière mise à jour : avril 2026*
