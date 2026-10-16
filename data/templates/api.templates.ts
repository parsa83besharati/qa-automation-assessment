/** Reusable API query datasets (Template pattern). */
export class ApiTemplates {
  public static poloBrand(): { expectedBrand: string } {
    return { expectedBrand: 'Polo' };
  }

  public static tshirtsCategory(): { query: string; expectedCategory: string } {
    return { query: 'tshirt', expectedCategory: 'Tshirts' };
  }

  public static searchQueries(): string[] {
    return ['tshirt', 'dress', 'jeans'];
  }

  public static invalidSearchQueries(): Array<{ query: string; label: string }> {
    return [
      { query: '', label: 'empty query' },
      { query: '<script>alert(1)</script>', label: 'xss payload' },
      { query: "' OR '1'='1", label: 'sql-injection probe' },
    ];
  }
}
