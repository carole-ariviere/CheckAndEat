import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createHash } from 'crypto'
import type { UserProfile, AnalysisResult } from '@/lib/types'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const RESTRICTION_LABELS: Record<string, string> = {
  vegan: 'végétalien (pas de produits animaux)',
  vegetarian: 'végétarien (pas de viande ni poisson)',
  gluten_free: 'intolérant au gluten (maladie cœliaque)',
  lactose_free: 'intolérant au lactose',
  pregnancy: 'femme enceinte (éviter poissons crus, fromages à pâte molle, alcool, charcuterie)',
}

function buildSystemPrompt(): string {
  return `Tu es un expert en nutrition, allergènes alimentaires et sécurité alimentaire.
Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, sans balises markdown.
Analyse les plats du menu visible sur l'image et évalue leur compatibilité avec le profil alimentaire fourni.`
}

function buildUserPrompt(profile: UserProfile): string {
  const restrictions = profile.restrictions.map((r) => RESTRICTION_LABELS[r] ?? r)
  const allergens = profile.allergens

  return `Profil utilisateur :
- Restrictions : ${restrictions.length > 0 ? restrictions.join(', ') : 'aucune'}
- Allergènes : ${allergens.length > 0 ? allergens.join(', ') : 'aucun'}

Analyse l'image du menu ci-joint. Pour chaque plat visible, retourne EXACTEMENT ce JSON :

{
  "restaurant": "string (nom du restaurant si visible, sinon chaîne vide)",
  "dishes": [
    {
      "name": "string (nom du plat)",
      "ingredients_detected": ["string"],
      "status": "avoid" | "check" | "ok",
      "reasons": ["string (raison précise)"],
      "recommendation": "string (conseil pratique)"
    }
  ],
  "global_recommendation": "string (conseil général sur les plats les plus sûrs à commander)"
}

Règles de statut :
- "avoid" : contient un allergène connu ou ingrédient incompatible avec les restrictions
- "check" : risque indirect possible (contamination croisée, ingrédient ambigu ou non précisé)
- "ok" : compatible avec le profil alimentaire`
}

function validateResult(data: unknown): AnalysisResult {
  if (typeof data !== 'object' || data === null) throw new Error('Format JSON invalide')
  const d = data as Record<string, unknown>
  if (!Array.isArray(d.dishes)) throw new Error('Champ dishes manquant')
  return {
    restaurant: typeof d.restaurant === 'string' ? d.restaurant : '',
    global_recommendation: typeof d.global_recommendation === 'string' ? d.global_recommendation : '',
    dishes: d.dishes.map((dish: unknown) => {
      const x = dish as Record<string, unknown>
      return {
        name: String(x.name ?? ''),
        ingredients_detected: Array.isArray(x.ingredients_detected)
          ? x.ingredients_detected.map(String)
          : [],
        status: ['avoid', 'check', 'ok'].includes(x.status as string)
          ? (x.status as 'avoid' | 'check' | 'ok')
          : 'check',
        reasons: Array.isArray(x.reasons) ? x.reasons.map(String) : [],
        recommendation: String(x.recommendation ?? ''),
      }
    }),
  }
}

async function checkCache(key: string): Promise<AnalysisResult | null> {
  if (!process.env.UPSTASH_REDIS_REST_URL) return null
  try {
    const { Redis } = await import('@upstash/redis')
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
    const cached = await redis.get<AnalysisResult>(key)
    return cached ?? null
  } catch {
    return null
  }
}

async function setCache(key: string, value: AnalysisResult): Promise<void> {
  if (!process.env.UPSTASH_REDIS_REST_URL) return
  try {
    const { Redis } = await import('@upstash/redis')
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
    await redis.set(key, value, { ex: 3600 })
  } catch {
    // Cache failure is non-blocking
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { image, profile } = body as { image: string; profile: UserProfile }

    if (!image) return NextResponse.json({ error: 'Image manquante' }, { status: 400 })

    const cacheKey = createHash('sha256')
      .update(image.slice(0, 100) + JSON.stringify(profile))
      .digest('hex')

    const cached = await checkCache(cacheKey)
    if (cached) return NextResponse.json(cached)

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1500,
      temperature: 0,
      system: buildSystemPrompt(),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: 'image/webp', data: image },
            },
            { type: 'text', text: buildUserPrompt(profile) },
          ],
        },
      ],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed = JSON.parse(cleaned)
    const result = validateResult(parsed)

    await setCache(cacheKey, result)

    return NextResponse.json(result)
  } catch (err) {
    console.error('[analyze]', err)
    const message = err instanceof Error ? err.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
