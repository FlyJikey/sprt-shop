'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

// Используем сервисный ключ для обхода RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SUPER_ADMIN_EMAIL = 'sarahmandanil@gmail.com';

// Получить список всех сотрудников
export async function getStaffUsers() {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .in('role', ['admin', 'employee'])
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching staff:', error);
    return [];
  }
  return data;
}

// Назначить роль
export async function assignRole(email: string, role: 'admin' | 'employee') {
  const { data: user, error: findError } = await supabaseAdmin
    .from('profiles')
    .select('id, role')
    .ilike('email', email.trim())
    .single();

  if (findError || !user) {
    return { success: false, message: 'Пользователь не найден. Убедитесь, что Email введен точно.' };
  }

  const { error: updateError } = await supabaseAdmin
    .from('profiles')
    .update({ role: role })
    .eq('id', user.id);

  if (updateError) {
    return { success: false, message: 'Ошибка при обновлении роли.' };
  }

  revalidatePath('/admin/users');
  return { success: true, message: `Роль "${role}" успешно назначена!` };
}

// Снять права
export async function revokeAccess(userId: string) {
  // 1. Сначала проверяем, кого пытаются удалить
  const { data: targetUser } = await supabaseAdmin
    .from('profiles')
    .select('email')
    .eq('id', userId)
    .single();

  // 2. ЗАЩИТА ГЛАВНОГО АДМИНА
  if (targetUser?.email === SUPER_ADMIN_EMAIL) {
    return { success: false, message: 'Этого пользователя нельзя удалить.' };
  }

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ role: 'customer' })
    .eq('id', userId);

  if (error) {
    return { success: false, message: 'Ошибка удаления доступа.' };
  }

  revalidatePath('/admin/users');
  return { success: true, message: 'Доступ закрыт.' };
}