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
}
