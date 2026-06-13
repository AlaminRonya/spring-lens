package com.sdlcpro.springlens.insight.trace;


public interface IdGenerator {

    static IdGenerator getDefault() {
        return RandomIdGenerator.getInstance();
    }

    String generateTraceId();

    String generateSpanId();
}