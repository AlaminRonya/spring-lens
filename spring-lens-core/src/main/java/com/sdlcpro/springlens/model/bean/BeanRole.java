package com.sdlcpro.springlens.model.bean;

import java.util.Arrays;

public enum BeanRole {
    UNKNOWN(-1),
    ROLE_APPLICATION(0),
    ROLE_SUPPORT(1),
    ROLE_INFRASTRUCTURE(2);

    private final int value;

    BeanRole(int value) {
        this.value = value;
    }

    public final int value() {
        return this.value;
    }

    public static BeanRole from(int value){
        return Arrays.stream(BeanRole.values())
                .filter(r -> r.value == value)
                .findFirst()
                .orElse(UNKNOWN);
    }
}
