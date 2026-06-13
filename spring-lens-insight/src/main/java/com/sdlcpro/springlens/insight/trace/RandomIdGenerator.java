package com.sdlcpro.springlens.insight.trace;

import java.util.concurrent.ThreadLocalRandom;

/**
 * A high-performance, thread-safe implementation of {@link IdGenerator}
 * designed for distributed tracing systems.
 * * <p>This implementation uses a Singleton pattern to ensure global uniqueness
 * and leverages {@link ThreadLocalRandom} to eliminate lock contention in
 * multi-threaded environments. Hexadecimal conversion is performed via
 * bitwise operations to minimize memory allocation and Garbage Collection (GC)
 * overhead, making it suitable for high-throughput observability pipelines.</p>
 *
 * <h2>Technical Specifications:</h2>
 * <ul>
 * <li><b>Trace ID:</b> 128-bit (16 bytes), represented as a 32-character hex string.</li>
 * <li><b>Span ID:</b> 64-bit (8 bytes), represented as a 16-character hex string.</li>
 * <li><b>Concurrency:</b> Lock-free, utilizing thread-local entropy sources.</li>
 * </ul>
 * * @author SDLCPro
 * @version 1.0.0
 */
public final class RandomIdGenerator implements IdGenerator {

    private static final RandomIdGenerator INSTANCE = new RandomIdGenerator();

    private static final char[] HEX = "0123456789abcdef".toCharArray();

    private RandomIdGenerator() {}

    public static RandomIdGenerator getInstance() {
        return INSTANCE;
    }

    @Override
    public String generateTraceId() {
        byte[] bytes = new byte[16];
        ThreadLocalRandom.current().nextBytes(bytes);
        return toHex(bytes);
    }

    @Override
    public String generateSpanId() {
        byte[] bytes = new byte[8];
        ThreadLocalRandom.current().nextBytes(bytes);
        return toHex(bytes);
    }

    private String toHex(byte[] bytes) {
        char[] out = new char[bytes.length * 2];

        for (int i = 0; i < bytes.length; i++) {
            int v = bytes[i] & 0xFF;
            out[i * 2] = HEX[v >>> 4];
            out[i * 2 + 1] = HEX[v & 0x0F];
        }

        return new String(out);
    }

}