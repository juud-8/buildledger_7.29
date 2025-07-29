import { useEffect, useRef } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

interface RealtimeSubscriptionOptions {
  onQuoteInsert?: (payload: any) => void
  onQuoteUpdate?: (payload: any) => void
  onQuoteDelete?: (payload: any) => void
  onInvoiceInsert?: (payload: any) => void
  onInvoiceUpdate?: (payload: any) => void
  onInvoiceDelete?: (payload: any) => void
}

export function useRealtimeSubscriptions(
  user: User | null,
  options: RealtimeSubscriptionOptions = {}
) {
  const supabase = createSupabaseBrowserClient()
  const channelRef = useRef<any>(null)

  useEffect(() => {
    if (!user) {
      return
    }

    // Create a channel for real-time subscriptions
    const channel = supabase.channel('quotes-invoices-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'quotes',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Quote INSERT:', payload)
          options.onQuoteInsert?.(payload)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'quotes',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Quote UPDATE:', payload)
          options.onQuoteUpdate?.(payload)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'quotes',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Quote DELETE:', payload)
          options.onQuoteDelete?.(payload)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'invoices',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Invoice INSERT:', payload)
          options.onInvoiceInsert?.(payload)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'invoices',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Invoice UPDATE:', payload)
          options.onInvoiceUpdate?.(payload)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'invoices',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Invoice DELETE:', payload)
          options.onInvoiceDelete?.(payload)
        }
      )

    // Subscribe to the channel
    channel.subscribe((status) => {
      console.log('Subscription status:', status)
    })

    channelRef.current = channel

    // Cleanup function
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [user, supabase, options])

  return channelRef.current
}