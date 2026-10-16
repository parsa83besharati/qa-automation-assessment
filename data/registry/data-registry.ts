/**
 * Shared per-test store (Singleton pattern).
 * Fixtures clear it afterEach so tests stay isolated without globals.
 */
class DataRegistry {
  private static instance: DataRegistry | null = null;
  private readonly store = new Map<string, unknown>();

  private constructor() {
    // singleton
  }

  public static getInstance(): DataRegistry {
    if (DataRegistry.instance === null) {
      DataRegistry.instance = new DataRegistry();
    }
    return DataRegistry.instance;
  }

  public set<T>(key: string, value: T): void {
    this.store.set(key, value);
  }

  public get<T>(key: string): T | undefined {
    return this.store.get(key) as T | undefined;
  }

  public clear(): void {
    this.store.clear();
  }
}

export const dataRegistry = DataRegistry.getInstance();
