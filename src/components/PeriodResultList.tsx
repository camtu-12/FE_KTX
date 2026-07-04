import { CalendarRange, GraduationCap } from "lucide-react";
import type { PeriodAutocompleteSuggestion } from "../types/periodAutocomplete";

type PeriodResultListProps = {
  suggestions: PeriodAutocompleteSuggestion[];
  onSelect: (suggestion: PeriodAutocompleteSuggestion) => void;
};

export default function PeriodResultList({ suggestions, onSelect }: PeriodResultListProps) {
  return (
    <>
      {suggestions.map((suggestion) => (
        <div
          key={suggestion.id}
          className="flex cursor-pointer items-center gap-3 border-b border-[#f0f4fb] px-3 py-2.5 last:border-0 transition hover:bg-[#f5f9ff]"
          onClick={() => onSelect(suggestion)}
        >
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#dde9ff] text-[#5573a0]">
            <GraduationCap className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[#1b3766]">
              Học kỳ {suggestion.semester} - Năm học {suggestion.school_year}
            </p>
            <p className="flex items-center gap-1 text-xs text-[#8aa4cc]">
              <CalendarRange className="h-3 w-3 flex-shrink-0" />
              {suggestion.dateRangeLabel}
            </p>
          </div>

          <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${suggestion.statusBadgeClassName}`}>
            {suggestion.statusLabel}
          </span>
        </div>
      ))}
    </>
  );
}
