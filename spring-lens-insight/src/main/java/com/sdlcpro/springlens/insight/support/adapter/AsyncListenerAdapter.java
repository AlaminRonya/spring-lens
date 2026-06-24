package com.sdlcpro.springlens.insight.support.adapter;

import jakarta.servlet.AsyncEvent;
import jakarta.servlet.AsyncListener;

import java.io.IOException;

public interface AsyncListenerAdapter extends AsyncListener {
    default void onComplete(AsyncEvent var1) throws IOException {
    }

    default void onTimeout(AsyncEvent var1) throws IOException {
    }

    default void onError(AsyncEvent var1) throws IOException {
    }

    default void onStartAsync(AsyncEvent var1) throws IOException {
    }
}
