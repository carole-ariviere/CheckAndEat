# Check&Eat — Instructions projet

## Vue d'ensemble

**Check&Eat** est une webapp qui permet à un utilisateur de photographier ou importer un menu de restaurant, puis de recevoir instantanément une analyse IA des plats en fonction de ses restrictions alimentaires et allergènes personnels.

- **Tagline** : *Mangez en toute sécurité*
- **Cible** : Personnes avec restrictions alimentaires (allergies, régimes, grossesse, intolérances)
- **Format** : Web app responsive (mobile-first), pas d'app native dans le MVP

---

## Fonctionnalités MVP

### 1. Onboarding (4 étapes)
- Étape 1 — Présentation des fonctionnalités
- Étape 2 — Sélection des restrictions (végétalien, végétarien, sans gluten, sans lactose, grossesse)
- Étape 3 — Ajout d'allergènes personnalisés (parmi les 14 majeurs UE + champ libre)
- Étape 4 — Confirmation du profil créé

### 2. Accueil
- Affichage des restrictions actives sous forme de tags colorés
- Deux actions principales : **Appareil photo** (scan temps réel) et **Galerie** (import photo)
- Accès rapide au dernier scan

### 3. Scan de menu
- Accès à la caméra via WebRTC (`getUserMedia`)
- Import depuis la galerie (`<input type="file" accept="image/*">`)
- Compression automatique de l'image avant envoi (WebP, < 1 Mo)
- Affichage de l'état d'analyse en temps réel

### 4. Résultats d'analyse
- Liste de chaque plat détecté avec statut coloré :
  - 🔴 **À éviter** — contient un allergène ou un ingrédient incompatible
  - 🟠 **À vérifier** — risque indirect (contamination croisée, ingrédient ambigu)
  - 🟢 **OK** — compatible avec le profil
- Détail des raisons pour chaque alerte
- Recommandation IA globale (plats les plus sûrs à commander)
- Filtres par statut (tout / à éviter / à vérifier / OK)

### 5. Profil utilisateur
- Gestion des restrictions avec toggles on/off
- Gestion des allergènes personnalisés (ajout / suppression de chips)
- Statistiques (menus scannés, alertes évitées, restrictions actives)

---

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | React (Vite) |
| Styling | Tailwind CSS |
| State management | Zustand |
| Backend / API routes | Next.js API Routes (ou Vercel Functions) |
| Base de données | Supabase (PostgreSQL) |
| Auth | Supabase Auth (email + Google OAuth) |
| IA vision | Anthropic Claude (claude-sonnet-4-5, vision) |
| Stockage images | Cloudflare R2 (ou Supabase Storage) |
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
│  ┌──────────────┐ ┌────────────────────┐    │
│  │ POST         │ │ Auth middleware     │    │
│  │ /api/analyze │ │ Rate limiter        │    │
│  │              │ │ Image compression   │    │
│  │ Prompt       │ │ Redis cache check   │    │
│  │ builder      │ └────────────────────┘    │
│  └──────┬───────┘                           │
└─────────┼───────────────────────────────────┘
          │
┌─────────▼──────────────────────────────────┐
│              SERVICES EXTERNES              │
│  ┌──────────────┐  ┌────────────────────┐  │
│  │ Claude API   │  │ Supabase           │  │
│  │ Vision       │  │ DB + Auth + Storage│  │
│  └──────────────┘  └────────────────────┘  │
│  ┌──────────────┐  ┌────────────────────┐  │
│  │ Upstash Redis│  │ Cloudflare R2      │  │
│  │ Cache        │  │ Images brutes      │  │
│  └──────────────┘  └────────────────────┘  │
└────────────────────────────────────────────┘
```

---

## Flux d'analyse (scan → résultat)

1. **Capture** — L'utilisateur prend une photo ou importe une image
2. **Compression** — Conversion en WebP < 1 Mo côté client (Canvas API)
3. **API call** — `POST /api/analyze` avec l'image (base64) + le profil utilisateur
4. **Cache check** — Vérification Redis (hash de l'image + profil)
5. **Prompt Claude** — Construction du prompt structuré + appel Claude Vision
6. **Parse JSON** — Extraction et validation de la réponse structurée
7. **Affichage** — Rendu des résultats dans l'UI avec statuts et recommandations
8. **Sauvegarde** — Persistance du scan en base (Supabase)

**Temps cible total : < 5 secondes**

---

## Structure du prompt Claude

```
SYSTEM
  Tu es un expert en nutrition et allergènes alimentaires.
  Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour.

USER
  Profil utilisateur :
  - Restrictions : [végétalien, sans gluten, grossesse]
  - Allergènes : [arachides, soja, noix de cajou]

  Analyse l'image du menu ci-joint. Pour chaque plat visible,
  retourne le JSON suivant :

  {
    "restaurant": "string (si visible)",
    "dishes": [
      {
        "name": "string",
        "ingredients_detected": ["string"],
        "status": "avoid" | "check" | "ok",
        "reasons": ["string"],
        "recommendation": "string"
      }
    ],
    "global_recommendation": "string"
  }

  IMAGE : [base64 jpeg/webp]
```

**Paramètres** : `claude-sonnet-4-5`, `max_tokens: 1500`, température `0`
**Coût estimé** : ~$0.02 par scan · ~2 000 tokens input · ~500 tokens output

---

## Modèle de données (Supabase)

```sql
-- Profils utilisateurs
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users,
  name        TEXT,
  restrictions JSONB DEFAULT '[]',   -- ["vegan","gluten_free","pregnancy"]
  allergens   JSONB DEFAULT '[]',    -- ["arachides","soja"]
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Historique des scans
CREATE TABLE scans (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES profiles(id),
  restaurant    TEXT,
  image_url     TEXT,
  result        JSONB,              -- réponse Claude parsée
  alert_count   INT DEFAULT 0,
  scanned_at    TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Design system

| Token | Valeur |
|-------|--------|
| Couleur principale | `#7F77DD` (violet) |
| Accent rose | `#D4537E` |
| Alerte rouge | `#E24B4A` |
| Alerte ambre | `#EF9F27` |
| Fond app | `#EEEDFE` |
| Card | `#F7F5FF` |
| Texte principal | `#26215C` |
| Texte secondaire | `#888780` |
| Police titres | Syne (700/800) |
| Police corps | DM Sans (400/500) |

Les 5 écrans sont déjà designés en HTML statique :
`checkandeat_onboarding.html`, `checkandeat_accueil.html`, `checkandeat_scan.html`, `checkandeat_resultat.html`, `checkandeat_profil.html`

---

## Roadmap

### Phase 1 — Fondations (S1–S4)
- [ ] Setup repo Next.js + Tailwind + Supabase
- [ ] Onboarding 4 étapes + persistance profil (localStorage puis Supabase)
- [ ] Intégration caméra WebRTC + import galerie
- [ ] Route `POST /api/analyze` + intégration Claude Vision
- [ ] Écran résultats fonctionnel
- [ ] Déploiement Vercel

### Phase 2 — Qualité & rétention (S5–S8)
- [ ] Auth utilisateur (Supabase Auth)
- [ ] Historique des scans
- [ ] Cache Redis (réduction coûts API ~60%)
- [ ] Export résultat (screenshot / PDF)
- [ ] Tests E2E (Playwright)

### Phase 3 — Monétisation (S9–S12)
- [ ] Plan Premium (Stripe) — 5 scans/mois gratuits, illimité en premium
- [ ] Analytics (Mixpanel ou PostHog)
- [ ] A/B test onboarding
- [ ] SEO + landing page marketing

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

# Cloudflare R2 (optionnel Phase 1)
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

## Règles de développement

- Toutes les clés API transitent **uniquement par le backend** — jamais exposées côté client
- Les images sont **compressées côté client** avant envoi (WebP, qualité 0.85, max 1280px)
- La réponse Claude est toujours validée avec un **schema JSON** avant affichage
- Le cache Redis est basé sur le hash `SHA256(imageBase64 + JSON.stringify(userProfile))`
- Le rate limiting est fixé à **10 scans / heure / utilisateur** (Redis)
- Les images ne sont **pas stockées en production** si l'utilisateur n'est pas connecté

---

*Dernière mise à jour : avril 2026*
