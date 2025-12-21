import { PriceTierDetail } from "../models/priceTierDetail.js";

async function findPriceTier(filters = {}, limit = 10) {
  const q = { ...filters };
  return PriceTierDetail.find(q).limit(limit).lean();
}

export default { findPriceTier };
