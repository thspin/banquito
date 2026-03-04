import React, { useState, useEffect } from 'react';

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
    value?: number | string;
    onChangeValue?: (value: number) => void;
    currencyPrefix?: string;
}

export function CurrencyInput({ value, onChangeValue, currencyPrefix = '$', className, name, ...props }: CurrencyInputProps) {
    const [displayValue, setDisplayValue] = useState<string>('');
    const [internalNum, setInternalNum] = useState<number | ''>('');

    useEffect(() => {
        if (value !== undefined && value !== null && value !== '') {
            const numValue = typeof value === 'string' ? parseFloat(value) : value;
            if (!isNaN(numValue)) {
                setInternalNum(numValue);
                const formatted = new Intl.NumberFormat('es-AR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                }).format(numValue);
                setDisplayValue(formatted);
            }
        } else {
            setInternalNum('');
            setDisplayValue('');
        }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value;

        // Allow only digits and commas
        val = val.replace(/[^\d,]/g, '');

        // Allow only one comma
        const parts = val.split(',');
        if (parts.length > 2) {
            val = parts[0] + ',' + parts.slice(1).join('');
        }

        // Limit to 2 decimal places
        if (parts.length === 2 && parts[1].length > 2) {
            val = parts[0] + ',' + parts[1].substring(0, 2);
        }

        setDisplayValue(val);

        const numStr = val.replace(/\./g, '').replace(',', '.');
        const num = parseFloat(numStr);

        if (!isNaN(num)) {
            setInternalNum(num);
            if (onChangeValue) onChangeValue(num);
        } else {
            setInternalNum('');
        }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        let valStr = displayValue.replace(/\./g, '').replace(',', '.');
        let num = parseFloat(valStr);

        if (!isNaN(num)) {
            const formatted = new Intl.NumberFormat('es-AR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            }).format(num);
            setDisplayValue(formatted);
            setInternalNum(num);
            if (onChangeValue) onChangeValue(num);
        } else if (displayValue === '') {
            setDisplayValue('');
            setInternalNum('');
            if (onChangeValue) onChangeValue(0);
        }

        if (props.onBlur) props.onBlur(e);
    };

    return (
        <div className="relative w-full">
            {currencyPrefix && (
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm pointer-events-none">
                    {currencyPrefix}
                </span>
            )}
            <input
                type="text"
                className={`${className} ${currencyPrefix ? 'pl-8' : ''}`}
                value={displayValue}
                onChange={handleChange}
                onBlur={handleBlur}
                {...props}
            />
            <input
                type="hidden"
                name={name}
                value={internalNum !== '' ? internalNum : ''}
            />
        </div>
    );
}
