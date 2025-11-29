'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { DatePicker } from '../buttons/date-picker';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function DateFilterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [dateFrom, setDateFrom] = useState(searchParams.get('dateFrom') ?? '');
  const [dateTo, setDateTo] = useState(searchParams.get('dateTo') ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const params = new URLSearchParams();
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);

    router.push(`/?${params.toString()}`);
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-4">
      <DatePicker value={dateFrom} onChange={setDateFrom} label="Data od" />
      <DatePicker value={dateTo} onChange={setDateTo} label="Data do" />
      <Button type="submit" className="self-end">Filtruj</Button>
      <Button type="button" variant="secondary" className="self-end hover:cursor-pointer" onClick={() => {
        setDateFrom('');
        setDateTo('');
        router.push('/');
      }}>Resetuj</Button>
    </form>
  );
}
