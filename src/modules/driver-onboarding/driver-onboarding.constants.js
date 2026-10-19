export const DRIVER_STATUS = Object.freeze({
  PENDING: "pending",
  ACTIVE: "active",
  REJECTED: "rejected",
});

export const DOC_STATUS = Object.freeze({
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
});

/** Document types a captain uploads at signup. `aliases` match legacy seeded rows. */
export const DRIVER_DOCUMENT_TYPES = Object.freeze([
  {
    type: "national_id_front",
    name: "National ID (front)",
    nameAr: "الهوية الوطنية (الوجه الأمامي)",
    isRequired: true,
  },
  {
    type: "national_id_back",
    name: "National ID (back)",
    nameAr: "الهوية الوطنية (الوجه الخلفي)",
    isRequired: true,
  },
  {
    type: "driving_license",
    name: "Driving license",
    nameAr: "رخصة القيادة",
    isRequired: true,
    hasExpiryDate: true,
    aliases: ["license"],
  },
  {
    type: "vehicle_registration",
    name: "Vehicle registration",
    nameAr: "استمارة / سنوية السيارة",
    isRequired: true,
  },
  {
    type: "commercial_register",
    name: "Commercial register",
    nameAr: "السجل التجاري",
    isRequired: false,
  },
]);

export const DRIVER_DOCUMENT_TYPE_KEYS = DRIVER_DOCUMENT_TYPES.map((d) => d.type);
