import { supabase } from '@/lib/supabase'
import { getExistingPushSubscription } from '@/lib/push'

export async function savePushSubscription(
  subscription: PushSubscription
): Promise<string> {
  const serialized = subscription.toJSON()
  const p256dh = serialized.keys?.p256dh
  const auth = serialized.keys?.auth

  if (!p256dh || !auth) {
    throw new Error('La suscripción no contiene las claves necesarias.')
  }

  const { data, error } = await supabase.rpc('register_push_subscription', {
    p_endpoint: subscription.endpoint,
    p_p256dh: p256dh,
    p_auth: auth,
    p_expiration_time: subscription.expirationTime,
    p_user_agent: navigator.userAgent
  })

  if (error) throw error
  if (typeof data !== 'string') {
    throw new Error('Supabase no devolvió el identificador de la suscripción.')
  }

  return data
}

export async function removeCurrentPushSubscription(): Promise<void> {
  const subscription = await getExistingPushSubscription()
  if (!subscription) return

  const [deleteResult, unsubscribeResult] = await Promise.allSettled([
    supabase
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', subscription.endpoint),
    subscription.unsubscribe()
  ])

  if (deleteResult.status === 'rejected') throw deleteResult.reason
  if (deleteResult.value.error) throw deleteResult.value.error
  if (unsubscribeResult.status === 'rejected') {
    throw unsubscribeResult.reason
  }
}

export async function sendTestPush(): Promise<{
  sent: number
  revoked: number
  failed: number
}> {
  const { data, error } = await supabase.functions.invoke('send-test-push', {
    body: {}
  })

  if (error) throw error
  return data as { sent: number; revoked: number; failed: number }
}
