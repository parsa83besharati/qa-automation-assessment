import { env } from '../../config/env';
import { SearchFactory } from '../factories/search.factory';
import type { SearchQuery } from '../entities/search-query.entity';

/** Reusable Booking datasets (Template pattern). */
export class BookingTemplates {
  /** Exact Task.pdf flow — all values resolved dynamically from env. */
  public static taskHappyPath(): SearchQuery {
    const month = env.currentMonth.label;
    return { ...SearchFactory.taskFlow(), flexibleMonthLabel: month };
  }

  public static smoke(): SearchQuery {
    return SearchFactory.singleAdultNoPets();
  }

  public static negative(): SearchQuery[] {
    return [
      SearchFactory.invalidDestination(),
      { ...SearchFactory.taskFlow(), adults: 0 },
      { ...SearchFactory.taskFlow(), currency: 'XXX' },
    ];
  }

  public static edge(): SearchQuery[] {
    return [SearchFactory.maxAdults(), SearchFactory.secondHotel()];
  }
}
