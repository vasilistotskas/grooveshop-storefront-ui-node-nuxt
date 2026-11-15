/**
 * 404 unless the store has customer accounts (`useStoreFeature`): every
 * page under `/account`, sign-in and sign-up included, names it first.
 */
export default createFeatureGate('customerAccounts')
