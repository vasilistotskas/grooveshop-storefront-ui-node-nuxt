---
name: Cache warming cron was hardcoded — fixed with SchedulerRegistry
description: The @Cron(EVERY_6_HOURS) decorator in CacheWarmingService ignored the configured CACHE_WARMING_CRON env var — replaced with dynamic SchedulerRegistry registration
type: feedback
---

The `CacheWarmingService` previously used `@Cron(CronExpression.EVERY_6_HOURS)` on `scheduledWarmup()`. This decorator is resolved at class-definition time and ignores runtime config. Production sets `CACHE_WARMING_CRON: "0 */1 * * *"` (every hour) but the service always ran every 6 hours.

**Why:** NestJS `@Cron` decorators cannot read runtime config values — the cron expression must be a compile-time constant or a string literal.

**Fix applied:** Removed `@Cron` decorator and switched to `SchedulerRegistry.addCronJob()` in `onModuleInit()`, reading `this.config.warmupCron`. `SchedulerRegistry` is globally available from `ScheduleModule.forRoot()`. Updated the unit test to provide a mock `SchedulerRegistry`.

**How to apply:** Any future scheduled job that needs a configurable schedule must use `SchedulerRegistry` + `CronJob` instead of `@Cron()` decorator.
