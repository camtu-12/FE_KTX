import type { NavAutocompleteSuggestion } from "../types/navAutocomplete";

const navStatusMeta: Record<string, { label: string; badge: string }> = {
  ACTIVE: { label: "Đang lưu trú", badge: "border border-emerald-200 bg-emerald-50 text-emerald-700" },
  CHECKOUT_REQUESTED: { label: "Yêu cầu thôi ở", badge: "border border-amber-200 bg-amber-50 text-amber-700" },
  CHECKED_OUT: { label: "Đã thôi ở", badge: "border border-slate-200 bg-slate-50 text-slate-600" },
  FORCED_CHECKOUT: { label: "Buộc thôi ở", badge: "border border-rose-200 bg-rose-50 text-rose-700" },
};

function getSimilarityBadgeClassName(similarity: number): string {
  if (similarity >= 85) {
    return "border border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  return "border border-amber-200 bg-amber-50 text-amber-700";
}

type StudentResultListProps = {
  suggestions: NavAutocompleteSuggestion[];
  onSelect: (suggestion: NavAutocompleteSuggestion) => void;
};

export default function StudentResultList({ suggestions, onSelect }: StudentResultListProps) {
  return (
    <>
      {suggestions.map((suggestion) => {
        const statusInfo = suggestion.occupancy_status ? navStatusMeta[suggestion.occupancy_status] : null;
        const initials = suggestion.full_name.charAt(0).toUpperCase();

        return (
          <div
            key={suggestion.id}
            className="group relative flex cursor-pointer items-center gap-3 border-b border-[#f0f4fb] px-3 py-2.5 last:border-0 transition hover:bg-[#f5f9ff]"
            onClick={() => onSelect(suggestion)}
          >
            {suggestion.avatar_url ? (
              <img src={suggestion.avatar_url} alt="" className="h-10 w-10 flex-shrink-0 rounded-full border border-[#d3e0f2] object-cover" />
            ) : (
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#dde9ff]">
                <span className="text-sm font-bold text-[#5573a0]">{initials}</span>
              </div>
            )}

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[#1b3766]">{suggestion.full_name}</p>
              <p className="text-xs text-[#8aa4cc]">{suggestion.student_code}</p>
            </div>

            {suggestion.similarity !== undefined && (
              <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${getSimilarityBadgeClassName(suggestion.similarity)}`}>
                {suggestion.similarity.toFixed(1)}%
              </span>
            )}

            {suggestion.building_code && suggestion.room_number && (
              <span className="flex-shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">
                {suggestion.building_code}{suggestion.room_number}
              </span>
            )}

            {/* Hover tooltip */}
            <div className="pointer-events-none invisible absolute left-[calc(100%+10px)] top-0 z-[60] w-[220px] rounded-2xl border border-[#d3e0f2] bg-white p-4 opacity-0 shadow-[0_16px_40px_rgba(27,56,122,0.18)] transition-all duration-150 group-hover:visible group-hover:opacity-100">
              {suggestion.avatar_url ? (
                <img src={suggestion.avatar_url} alt="" className="mx-auto h-20 w-20 rounded-full border border-[#d3e0f2] object-cover" />
              ) : (
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#dde9ff]">
                  <span className="text-3xl font-bold text-[#5573a0]">{initials}</span>
                </div>
              )}
              <div className="mt-3 space-y-1.5 text-sm">
                <p className="text-center font-bold text-[#1b3766]">{suggestion.full_name}</p>
                {suggestion.faculty && (
                  <p className="text-[#5570a0]">Khoa: <span className="font-semibold text-[#1b3766]">{suggestion.faculty}</span></p>
                )}
                {suggestion.current_year && (
                  <p className="text-[#5570a0]">Năm học: <span className="font-semibold text-[#1b3766]">Năm {suggestion.current_year}</span></p>
                )}
                {statusInfo && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[#5570a0]">Trạng thái:</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${statusInfo.badge}`}>
                      {statusInfo.label}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}
