package com.sdlcpro.springlens.insight.support.provider;

public interface ClassNameProvider extends StringValueProvider {
    String getClassName();

    @Override
    default String getValue() {
        return this.getClassName();
    }
}
