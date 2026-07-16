package com.sdlcpro.springlens.time;

import java.time.Instant;
import java.util.concurrent.TimeUnit;

public abstract class SpringLensClock {
    private static final String CLOCK_PROVIDER_PROPERTY = "spring.lens.clock";
    private static final String DEFAULT_CLOCK = "system";

    private static volatile SpringLensClock CLOCK;
    public abstract Instant now();

    public static SpringLensClock getClock() {
        if (CLOCK == null) {
            synchronized (SpringLensClock.class) {
                if (CLOCK == null) {
                    CLOCK = configuredClock();
                }
            }
        }

        return CLOCK;
    }

    private static SpringLensClock configuredClock() {
        var clockType = System.getProperty(CLOCK_PROVIDER_PROPERTY, DEFAULT_CLOCK);
        if ("steady".equals(clockType)) {
            return SteadyClock.getInstance();
        }

        return SystemClock.getInstance();
    }

    public static long nanoTime() {
        return System.nanoTime();
    }

    public static long elapsedNanos(long startNanoTime) {
        return System.nanoTime() - startNanoTime;
    }

    public static long elapsedMillis(long startNanoTime) {
        return TimeUnit.NANOSECONDS.toMillis(elapsedNanos(startNanoTime));
    }
}
