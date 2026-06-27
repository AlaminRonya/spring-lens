package com.sdlcpro.springlens.model.bean;

public record BeanInfoCompositeKey(String contextId, String beanName) {

    @Override
    public String toString() {
        return "context-id: " + this.contextId + ", bean-name: " + this.beanName;
    }
}
