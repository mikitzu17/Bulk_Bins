import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';

const CustomSelect = ({ value, onChange, options, placeholder = 'Select...', className = '', buttonClassName = '', disabled = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [dropdownStyle, setDropdownStyle] = useState({});
    const triggerRef = useRef(null);
    const dropdownRef = useRef(null);

    // Calculate position when opening
    const updatePosition = useCallback(() => {
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const spaceAbove = rect.top;

            // Flip if space below is small (< 250px) and there's more space above
            const shouldFlip = spaceBelow < 250 && spaceAbove > spaceBelow;

            setDropdownStyle({
                position: 'fixed',
                left: `${rect.left}px`,
                width: `${rect.width}px`,
                top: shouldFlip ? 'auto' : `${rect.bottom + 8}px`,
                bottom: shouldFlip ? `${window.innerHeight - rect.top + 8}px` : 'auto',
            });
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            updatePosition();
            window.addEventListener('scroll', updatePosition, true);
            window.addEventListener('resize', updatePosition);
            return () => {
                window.removeEventListener('scroll', updatePosition, true);
                window.removeEventListener('resize', updatePosition);
            };
        }
    }, [isOpen, updatePosition]);

    // Close on outside click
    useEffect(() => {
        if (!isOpen) return;
        const handleClick = (e) => {
            if (
                triggerRef.current && !triggerRef.current.contains(e.target) &&
                dropdownRef.current && !dropdownRef.current.contains(e.target)
            ) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [isOpen]);

    // Close on Escape
    useEffect(() => {
        if (!isOpen) return;
        const handleKey = (e) => {
            if (e.key === 'Escape') setIsOpen(false);
        };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [isOpen]);

    const selectedOption = options.find(opt =>
        (typeof opt === 'object' ? opt.value : opt)?.toString() === value?.toString()
    );

    const displayLabel = selectedOption
        ? (typeof selectedOption === 'object' ? selectedOption.label : selectedOption)
        : placeholder;

    const isPlaceholder = !selectedOption;

    const dropdown = isOpen && !disabled ? createPortal(
        <div
            ref={dropdownRef}
            className="fixed z-[9999] bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl shadow-black/10 dark:shadow-black/40 overflow-hidden"
            style={dropdownStyle}
        >
            <div className="max-h-[240px] overflow-y-auto no-scrollbar py-1.5">
                {options.map((opt, i) => {
                    const optValue = typeof opt === 'object' ? opt.value : opt;
                    const optLabel = typeof opt === 'object' ? opt.label : opt;
                    const isSelected = optValue?.toString() === value?.toString();

                    return (
                        <button
                            key={i}
                            type="button"
                            onClick={() => {
                                onChange({ target: { value: optValue } });
                                setIsOpen(false);
                            }}
                            className={`w-full text-left px-5 py-3 text-sm font-semibold transition-all flex items-center justify-between gap-3 ${isSelected
                                ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400'
                                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'
                                }`}
                        >
                            <span className="truncate">{optLabel}</span>
                            {isSelected && <Check className="w-4 h-4 text-violet-500 shrink-0" />}
                        </button>
                    );
                })}
            </div>
        </div>,
        document.body
    ) : null;

    return (
        <div className={`relative ${className}`}>
            <button
                ref={triggerRef}
                type="button"
                disabled={disabled}
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={`w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-2xl py-4 px-6 text-left text-sm font-bold transition-all flex items-center justify-between gap-3 ${disabled
                    ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-900'
                    : 'hover:border-violet-400 dark:hover:border-violet-500/50'
                    } ${isOpen
                        ? 'border-violet-500 dark:border-violet-500 ring-[3px] ring-violet-500/15'
                        : ''
                    } ${isPlaceholder
                        ? 'text-slate-400 dark:text-slate-500'
                        : 'text-slate-900 dark:text-white'
                    } ${buttonClassName}`}
            >
                <span className="truncate">{displayLabel}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {dropdown}
        </div>
    );
};

export default CustomSelect;
