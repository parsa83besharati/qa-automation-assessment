import { faker } from '@faker-js/faker';
import { env } from '../../config/env';
import type { SearchQuery } from '../entities/search-query.entity';

/**
 * Fluent builder for Booking search queries (Builder pattern).
 * Defaults come from env.searchDefaults — always dynamic.
 */
export class SearchQueryBuilder {
  private query: SearchQuery;

  private constructor() {
    const defaults = env.searchDefaults;
    this.query = { ...defaults };
  }

  public static create(): SearchQueryBuilder {
    return new SearchQueryBuilder();
  }

  /** The exact Task.pdf happy path (TRY + London + 8 adults + pets + 3rd hotel). */
  public static taskHappyPath(): SearchQueryBuilder {
    const defaults = env.searchDefaults;
    return new SearchQueryBuilder()
      .withCurrency(defaults.currency)
      .withDestination(defaults.destination)
      .withAdults(defaults.adults)
      .withPets(defaults.travellingWithPets)
      .withTargetHotel(defaults.targetHotelIndex);
  }

  public withCurrency(code: string): this {
    this.query.currency = code.toUpperCase();
    return this;
  }

  public withDestination(destination: string): this {
    this.query.destination = destination;
    return this;
  }

  public withAdults(count: number): this {
    this.query.adults = count;
    return this;
  }

  public withPets(enabled: boolean): this {
    this.query.travellingWithPets = enabled;
    return this;
  }

  public withTargetHotel(index: number): this {
    this.query.targetHotelIndex = index;
    return this;
  }

  public withFlexibleMonth(label: string): this {
    this.query.flexibleMonthLabel = label;
    return this;
  }

  public withRandomDestination(): this {
    this.query.destination = faker.location.city();
    return this;
  }

  public build(): SearchQuery {
    return { ...this.query };
  }
}
