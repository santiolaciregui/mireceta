import React, { useState, useEffect, useRef } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronDown, X, Check } from 'lucide-react';

export interface CustomDatePickerProps {
  value?: string; // Format: YYYY-MM-DD
  onChange: (value: string) => void;
  placeholder?: string;
  minDate?: string; // Format: YYYY-MM-DD
  maxDate?: string; // Format: YYYY-MM-DD
  disabled?: boolean;
  error?: string | boolean;
  label?: string;
  required?: boolean;
  className?: string;
  inputClassName?: string;
  compact?: boolean;
  id?: string;
  name?: string;
  autoFocus?: boolean;
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const MONTH_SHORT_NAMES = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
];

const WEEKDAY_NAMES = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];

/** Helper to parse YYYY-MM-DD safely into year, month (0-indexed), day */
function parseISODate(dateStr?: string): { year: number; month: number; day: number } | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return null;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // 0-indexed
  const day = parseInt(parts[2], 10);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  return { year, month, day };
}

/** Helper to format year, month (0-indexed), day into YYYY-MM-DD */
function formatISODate(year: number, month: number, day: number): string {
  const y = String(year).padStart(4, '0');
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Helper to format YYYY-MM-DD into DD/MM/AAAA */
function formatDisplayDate(dateStr?: string): string {
  const parsed = parseISODate(dateStr);
  if (!parsed) return '';
  const d = String(parsed.day).padStart(2, '0');
  const m = String(parsed.month + 1).padStart(2, '0');
  const y = String(parsed.year).padStart(4, '0');
  return `${d}/${m}/${y}`;
}

export const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
  value = '',
  onChange,
  placeholder = 'DD/MM/AAAA',
  minDate,
  maxDate,
  disabled = false,
  error,
  label,
  required = false,
  className = '',
  inputClassName = '',
  compact = false,
  id,
  name,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'days' | 'months' | 'years'>('days');
  const [typedValue, setTypedValue] = useState(() => formatDisplayDate(value));

  // Calendar navigation state (year & month)
  const today = new Date();
  const parsedVal = parseISODate(value);

  const [navYear, setNavYear] = useState<number>(() => parsedVal?.year || today.getFullYear());
  const [navMonth, setNavMonth] = useState<number>(() => parsedVal?.month ?? today.getMonth());
  const [yearRangeStart, setYearRangeStart] = useState<number>(() => {
    const yr = parsedVal?.year || today.getFullYear();
    return Math.floor(yr / 12) * 12;
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync typed value when external value changes
  useEffect(() => {
    setTypedValue(formatDisplayDate(value));
    if (value) {
      const p = parseISODate(value);
      if (p) {
        setNavYear(p.year);
        setNavMonth(p.month);
      }
    }
  }, [value]);

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setViewMode('days');
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setViewMode('days');
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Helper to validate date limits
  const isDateDisabled = (year: number, month: number, day: number): boolean => {
    const dateIso = formatISODate(year, month, day);
    if (minDate && dateIso < minDate) return true;
    if (maxDate && dateIso > maxDate) return true;
    return false;
  };

  // Helper to get days in current month
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  // Helper for starting day of month (Monday = 0, Sunday = 6)
  const getFirstDayOfMonth = (year: number, month: number) => {
    const day = new Date(year, month, 1).getDay(); // 0 is Sunday
    return day === 0 ? 6 : day - 1; // convert to Monday = 0
  };

  // Handle selecting a specific date
  const handleSelectDay = (day: number) => {
    if (isDateDisabled(navYear, navMonth, day)) return;
    const isoString = formatISODate(navYear, navMonth, day);
    onChange(isoString);
    setTypedValue(formatDisplayDate(isoString));
    setIsOpen(false);
    setViewMode('days');
  };

  // Navigation handlers
  const handlePrevMonth = () => {
    if (navMonth === 0) {
      setNavMonth(11);
      setNavYear(prev => prev - 1);
    } else {
      setNavMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (navMonth === 11) {
      setNavMonth(0);
      setNavYear(prev => prev + 1);
    } else {
      setNavMonth(prev => prev + 1);
    }
  };

  // Quick action: Select today
  const handleSelectToday = () => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();
    const curDay = now.getDate();
    if (isDateDisabled(curYear, curMonth, curDay)) return;
    const isoString = formatISODate(curYear, curMonth, curDay);
    onChange(isoString);
    setTypedValue(formatDisplayDate(isoString));
    setNavYear(curYear);
    setNavMonth(curMonth);
    setIsOpen(false);
    setViewMode('days');
  };

  // Quick action: Clear
  const handleClear = () => {
    onChange('');
    setTypedValue('');
    setIsOpen(false);
    setViewMode('days');
  };

  // Direct typing handler with auto-masking
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/\D/g, ''); // Numbers only
    if (raw.length > 8) raw = raw.slice(0, 8);

    let formatted = '';
    if (raw.length > 0) {
      formatted = raw.slice(0, 2);
      if (raw.length >= 3) {
        formatted += '/' + raw.slice(2, 4);
      }
      if (raw.length >= 5) {
        formatted += '/' + raw.slice(4, 8);
      }
    }

    setTypedValue(formatted);

    // If complete DD/MM/YYYY, validate and trigger onChange
    if (raw.length === 8) {
      const d = parseInt(raw.slice(0, 2), 10);
      const m = parseInt(raw.slice(2, 4), 10) - 1;
      const y = parseInt(raw.slice(4, 8), 10);

      const isValidDate = (
        y >= 1900 && y <= 2100 &&
        m >= 0 && m <= 11 &&
        d >= 1 && d <= getDaysInMonth(y, m)
      );

      if (isValidDate) {
        const iso = formatISODate(y, m, d);
        if (!isDateDisabled(y, m, d)) {
          onChange(iso);
          setNavYear(y);
          setNavMonth(m);
        }
      }
    } else if (raw.length === 0) {
      onChange('');
    }
  };

  // Generate calendar grid
  const daysInMonth = getDaysInMonth(navYear, navMonth);
  const firstDayIndex = getFirstDayOfMonth(navYear, navMonth);
  const prevMonthDays = getDaysInMonth(navYear, navMonth === 0 ? 11 : navMonth - 1);

  const totalGridCells = Math.ceil((firstDayIndex + daysInMonth) / 7) * 7;

  return (
    <div ref={containerRef} className={`relative select-none ${className}`}>
      {label && (
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {/* Input Trigger */}
      <div className="relative flex items-center">
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            if (!disabled) {
              setIsOpen(prev => !prev);
              setViewMode('days');
            }
          }}
          className={`absolute inset-y-0 left-0 pl-3 flex items-center cursor-pointer text-slate-400 hover:text-[#1661E1] transition-colors focus:outline-none ${
            error ? 'text-rose-500' : ''
          }`}
          aria-label="Abrir calendario"
        >
          <CalendarIcon className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
        </button>

        <input
          type="text"
          id={id}
          name={name}
          disabled={disabled}
          value={typedValue}
          onChange={handleInputChange}
          onClick={() => {
            if (!disabled) {
              setIsOpen(true);
            }
          }}
          placeholder={placeholder}
          maxLength={10}
          className={`w-full font-medium transition-all outline-hidden cursor-pointer ${
            compact
              ? 'pl-8 pr-7 py-1 text-xs rounded-lg'
              : 'pl-10 pr-8 py-2.5 text-xs sm:text-sm rounded-xl'
          } ${
            error
              ? 'border-2 border-rose-400 bg-rose-50/40 text-slate-900 focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15'
              : 'bg-white border border-slate-250 text-[#0F172A] focus:border-[#1661E1] focus:ring-2 focus:ring-[#1661E1]/15'
          } ${disabled ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : ''} ${inputClassName}`}
        />

        {value && !disabled && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
            className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
            title="Limpiar fecha"
          >
            <X className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
          </button>
        )}
      </div>

      {/* Calendar Overlay / Dropdown (Unified Mobile Bottom-Sheet & Desktop Popover) */}
      {isOpen && (
        <>
          {/* Mobile backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 sm:hidden transition-opacity"
            onClick={() => {
              setIsOpen(false);
              setViewMode('days');
            }}
          />

          <div
            ref={dropdownRef}
            className={`z-50 bg-white shadow-2xl border border-slate-200 overflow-hidden transition-all duration-200 animate-fadeIn ${
              // Mobile: Fixed bottom sheet or centered card
              'fixed bottom-0 inset-x-0 sm:inset-x-auto sm:bottom-auto rounded-t-3xl sm:rounded-2xl ' +
              // Desktop: Absolute dropdown popover
              'sm:absolute sm:top-full sm:mt-1.5 sm:left-0 sm:w-[320px] sm:shadow-xl sm:border-slate-150'
            }`}
          >
            {/* Header / Mobile drag indicator */}
            <div className="sm:hidden pt-3 pb-1 flex justify-center">
              <div className="w-12 h-1.5 bg-slate-250 rounded-full" />
            </div>

            {/* Calendar Controls Header */}
            <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
              {viewMode === 'days' && (
                <>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setViewMode('months')}
                      className="px-2.5 py-1 rounded-lg text-sm font-bold text-slate-800 hover:bg-slate-200/70 hover:text-[#1661E1] transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      {MONTH_NAMES[navMonth]}
                      <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setYearRangeStart(Math.floor(navYear / 12) * 12);
                        setViewMode('years');
                      }}
                      className="px-2.5 py-1 rounded-lg text-sm font-bold text-slate-800 hover:bg-slate-200/70 hover:text-[#1661E1] transition-colors flex items-center gap-1 cursor-pointer font-mono"
                    >
                      {navYear}
                      <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handlePrevMonth}
                      className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition-colors cursor-pointer"
                      title="Mes anterior"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleNextMonth}
                      className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition-colors cursor-pointer"
                      title="Mes siguiente"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </>
              )}

              {viewMode === 'months' && (
                <div className="w-full flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-800">Seleccionar Mes ({navYear})</span>
                  <button
                    type="button"
                    onClick={() => setViewMode('days')}
                    className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {viewMode === 'years' && (
                <div className="w-full flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setYearRangeStart(prev => prev - 12)}
                      className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 transition-colors cursor-pointer"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="text-sm font-bold text-slate-800 font-mono">
                      {yearRangeStart} - {yearRangeStart + 11}
                    </span>
                    <button
                      type="button"
                      onClick={() => setYearRangeStart(prev => prev + 12)}
                      className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 transition-colors cursor-pointer"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setViewMode('days')}
                    className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Calendar Body */}
            <div className="p-3">
              {/* DAYS VIEW */}
              {viewMode === 'days' && (
                <div>
                  {/* Weekday headers */}
                  <div className="grid grid-cols-7 mb-1.5 text-center">
                    {WEEKDAY_NAMES.map((dayName, idx) => (
                      <span
                        key={idx}
                        className={`text-[11px] font-bold py-1 ${
                          idx >= 5 ? 'text-slate-400' : 'text-slate-500'
                        }`}
                      >
                        {dayName}
                      </span>
                    ))}
                  </div>

                  {/* Day cells */}
                  <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: totalGridCells }).map((_, i) => {
                      const dayNum = i - firstDayIndex + 1;
                      const isCurrentMonth = dayNum > 0 && dayNum <= daysInMonth;

                      if (!isCurrentMonth) {
                        // Previous or next month overflow days (dimmed)
                        const overflowDay = dayNum <= 0 ? prevMonthDays + dayNum : dayNum - daysInMonth;
                        return (
                          <div
                            key={i}
                            className="h-10 sm:h-8 flex items-center justify-center text-xs text-slate-300 pointer-events-none select-none font-mono"
                          >
                            {overflowDay}
                          </div>
                        );
                      }

                      const isSelected =
                        parsedVal?.year === navYear &&
                        parsedVal?.month === navMonth &&
                        parsedVal?.day === dayNum;

                      const isToday =
                        today.getFullYear() === navYear &&
                        today.getMonth() === navMonth &&
                        today.getDate() === dayNum;

                      const disabled = isDateDisabled(navYear, navMonth, dayNum);

                      return (
                        <button
                          key={i}
                          type="button"
                          disabled={disabled}
                          onClick={() => handleSelectDay(dayNum)}
                          className={`h-10 sm:h-8 rounded-lg text-xs font-semibold flex items-center justify-center transition-all cursor-pointer font-mono ${
                            isSelected
                              ? 'bg-[#1661E1] text-white font-bold shadow-md shadow-blue-500/25 ring-2 ring-[#1661E1]/40'
                              : isToday
                              ? 'border border-[#1661E1] text-[#1661E1] font-bold hover:bg-blue-50'
                              : disabled
                              ? 'text-slate-300 bg-slate-50/50 cursor-not-allowed'
                              : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 active:scale-95'
                          }`}
                        >
                          {dayNum}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* MONTHS VIEW */}
              {viewMode === 'months' && (
                <div className="grid grid-cols-3 gap-2 py-2">
                  {MONTH_SHORT_NAMES.map((mName, mIdx) => {
                    const isCurrentMonth = navMonth === mIdx;
                    const isSelected = parsedVal?.year === navYear && parsedVal?.month === mIdx;

                    return (
                      <button
                        key={mIdx}
                        type="button"
                        onClick={() => {
                          setNavMonth(mIdx);
                          setViewMode('days');
                        }}
                        className={`py-3 sm:py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#1661E1] text-white shadow-sm'
                            : isCurrentMonth
                            ? 'border border-[#1661E1] text-[#1661E1] bg-blue-50/40'
                            : 'bg-slate-50 text-slate-700 hover:bg-slate-150 hover:text-slate-900'
                        }`}
                      >
                        {mName}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* YEARS VIEW */}
              {viewMode === 'years' && (
                <div className="grid grid-cols-3 gap-2 py-2 max-h-60 overflow-y-auto pr-1">
                  {Array.from({ length: 12 }).map((_, yIdx) => {
                    const yearNum = yearRangeStart + yIdx;
                    const isCurrentYear = navYear === yearNum;
                    const isSelected = parsedVal?.year === yearNum;

                    return (
                      <button
                        key={yearNum}
                        type="button"
                        onClick={() => {
                          setNavYear(yearNum);
                          setViewMode('months');
                        }}
                        className={`py-3 sm:py-2.5 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#1661E1] text-white shadow-sm'
                            : isCurrentYear
                            ? 'border border-[#1661E1] text-[#1661E1] bg-blue-50/40'
                            : 'bg-slate-50 text-slate-700 hover:bg-slate-150 hover:text-slate-900'
                        }`}
                      >
                        {yearNum}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleSelectToday}
                className="px-3 py-1.5 text-xs font-bold text-[#1661E1] hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
              >
                Hoy
              </button>
              <div className="flex items-center gap-2">
                {value && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
                  >
                    Limpiar
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    setViewMode('days');
                  }}
                  className="px-4 py-1.5 bg-[#1661E1] text-white text-xs font-bold rounded-lg shadow-xs hover:bg-[#124ec2] transition-colors cursor-pointer sm:hidden flex items-center gap-1"
                >
                  <Check className="h-3.5 w-3.5" />
                  Listo
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
