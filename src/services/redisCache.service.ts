import { createClient } from "redis";
const defaultTtlSeconds = 300;
const listTtlSeconds = 60;
class RedisCacheService {
   private readonly client = process.env.REDIS_URL ?
      createClient({
         url: process.env.REDIS_URL,
         socket: {reconnectStrategy: false}
      }) : undefined;

      private connection: Promise<void> | undefined;
      private disabled = false;

  public get listTtlSeconds() {
    return listTtlSeconds;
  }

  public projectListKey(workspaceId: string, userId: string) {
    return `cache:projects:list:${workspaceId}:${userId}`;
  }

  public taskListKey(workspaceId: string, userId: string, scope: string) {
    return `cache:tasks:list:${workspaceId}:${userId}:${scope}`;
  }

  public async invalidateWorkspaceLists(workspaceId: string): Promise<void> {
    await Promise.all([
      this.deleteByPrefix(`cache:projects:list:${workspaceId}:`),
      this.deleteByPrefix(`cache:tasks:list:${workspaceId}:`),
    ]);
  }

  public async invalidateUserProjectList(workspaceId: string, userId: string): Promise<void> {
    await this.delete(this.projectListKey(workspaceId, userId));
  }

    public constructor(){
        this.client?.on("error", (error: unknown) => {
        const message = error instanceof Error ? error.message : "Unknown Redis error";
        console.warn(`Redis cache error: ${message}`);
       });
      }

      public async get<T>(key: string): Promise<T | undefined> {
    const value = await this.run((client) => client.get(key));
    if (!value) {
      return undefined;
    }

    try {
      return JSON.parse(value) as T;
    } catch {
      await this.delete(key);
      return undefined;
    }
  }

  public async set<T>(key: string, value: T, ttlSeconds = defaultTtlSeconds): Promise<void> {
    await this.run((client) => client.set(key, JSON.stringify(value), { EX: ttlSeconds }));
  }

  public async delete(key: string): Promise<void> {
    await this.run((client) => client.del(key));
  }

  public async deleteByPrefix(prefix: string): Promise<void> {
    await this.run(async (client) => {
      for await (const key of client.scanIterator({ MATCH: `${prefix}*`, COUNT: 100 })) {
        await client.del(key);
      }
    });
  }

private async connect(): Promise<typeof this.client> {
    if (!this.client || this.disabled) {
      return undefined;
    }

    if (!this.connection) {
      this.connection = this.client.connect().then(() => undefined);
    }

    try {
      await this.connection;
      return this.client;
    } catch {
      this.disabled = true;
      return undefined;
    }
  }

  private async run<T>(operation: (client: NonNullable<typeof this.client>) => Promise<T>): Promise<T | undefined> {
    const client = await this.connect();
    if (!client) {
      return undefined;
    }

    try {
      return await operation(client);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown Redis error";
      console.warn(`Redis cache operation failed: ${message}`);
      return undefined;
    }
  }

}

export const redisCacheService = new RedisCacheService();
