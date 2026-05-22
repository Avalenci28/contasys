export async function upsertProfile({ supabase, userId, name, email }) {
  if (!userId) return

  // Insert simple (si ya existe, puede fallar). Puedes cambiar a upsert si lo necesitas.
  const { error } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      name,
      email,
    })

  if (error) throw error
}

