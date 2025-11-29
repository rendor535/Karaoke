'use client';

import axios from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { isAxiosError } from 'axios';
import { useRouter } from 'next/navigation';

export function LogoutButton() {
  const router = useRouter();

  async function logout() {
    try {
      await axios.post('auth/logout');
      toast.success('Wylogowano pomyślnie');
      setTimeout(() => router.push('/login'), 1000);
    } catch (error) {
      if (isAxiosError(error)) {
        if (isAxiosError(error)) {
          toast.error(error.response?.data?.message ?? 'Wystąpił nieznany błąd');
        } else {
          toast.error('Wystąpił błąd połączenia');
        }
      }
    }
  }

  return <Button onClick={logout} className="w-full">Wyloguj się</Button>;
}