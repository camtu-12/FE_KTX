export type NavAutocompleteSuggestion = {
  id: number;
  full_name: string;
  student_code: string;
  avatar_url: string | null;
  room_number: string | null;
  building_code: string | null;
  faculty: string | null;
  current_year: number | null;
  occupancy_status: string | null;
  occupancy_id: number | null;
  bed_number: string | null;
  check_out_date: string | null;
  registration_id: number | null;
  similarity?: number;
};

export type NavAutocompleteConfig = {
  suggestions: NavAutocompleteSuggestion[];
  isSearching: boolean;
  onSelect: (suggestion: NavAutocompleteSuggestion) => void;
  onDismiss: () => void;
};
