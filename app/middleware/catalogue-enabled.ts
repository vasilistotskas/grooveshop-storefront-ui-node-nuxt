/**
 * Gate for the whole catalogue surface — merchant extra-setting
 * CATALOGUE_ENABLED: the listings, the product pages and search.
 *
 * Distinct from `cart-enabled`, which leaves the catalogue browsable
 * and only removes the buying. A store that publishes its work rather
 * than selling goods needs the catalogue GONE: an engineering
 * contractor quoting per project has a product model (its systems
 * carry real specs, and its own pages compare them) and no shop, so
 * the listing offered "Εξαντλημένο / Μή Διαθέσιμο" against a price of
 * 0,00 € for something that is quoted, not bought.
 *
 * Fails OPEN like every other setting gate — an unreachable settings
 * endpoint must not take the catalogue down for the stores that sell.
 */
export default createSettingGate('CATALOGUE_ENABLED')
