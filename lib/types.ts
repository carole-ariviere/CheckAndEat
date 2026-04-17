export type Restriction = 'vegan' | 'vegetarian' | 'gluten_free' | 'lactose_free' | 'pregnancy'

export type DishStatus = 'avoid' | 'check' | 'ok'

export interface Dish {
  name: string
  ingredients_detected: string[]
  status: DishStatus
  reasons: string[]
  recommendation: string
}

export interface AnalysisResult {
  restaurant: string
  dishes: Dish[]
  global_recommendation: string
}

export interface UserProfile {
  restrictions: Restriction[]
  allergens: string[]
}

export interface Scan {
  id: string
  user_id: string
  restaurant: string
  image_url: string
  result: AnalysisResult
  alert_count: number
  scanned_at: string
}
