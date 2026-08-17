import { supabase } from '@/lib/supabase'

export type MfaFactor = {
  id: string
  status: 'verified' | 'unverified'
  friendlyName?: string
}

export type MfaEnrollment = {
  factorId: string
  qrCode: string
  secret: string
}

export type AuthenticatorAssuranceLevel = 'aal1' | 'aal2'

export type MfaAssurance = {
  currentLevel: AuthenticatorAssuranceLevel
  nextLevel: AuthenticatorAssuranceLevel
}

/** Nivel de assurance actual y potencial de la sesión. */
export async function getAuthenticatorAssuranceLevel(): Promise<MfaAssurance> {
  const { data, error } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  if (error) throw error
  return {
    currentLevel: (data?.currentLevel ?? 'aal1') as AuthenticatorAssuranceLevel,
    nextLevel: (data?.nextLevel ?? 'aal1') as AuthenticatorAssuranceLevel
  }
}

/** Lista los factores TOTP enrolados del usuario. */
export async function listMfaFactors(): Promise<MfaFactor[]> {
  const { data, error } = await supabase.auth.mfa.listFactors()
  if (error) throw error
  return (data?.totp ?? []).map((f) => ({
    id: f.id,
    status: f.status as 'verified' | 'unverified',
    friendlyName: f.friendly_name
  }))
}

/** Elimina un factor enrolado. */
export async function unenrollMfaFactor(factorId: string): Promise<void> {
  const { error } = await supabase.auth.mfa.unenroll({ factorId })
  if (error) throw error
}

/** Inicia el enrolamiento de un nuevo factor TOTP. */
export async function enrollTotpFactor(
  friendlyName: string
): Promise<MfaEnrollment> {
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName
  })
  if (error) throw error
  return {
    factorId: data.id,
    qrCode: data.totp.qr_code,
    secret: data.totp.secret
  }
}

/** Crea un challenge para un factor y devuelve su id. */
export async function createMfaChallenge(factorId: string): Promise<string> {
  const { data, error } = await supabase.auth.mfa.challenge({ factorId })
  if (error) throw error
  return data.id
}

/** Verifica un challenge con el código TOTP del usuario. */
export async function verifyMfaChallenge(
  factorId: string,
  challengeId: string,
  code: string
): Promise<void> {
  const { error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId,
    code
  })
  if (error) throw error
}
