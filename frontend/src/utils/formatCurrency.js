/**
 * Format a number into Indian currency notation.
 * - Values >= 1 Crore  → "1.2Cr"
 * - Values >= 1 Lakh   → "1.5L"
 * - Values >= 1000     → "12.3K"
 * - Smaller values     → "999"
 *
 * Negative values are prefixed with a minus sign.
 * Pass `prefix = '₹'` (default) to prepend the rupee symbol.
 */
export function formatINR(value, prefix = '₹') {
    if (value == null || isNaN(value)) return `${prefix}0`;

    const abs = Math.abs(value);
    const sign = value < 0 ? '-' : '';

    let formatted;
    if (abs >= 1_00_00_000) {
        // Crores (1,00,00,000+)
        const cr = abs / 1_00_00_000;
        formatted = cr >= 100 ? `${Math.round(cr)}Cr` : `${parseFloat(cr.toFixed(1))}Cr`;
    } else if (abs >= 1_00_000) {
        // Lakhs (1,00,000+)
        const l = abs / 1_00_000;
        formatted = l >= 100 ? `${Math.round(l)}L` : `${parseFloat(l.toFixed(1))}L`;
    } else if (abs >= 1_000) {
        // Thousands
        const k = abs / 1_000;
        formatted = k >= 100 ? `${Math.round(k)}K` : `${parseFloat(k.toFixed(1))}K`;
    } else {
        formatted = abs.toLocaleString('en-IN');
    }

    return `${sign}${prefix}${formatted}`;
}

/**
 * Shorter variant – no prefix, useful inside template literals
 * where ₹ is already present in the JSX.
 */
export function formatNum(value) {
    return formatINR(value, '');
}
