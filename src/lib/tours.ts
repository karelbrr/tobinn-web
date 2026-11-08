import { getCollection, type CollectionEntry } from "astro:content";

export type TourDate = CollectionEntry<"tours">["data"] & {
  isoDate: string;
  locality: string;
  placeName: string;
};

// "29.08.26" -> "2026-08-29"
function toIsoDate(date: string): string {
  const [day, month, year] = date.split(".");
  return `20${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

export async function getTourDates(): Promise<TourDate[]> {
  const tours = await getCollection("tours");

  return tours
    .map(({ data }) => {
      // "Slušovice, Music Club Sud" -> locality "Slušovice", place "Music Club Sud"
      const [locality, ...placeParts] = data.city.split(",").map((part) => part.trim());
      return {
        ...data,
        isoDate: toIsoDate(data.date),
        locality,
        placeName: placeParts.join(", ") || locality,
      };
    })
    .sort((a, b) => a.isoDate.localeCompare(b.isoDate));
}

export function isPastTour(tour: TourDate): boolean {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  return new Date(tour.isoDate) < startOfToday;
}
