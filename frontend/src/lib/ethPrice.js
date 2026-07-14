/* ── ETH to INR Price Utility ──────────────────────────── */

const CACHE_KEY = 'invoicefi_eth_inr_price';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Fallback price if API is down (approximate ETH price in INR)
const FALLBACK_PRICE = 215000;

/**
 * Fetches the current ETH price in INR from CoinGecko.
 * Caches the result for 5 minutes to avoid rate limiting.
 */
export async function fetchEthToInr() {
    try {
        const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
        if (cached.price && cached.timestamp && Date.now() - cached.timestamp < CACHE_DURATION) {
            return cached.price;
        }
    } catch { /* ignore parse errors */ }

    try {
        const res = await fetch(
            'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=inr',
            { signal: AbortSignal.timeout(5000) }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const price = data?.ethereum?.inr;
        if (price && typeof price === 'number') {
            localStorage.setItem(CACHE_KEY, JSON.stringify({ price, timestamp: Date.now() }));
            return price;
        }
    } catch (err) {
        console.warn('ETH price fetch failed, using fallback:', err.message);
    }

    // Try returning last cached price even if expired
    try {
        const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
        if (cached.price) return cached.price;
    } catch { /* ignore */ }

    return FALLBACK_PRICE;
}

/**
 * Converts ETH amount to INR string.
 * @param {number} ethAmount - Amount in ETH
 * @param {number} ethPrice - Price of 1 ETH in INR
 * @returns {string} Formatted INR string like "₹21,500.00"
 */
export function ethToInr(ethAmount, ethPrice) {
    const inrValue = Number(ethAmount || 0) * Number(ethPrice || FALLBACK_PRICE);
    return inrValue;
}

/**
 * Formats a number as INR currency string.
 * @param {number} amount - INR amount
 * @returns {string} like "₹21,500.00"
 */
export function formatInr(amount, decimals = 0) {
    return '₹' + Number(amount || 0).toLocaleString('en-IN', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });
}
