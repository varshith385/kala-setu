export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          role: 'buyer' | 'artist' | 'admin'
          name: string | null
          bio: string | null
          profile_image: string | null
          location: string | null
          experience: string | null
          specialties: string[] | null
          phone: string | null
          instagram: string | null
          website: string | null
          verified: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          role?: 'buyer' | 'artist' | 'admin'
          name?: string | null
          bio?: string | null
          profile_image?: string | null
          location?: string | null
          experience?: string | null
          specialties?: string[] | null
          phone?: string | null
          instagram?: string | null
          website?: string | null
          verified?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          role?: 'buyer' | 'artist' | 'admin'
          name?: string | null
          bio?: string | null
          profile_image?: string | null
          location?: string | null
          experience?: string | null
          specialties?: string[] | null
          phone?: string | null
          instagram?: string | null
          website?: string | null
          verified?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      artist_profiles: {
        Row: {
          user_id: string
          display_name: string
          bio: string | null
          profile_image: string | null
          location: string | null
          specialties: string[] | null
          experience: string | null
          social_links: Json | null
          verification_status: 'pending' | 'verified' | 'rejected'
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          display_name: string
          bio?: string | null
          profile_image?: string | null
          location?: string | null
          specialties?: string[] | null
          experience?: string | null
          social_links?: Json | null
          verification_status?: 'pending' | 'verified' | 'rejected'
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          display_name?: string
          bio?: string | null
          profile_image?: string | null
          location?: string | null
          specialties?: string[] | null
          experience?: string | null
          social_links?: Json | null
          verification_status?: 'pending' | 'verified' | 'rejected'
          created_at?: string
          updated_at?: string
        }
      }
      artworks: {
        Row: {
          id: string
          artist_id: string
          title: string
          slug: string
          description: string | null
          price: number
          category: string | null
          medium: string | null
          dimensions: string | null
          year: number | null
          image_url: string
          additional_images: string[] | null
          availability: boolean
          status: 'draft' | 'published' | 'archived'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          artist_id: string
          title: string
          slug: string
          description?: string | null
          price: number
          category?: string | null
          medium?: string | null
          dimensions?: string | null
          year?: number | null
          image_url: string
          additional_images?: string[] | null
          availability?: boolean
          status?: 'draft' | 'published' | 'archived'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          artist_id?: string
          title?: string
          slug?: string
          description?: string | null
          price?: number
          category?: string | null
          medium?: string | null
          dimensions?: string | null
          year?: number | null
          image_url?: string
          additional_images?: string[] | null
          availability?: boolean
          status?: 'draft' | 'published' | 'archived'
          created_at?: string
          updated_at?: string
        }
      }
      wishlists: {
        Row: {
          id: string
          user_id: string
          artwork_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          artwork_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          artwork_id?: string
          created_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          user_id: string | null
          order_ref: string
          total: number
          status: 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled'
          payment_status: 'pending' | 'paid' | 'failed' | 'refunded'
          payment_id: string | null
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          customer_name: string | null
          customer_phone: string | null
          customer_address: string | null
          items: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          order_ref: string
          total: number
          status?: 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled'
          payment_status?: 'pending' | 'paid' | 'failed' | 'refunded'
          payment_id?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          customer_address?: string | null
          items?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          order_ref?: string
          total?: number
          status?: 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled'
          payment_status?: 'pending' | 'paid' | 'failed' | 'refunded'
          payment_id?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          customer_address?: string | null
          items?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          artwork_id: string | null
          artist_id: string | null
          quantity: number
          price_at_purchase: number
          artwork_title: string | null
          artwork_image: string | null
        }
        Insert: {
          id?: string
          order_id: string
          artwork_id?: string | null
          artist_id?: string | null
          quantity?: number
          price_at_purchase: number
          artwork_title?: string | null
          artwork_image?: string | null
        }
        Update: {
          id?: string
          order_id?: string
          artwork_id?: string | null
          artist_id?: string | null
          quantity?: number
          price_at_purchase?: number
          artwork_title?: string | null
          artwork_image?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_checkout_order_atomic: {
        Args: {
          p_user_id: string
          p_order_ref: string
          p_total: number
          p_items_json: Json
          p_payment_id: string
          p_razorpay_order_id: string | null
          p_razorpay_payment_id: string
          p_customer_name: string
          p_customer_phone: string
          p_customer_address: string
          p_order_items: Json
        }
        Returns: Json
      }
      resolve_reconciliation_order_atomic: {
        Args: {
          p_order_id: string
          p_expected_payment_id: string
          p_expected_razorpay_order_id: string | null
          p_expected_total: number
          p_sanitized_items: Json
          p_order_items_payload: Json
        }
        Returns: Json
      }
      rollup_order_status_atomic: {
        Args: {
          p_order_id: string
        }
        Returns: void
      }
      is_admin: {
        Args: Record<string, never>
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

