export type PeriodAutocompleteSuggestion = {
  id: number;
  school_year: string;
  semester: string;
  statusLabel: string;
  statusBadgeClassName: string;
  dateRangeLabel: string;
};

export type PeriodAutocompleteConfig = {
  suggestions: PeriodAutocompleteSuggestion[];
  isSearching: boolean;
  onSelect: (suggestion: PeriodAutocompleteSuggestion) => void;
  onDismiss: () => void;
};
