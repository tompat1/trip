/**
 * TRIP Cruise & Sailing Deals Service
 * Normalizes cruise vendor price comparisons and booking links
 */

export function normalizeCruiseDeals(payload = {}) {
  const currency = payload.currency || "USD";
  const suite = payload.suite_cabin || payload.balcony_cabin || payload.oceanview_cabin || {};
  const vendors = Array.isArray(suite.vendors) ? suite.vendors : (Array.isArray(payload.vendors) ? payload.vendors : []);

  const sortedVendors = [...vendors].sort((a, b) => (a.current_price || a.price || 0) - (b.current_price || b.price || 0));
  const lowestPrice = suite.min_price || (sortedVendors[0] ? (sortedVendors[0].current_price || sortedVendors[0].price) : null);

  return {
    sailingId: payload.sailing_id || null,
    currency,
    lowestPrice,
    formattedLowestPrice: lowestPrice ? formatCurrency(lowestPrice, currency) : "Price on request",
    vendorCount: sortedVendors.length,
    vendors: sortedVendors.map((v, index) => ({
      vendorId: v.vendor_id || index,
      name: v.vendor_name || v.name || "Cruise Partner",
      price: v.current_price || v.price || 0,
      formattedPrice: formatCurrency(v.current_price || v.price || 0, currency),
      dealLink: v.deal_link || v.link || "#",
      isBestDeal: index === 0,
      isFeatured: Boolean(v.is_featured_deal),
    })),
  };
}

function formatCurrency(amount, currency = "USD") {
  if (!amount) return "";
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
  } catch (e) {
    return `$${amount}`;
  }
}
