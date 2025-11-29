'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
} from '@/components/ui/pagination';
import { cn } from '@/lib/utils';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import * as React from 'react';
import { Button } from '@/components/ui/button';

type Props = {
  currentPage: number;
  totalPages: number;
};

export function RequestPagination({ currentPage, totalPages }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', page.toString());
    router.push(`?${params.toString()}`);
  };

  const getPageRange = () => {
    const delta = 2;
    const range = [];

    const start = Math.max(2, currentPage - delta);
    const end = Math.min(totalPages - 1, currentPage + delta);

    range.push(1);

    if (start > 2) range.push('...');

    for (let i = start; i <= end; i++) {
      range.push(i);
    }

    if (end < totalPages - 1) range.push('...');

    if (totalPages > 1) range.push(totalPages);

    return range;
  };

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <Button
            aria-label="Go to next page"
            size="default"
            variant={'link'}
            className={cn('cursor-pointer gap-1 px-2.5 sm:pr-2.5', currentPage === 1 ? 'pointer-events-none opacity-50' : '')}
            onClick={() => goToPage(Math.max(currentPage - 1, 1))}
          >
            <ChevronLeftIcon/>
            <span className="hidden sm:block">Poprzednia</span>
          </Button>
        </PaginationItem>

        {getPageRange().map((page, index) =>
          page === '...' ? (
            <PaginationItem key={`ellipsis-${index}`}>
              <PaginationEllipsis/>
            </PaginationItem>
          ) : (
            <PaginationItem key={page}>
              <PaginationLink
                isActive={Number(page) === currentPage}
                onClick={(e) => {
                  e.preventDefault();
                  goToPage(Number(page));
                }}
                href="#"
              >
                {page}
              </PaginationLink>
            </PaginationItem>
          ),
        )}

        <PaginationItem>
          <Button
            aria-label="Go to next page"
            size="default"
            variant={'link'}
            className={cn('cursor-pointer gap-1 px-2.5 sm:pr-2.5', currentPage === totalPages ? 'pointer-events-none opacity-50' : '')}
            onClick={() => goToPage(Math.max(currentPage + 1, 1))}
          >
            <span className="hidden sm:block">Następna</span>
            <ChevronRightIcon/>
          </Button>
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
