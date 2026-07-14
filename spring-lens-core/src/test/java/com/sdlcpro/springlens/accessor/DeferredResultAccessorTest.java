package com.sdlcpro.springlens.accessor;

import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class DeferredResultAccessorTest {

    @Test
    void supplierIsInvokedLazilyOnFirstAccess() {
        AtomicInteger invocationCount = new AtomicInteger(0);

        DeferredResultAccessor<String> accessor = DeferredResultAccessor.of(() -> {
            invocationCount.incrementAndGet();
            return "computed";
        });

        assertThat(invocationCount.get()).isZero();

        String result = accessor.getResult();

        assertThat(result).isEqualTo("computed");
        assertThat(invocationCount.get()).isEqualTo(1);
    }

    @Test
    void subsequentCallsReturnCachedResult() {
        AtomicInteger invocationCount = new AtomicInteger(0);

        DeferredResultAccessor<String> accessor = DeferredResultAccessor.of(() -> {
            invocationCount.incrementAndGet();
            return "cached";
        });

        accessor.getResult();
        accessor.getResult();
        accessor.getResult();

        assertThat(invocationCount.get()).isEqualTo(1);
    }

    @Test
    void nullResultFromSupplierIsCachedCorrectly() {
        AtomicInteger invocationCount = new AtomicInteger(0);

        DeferredResultAccessor<String> accessor = DeferredResultAccessor.of(() -> {
            invocationCount.incrementAndGet();
            return null;
        });

        assertThat(accessor.getResult()).isNull();
        assertThat(accessor.getResult()).isNull();
        assertThat(invocationCount.get()).isEqualTo(1);
    }

    @Test
    void nullSupplierThrowsIllegalArgumentException() {
        assertThatThrownBy(() -> DeferredResultAccessor.of(null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Deferred result supplier must not be null");
    }

    @Test
    void supplierIsExecutedExactlyOnceUnderConcurrentAccess() throws Exception {
        int threadCount = 64;
        AtomicInteger invocationCount = new AtomicInteger(0);
        CountDownLatch readyLatch = new CountDownLatch(threadCount);
        CountDownLatch startLatch = new CountDownLatch(1);

        DeferredResultAccessor<String> accessor = DeferredResultAccessor.of(() -> {
            invocationCount.incrementAndGet();
            return "concurrent-result";
        });

        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        List<Future<String>> futures = new ArrayList<>();

        try {
            for (int i = 0; i < threadCount; i++) {
                futures.add(executor.submit(() -> {
                    readyLatch.countDown();
                    startLatch.await();
                    return accessor.getResult();
                }));
            }

            // Wait until all threads are parked at the barrier
            readyLatch.await();
            // Release all threads simultaneously to maximize contention
            startLatch.countDown();

            List<String> results = new ArrayList<>();
            for (Future<String> future : futures) {
                results.add(future.get());
            }

            assertThat(invocationCount.get()).isEqualTo(1);
            assertThat(results).hasSize(threadCount)
                    .allSatisfy(r -> assertThat(r).isEqualTo("concurrent-result"));
        } finally {
            executor.shutdownNow();
        }
    }

    @Test
    void concurrentAccessWithSlowSupplierStillExecutesOnce() throws Exception {
        int threadCount = 32;
        AtomicInteger invocationCount = new AtomicInteger(0);
        CountDownLatch readyLatch = new CountDownLatch(threadCount);
        CountDownLatch startLatch = new CountDownLatch(1);

        DeferredResultAccessor<Integer> accessor = DeferredResultAccessor.of(() -> {
            invocationCount.incrementAndGet();
            try {
                // Simulate expensive computation
                Thread.sleep(50);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
            return 42;
        });

        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        List<Future<Integer>> futures = new ArrayList<>();

        try {
            for (int i = 0; i < threadCount; i++) {
                futures.add(executor.submit(() -> {
                    readyLatch.countDown();
                    startLatch.await();
                    return accessor.getResult();
                }));
            }

            readyLatch.await();
            startLatch.countDown();

            List<Integer> results = new ArrayList<>();
            for (Future<Integer> future : futures) {
                results.add(future.get());
            }

            assertThat(invocationCount.get()).isEqualTo(1);
            assertThat(results).hasSize(threadCount)
                    .allSatisfy(r -> assertThat(r).isEqualTo(42));
        } finally {
            executor.shutdownNow();
        }
    }

    @Test
    void staticFactoryMethodReturnsNewInstance() {
        DeferredResultAccessor<String> a = DeferredResultAccessor.of(() -> "a");
        DeferredResultAccessor<String> b = DeferredResultAccessor.of(() -> "b");

        assertThat(a).isNotSameAs(b);
        assertThat(a.getResult()).isEqualTo("a");
        assertThat(b.getResult()).isEqualTo("b");
    }
}
