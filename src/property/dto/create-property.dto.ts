export class CreatePropertyDto {
    listingType: string;
    propertyType: string;
    price: number;
    currency?: string;
    isNegotiable?: boolean;
    address: {
      street: string;
      area: string;
      city: string;
      state: string;
      lga: string;
      country: string;
      coordinates: {
        type: string;
        coordinates: [number, number];
      };
    };
    bedrooms: number;
    bathrooms: number;
    toilets: number;
    area: { value: number; unit: string };
    plotSize: { value: number; unit: string };
    yearBuilt: number;
    floors: number;
    furnishing: string;
    flooring: string[];
    listedBy: {
      name: string;
      phone: string;
      role: string;
      agency?: string;
    };
    availability: string;
    images: string[];
    videos: string[];
    floorPlan: string;
    features: {
      interior: string[];
      exterior: string[];
      security: string[];
      amenities: string[];
    };
    locationAdvantages: { name: string; type: string; distance: string }[];
    financialDetails: {
      maintenanceFee: number;
      agencyFee: string;
      paymentPlan: string[];
    };
    legalStatus: {
      ownership: string;
      cOfO: boolean;
      governorConsent: boolean;
    };
    additionalInfo: {
      petPolicy: string;
      targetTenant: string;
      proximityToRoad: string;
    };
  }
  