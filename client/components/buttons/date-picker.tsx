'use client';

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  label?: string;
  value: string; // format: yyyy-MM-dd
  onChange: (value: string) => void;
};

export function DatePicker({ label, value, onChange }: Props) {
  const parsedDate = value ? new Date(value + 'T00:00:00') : undefined;

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label className="text-sm font-medium text-gray-700">{label}</label>
      )}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !parsedDate && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {parsedDate ? format(parsedDate, "dd/MM/yyyy") : "Wybierz datę"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 text-sky-50">
          <Calendar
            mode="single"
            selected={parsedDate}
            onSelect={(date) => {
              if (date) {
                const isoFormatted = format(date, "yyyy-MM-dd");
                onChange(isoFormatted);
              }
            }}
            autoFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
