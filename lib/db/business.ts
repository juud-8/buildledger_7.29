import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"

export async function uploadLogo(file: File, userId: string): Promise<string> {
  const supabase = createSupabaseBrowserClient()
  
  // Generate unique filename
  const fileExt = file.name.split('.').pop()
  const fileName = `${userId}-${Date.now()}.${fileExt}`
  
  // Upload file to Supabase Storage
  const { data, error } = await supabase.storage
    .from('logos')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    })

  if (error) {
    throw new Error(`Failed to upload logo: ${error.message}`)
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('logos')
    .getPublicUrl(fileName)

  return publicUrl
}

export interface Business {
  id: string
  user_id: string
  business_name: string
  email: string
  phone?: string
  address?: string
  tax_id?: string
  default_tax_rate: number
  currency: string
  date_format: string
  logo_url?: string
  created_at: string
  updated_at: string
}

export interface UpsertBusinessInput {
  business_name: string
  email: string
  phone?: string
  address?: string
  tax_id?: string
  default_tax_rate: number
  currency: string
  date_format: string
  logo_url?: string
}

export async function getBusinessForUser(userId: string): Promise<Business | null> {
  const supabase = createSupabaseBrowserClient()
  
  const { data: business, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // No business found for this user
      return null
    }
    throw new Error(`Failed to get business: ${error.message}`)
  }

  return business
}

export async function upsertBusiness(userId: string, data: UpsertBusinessInput): Promise<Business> {
  const supabase = createSupabaseBrowserClient()
  
  // Check if business exists for this user
  const existingBusiness = await getBusinessForUser(userId)
  
  if (existingBusiness) {
    // Update existing business
    const { data: updatedBusiness, error } = await supabase
      .from('businesses')
      .update({
        business_name: data.business_name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        tax_id: data.tax_id,
        default_tax_rate: data.default_tax_rate,
        currency: data.currency,
        date_format: data.date_format,
        logo_url: data.logo_url,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update business: ${error.message}`)
    }

    return updatedBusiness
  } else {
    // Create new business
    const { data: newBusiness, error } = await supabase
      .from('businesses')
      .insert({
        user_id: userId,
        business_name: data.business_name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        tax_id: data.tax_id,
        default_tax_rate: data.default_tax_rate,
        currency: data.currency,
        date_format: data.date_format,
        logo_url: data.logo_url,
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create business: ${error.message}`)
    }

    return newBusiness
  }
}