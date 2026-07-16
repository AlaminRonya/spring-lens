package com.sdlcpro.springlens.time;

import java.time.Instant;

public final class AnchoredClock {
    private final Instant startTime;
    private final long startNanoTime;

    private AnchoredClock(SpringLensClock clock) {
        this.startTime = clock.now();
        this.startNanoTime = SpringLensClock.nanoTime();
    }

    public Instant getStartTime() {
        return this.startTime;
    }

    public Instant now() {
        return this.startTime.plusNanos(SpringLensClock.elapsedNanos(this.startNanoTime));
    }

    public long getElapsedNanos() {
        return SpringLensClock.elapsedNanos(this.startNanoTime);
    }

    public static AnchoredClock create() {
        return new AnchoredClock(SpringLensClock.getClock());
    }
}
