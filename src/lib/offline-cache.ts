export async function clearPrivateOfflineCache(): Promise<void> {
  if (!('caches' in globalThis)) return

  const keys = await caches.keys()
  await Promise.all(
    keys
      .filter((key) => key.startsWith('tuturno-data-'))
      .map((key) => caches.delete(key))
  )
}
