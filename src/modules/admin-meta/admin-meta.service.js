export function getAdminMeta() {
  // Keep this payload stable; frontend can cache it.
  return {
    version: 1,
    statusOptions: {
      productOrders: [
        "NEW",
        "PENDING",
        "ACCEPTED",
        "PICKED_UP",
        "ON_THE_WAY",
        "REJECTED",
        "DELIVERED",
        "CANCELLED",
      ],
      productOrderOffers: ["PENDING", "ACCEPTED", "REJECTED"],
      complaints: ["pending", "resolved", "closed"],
      customerSupports: ["pending", "resolved", "closed"],
      withdrawRequests: [
        { value: 0, labelKey: "withdraw_status.pending" },
        { value: 1, labelKey: "withdraw_status.approved" },
        { value: 2, labelKey: "withdraw_status.rejected" },
      ],
    },
  };
}

