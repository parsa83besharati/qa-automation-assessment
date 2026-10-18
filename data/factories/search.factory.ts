import { env } from '../../config/env';
import { SearchQueryBuilder } from '../builders/search-query.builder';
import type { SearchQuery } from '../entities/search-query.entity';

/**
 * Pre-configured search objects (Factory pattern).
 * Specs ask for intent ("task flow", "single adult") — never raw numbers.
 */
export class SearchFactory {
  public static taskFlow(): SearchQuery {
    return SearchQueryBuilder.taskHappyPath().build();
  }

  public static singleAdultNoPets(): SearchQuery {
    return SearchQueryBuilder.create().withAdults(1).withPets(false).build();
  }

  public static maxAdults(): SearchQuery {
    return SearchQueryBuilder.create().withAdults(30).build();
  }

  public static invalidDestination(): SearchQuery {
    return SearchQueryBuilder.create().withDestination('!!!NoSuchPlace123').build();
  }

  public static secondHotel(): SearchQuery {
    return SearchQueryBuilder.create().withTargetHotel(2).build();
  }

  /** Currency code that does not exist — picker must ignore it gracefully. */
  public static invalidCurrency(): SearchQuery {
    return SearchQueryBuilder.create().withCurrency('XXX').build();
  }

  /** Overlong + emoji destination for robustness probing. */
  public static longDestination(): SearchQuery {
    const base = env.searchDefaults.destination;
    return SearchQueryBuilder.create()
      .withDestination(`${base} ${'x'.repeat(250)} 🌍`)
      .build();
  }

  /** Classic reflected-XSS probe — lives in the data layer, never inline in specs. */
  public static xssProbe(): string {
    return '<script>alert("xss")</script>';
  }

  /** Classic SQL-injection probe — lives in the data layer, never inline in specs. */
  public static sqliProbe(): string {
    return "' OR '1'='1";
  }
}
