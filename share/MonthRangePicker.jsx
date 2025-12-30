'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Calendar } from 'primereact/calendar';
import { OverlayPanel } from 'primereact/overlaypanel';

/**
 * Custom Month Range Picker component that extends PrimeReact Calendar
 * to support selecting a range of months (start month and end month)
 */
export function MonthRangePicker({ 
  value, 
  onChange, 
  placeholder = "Select month range",
  dateFormat = "mm/yy",
  className = "",
  inputStyle = {},
  showIcon = true,
  iconPos = "left",
  disabled = false
}) {
  const [startMonth, setStartMonth] = useState(null);
  const [endMonth, setEndMonth] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const overlayRef = useRef(null);
  const inputRef = useRef(null);
  const lastPropValueRef = useRef(null); // Track last prop value to detect changes
  const isSyncingFromPropRef = useRef(false); // Flag to prevent onChange during prop sync

  // Helper to compare date arrays
  const areDateArraysEqual = (arr1, arr2) => {
    if (!arr1 && !arr2) return true;
    if (!arr1 || !arr2) return false;
    if (!Array.isArray(arr1) || !Array.isArray(arr2)) return false;
    if (arr1.length !== arr2.length) return false;
    return arr1.every((date, idx) => {
      if (!date && !arr2[idx]) return true;
      if (!date || !arr2[idx]) return false;
      return date.getTime() === arr2[idx].getTime();
    });
  };

  // Initialize from value prop (array of two dates or null)
  useEffect(() => {
    // Only update if value prop actually changed from last prop value
    if (!areDateArraysEqual(value, lastPropValueRef.current)) {
      lastPropValueRef.current = value;
      isSyncingFromPropRef.current = true; // Set flag to prevent onChange
      
      if (value && Array.isArray(value) && value.length === 2) {
        setStartMonth(value[0] || null);
        setEndMonth(value[1] || null);
      } else if (value === null || value === undefined) {
        setStartMonth(null);
        setEndMonth(null);
      }
      
      // Reset flag after state update completes
      setTimeout(() => {
        isSyncingFromPropRef.current = false;
      }, 0);
    }
  }, [value]);

  // Notify parent when range changes (only for user-initiated changes)
  useEffect(() => {
    // Skip onChange if we're syncing from prop or if onChange is not provided
    if (isSyncingFromPropRef.current || !onChange) return;

    let newValue = null;
    if (startMonth && endMonth) {
      // Ensure startMonth is before or equal to endMonth
      const sorted = [startMonth, endMonth].sort((a, b) => a - b);
      newValue = [sorted[0], sorted[1]];
    } else if (startMonth || endMonth) {
      // If only one is selected, use it for both (single month selection)
      const month = startMonth || endMonth;
      newValue = [month, month];
    }

    // Only call onChange if the value is different from current prop value
    if (!areDateArraysEqual(newValue, lastPropValueRef.current)) {
      onChange(newValue);
    }
  }, [startMonth, endMonth, onChange]);

  const handleStartMonthChange = (e) => {
    const newStart = e.value;
    setStartMonth(newStart);
    
    // If endMonth exists and newStart is after endMonth, update endMonth
    if (newStart && endMonth && newStart > endMonth) {
      setEndMonth(newStart);
    }
  };

  const handleEndMonthChange = (e) => {
    const newEnd = e.value;
    setEndMonth(newEnd);
    
    // If startMonth exists and newEnd is before startMonth, update startMonth
    if (newEnd && startMonth && newEnd < startMonth) {
      setStartMonth(newEnd);
    }
  };

  const handleClear = (e) => {
    e.stopPropagation();
    setStartMonth(null);
    setEndMonth(null);
    if (overlayRef.current) {
      overlayRef.current.hide();
    }
  };

  const formatDisplayValue = () => {
    if (!startMonth && !endMonth) return '';
    
    const formatMonth = (date) => {
      if (!date) return '';
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      return `${String(month).padStart(2, '0')}/${String(year).slice(-2)}`;
    };

    if (startMonth && endMonth) {
      const startStr = formatMonth(startMonth);
      const endStr = formatMonth(endMonth);
      
      // If same month, show single month
      if (startMonth.getTime() === endMonth.getTime()) {
        return startStr;
      }
      
      return `${startStr} - ${endStr}`;
    }
    
    return formatMonth(startMonth || endMonth);
  };

  const handleInputClick = (e) => {
    if (disabled) return;
    if (overlayRef.current) {
      overlayRef.current.toggle(e);
      setIsOpen(!isOpen);
    }
  };

  const displayValue = formatDisplayValue();
  const hasValue = startMonth || endMonth;

  return (
    <div className={`month-range-picker ${className}`} style={{ position: 'relative' }}>
      <div 
        ref={inputRef}
        onClick={handleInputClick}
        className="p-inputwrapper"
        style={{ position: 'relative', cursor: disabled ? 'not-allowed' : 'pointer' }}
      >
        <input
          type="text"
          readOnly
          value={displayValue}
          placeholder={placeholder}
          disabled={disabled}
          className="p-inputtext p-component w-full"
          style={{
            padding: '0.5rem 0.75rem',
            paddingRight: hasValue ? '2.5rem' : showIcon ? '2.5rem' : '0.75rem',
            paddingLeft: showIcon && iconPos === 'left' ? '2.5rem' : '0.75rem',
            fontSize: '0.875rem',
            cursor: disabled ? 'not-allowed' : 'pointer',
            ...inputStyle
          }}
        />
        {showIcon && iconPos === 'left' && (
          <i 
            className="pi pi-calendar" 
            style={{
              position: 'absolute',
              left: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#6b7280',
              pointerEvents: 'none'
            }}
          />
        )}
        {hasValue && (
          <button
            type="button"
            onClick={handleClear}
            style={{
              position: 'absolute',
              right: showIcon && iconPos === 'right' ? '2.5rem' : '0.5rem',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '0.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#6b7280',
              borderRadius: '4px',
              transition: 'all 0.2s ease',
              zIndex: 10
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#fee2e2';
              e.currentTarget.style.color = '#dc2626';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = '#6b7280';
            }}
            title="Clear range"
          >
            <i className="pi pi-times" style={{ fontSize: '0.875rem' }}></i>
          </button>
        )}
        {showIcon && iconPos === 'right' && (
          <i 
            className="pi pi-calendar" 
            style={{
              position: 'absolute',
              right: hasValue ? '2.5rem' : '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#6b7280',
              pointerEvents: 'none'
            }}
          />
        )}
      </div>
      
      <OverlayPanel
        ref={overlayRef}
        dismissable
        className="month-range-picker-overlay"
        style={{ width: '500px', padding: '1rem' }}
        onHide={() => setIsOpen(false)}
      >
        <div className="flex flex-col gap-4">
          <div className="text-sm font-semibold text-gray-700 mb-2">
            Select Month Range
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">
                Start Month
              </label>
              <Calendar
                value={startMonth}
                onChange={handleStartMonthChange}
                view="month"
                dateFormat={dateFormat}
                placeholder="Start month"
                showIcon={false}
                className="w-full"
                inputStyle={{ width: '100%', padding: '0.5rem 0.75rem', fontSize: '0.875rem' }}
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">
                End Month
              </label>
              <Calendar
                value={endMonth}
                onChange={handleEndMonthChange}
                view="month"
                dateFormat={dateFormat}
                placeholder="End month"
                showIcon={false}
                className="w-full"
                inputStyle={{ width: '100%', padding: '0.5rem 0.75rem', fontSize: '0.875rem' }}
              />
            </div>
          </div>
          
          {startMonth && endMonth && (
            <div className="text-xs text-gray-500 pt-2 border-t border-gray-200">
              <div className="font-medium mb-1">Selected Range:</div>
              <div>
                {startMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} - {endMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </div>
            </div>
          )}
        </div>
      </OverlayPanel>
    </div>
  );
}

