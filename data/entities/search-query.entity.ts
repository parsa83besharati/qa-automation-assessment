/** Booking search input — everything dynamic, no hard-coded values in specs. */
export interface SearchQuery {
  currency: string;
  destination: string;
  adults: number;
  travellingWithPets: boolean;
  targetHotelIndex: number;
  flexibleMonthLabel?: string;
}

export interface HotelSummary {
  index: number;
  title: string;
}
