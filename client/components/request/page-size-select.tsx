'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type Props = {
  defaultValue: number;
  options?: number[];
};

export function PageSizeSelect({ defaultValue, options = [5, 10, 15] }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('pageSize', value);
    params.set('page', '1');
    router.push(`?${params.toString()}`);
  };

  return (
    <Select defaultValue={defaultValue.toString()} onValueChange={handleChange}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Liczba na stronę" />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt} value={opt.toString()}>
            {opt}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
