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
            className="fixed z-[9999] glass p-1.5 overflow-hidden"
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
                            className={`w-full text-left px-5 py-3 text-sm font-black transition-all flex items-center justify-between gap-3 rounded-xl ${isSelected
                                ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-500'
                                : 'text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                        >
                            <span className="truncate">{optLabel}</span>
                            {isSelected && <Check className="w-4 h-4 text-primary-500 shrink-0" />}
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
                className={`w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3.5 px-6 text-left text-sm font-black transition-all flex items-center justify-between gap-3 ${disabled
                    ? 'cursor-not-allowed opacity-50'
                    : 'hover:border-primary-500/50'
                    } ${isOpen
                        ? 'border-primary-500 ring-2 ring-primary-500/20'
                        : ''
                    } ${isPlaceholder
                        ? 'text-slate-400 dark:text-slate-500'
                        : 'text-slate-900 dark:text-white'
                    } ${buttonClassName}`}
            >
                <span className="truncate">{displayLabel}</span>
                <ChevronDown className={`w-4 h-4 text-slate-500 shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {dropdown}
        </div>
    );
};

export default CustomSelect;
