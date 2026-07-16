package com.sdlcpro.springlens.insight.bean;

import com.sdlcpro.springlens.matcher.Matcher;
import com.sdlcpro.springlens.model.bean.BeanRole;

import java.util.EnumSet;

public class BeanRoleMatcher<T extends BeanRoleProvider> implements Matcher<T> {
    private final EnumSet<BeanRole> beanRoles;

    public BeanRoleMatcher(EnumSet<BeanRole> beanRoles) {
        this.beanRoles = beanRoles != null
                ? EnumSet.copyOf(beanRoles)
                : EnumSet.noneOf(BeanRole.class);
    }

    @Override
    public boolean matches(T context) {
        return context != null
                && !this.beanRoles.isEmpty()
                && this.beanRoles.contains(context.getBeanRole());
    }
}
