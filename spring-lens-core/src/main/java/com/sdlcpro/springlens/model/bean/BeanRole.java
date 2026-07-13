package com.sdlcpro.springlens.model.bean;

public enum BeanRole {
    UNKNOWN(-1),
    ROLE_APPLICATION(0),
    ROLE_SUPPORT(1),
    ROLE_INFRASTRUCTURE(2);

    private static final BeanRole[] VALUES;

    private final int value;

    static {
        VALUES = values();
    }

    BeanRole(int value) {
        this.value = value;
    }

    public final int value() {
        return this.value;
    }

    public static BeanRole from(int value) {
        if (value < 0 || value > 2) {
            return UNKNOWN;
        }

        for (BeanRole role : VALUES) {
            if (role.value == value) {
                return role;
            }
        }

        return UNKNOWN;
    }
}
