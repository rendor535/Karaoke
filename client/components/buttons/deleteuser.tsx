'use client';

import { Button } from '@/components/ui/button';
import axios from '@/lib/utils';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { isAxiosError } from 'axios';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type DeleteButtonProps = {
  userId: number;
};

export default function DeleteButton({ userId }: DeleteButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false); //stan okna
  
  async function handleDelete() {
    try {
      await axios.delete(`api/Users/${userId}`,);
      toast.success('Usunięto użytkownika pomyślnie');
      setTimeout(() => router.refresh(), 1000); // nie działa idk //:(
      setIsOpen(false); //stan okna zmienia sie na zamkniete
    } catch (error) {
      if (isAxiosError(error)) {
        if (isAxiosError(error)) {
          console.log(error);
          toast.error(error.response?.data?.message ?? 'Wystąpił nieznany błąd');
        } else {
          toast.error('Wystąpił błąd połączenia');
        }
      }
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="w-full text-slate-200 bg-red-700 hover:bg-red-300">
          Usuń
        </Button>
      </DialogTrigger>
      <DialogContent className="dark:bg-gray-950">
        <DialogHeader>
          <DialogTitle>Potwierdzenie usunięcia</DialogTitle>
          <DialogDescription>
            Czy na pewno chcesz usunąć tego użytkownika? Tej operacji nie można cofnąć.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex justify-end gap-3 pt-3">
          <DialogClose className="cursor-pointer text-sky-50 bg-slate-800 hover:text-black font-semibold text-xl rounded-md px-3">
            Anuluj
          </DialogClose>
          <Button className="bg-red-600 text-sky-50 hover:bg-red-700 hover:text-black" onClick={handleDelete}>
            Usuń
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}