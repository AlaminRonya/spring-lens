package com.sdlcpro.springlens.listener.bean.definition;

import com.sdlcpro.springlens.model.bean.definition.BeanDefinitionInfo;

@FunctionalInterface
public interface BeanDefinitionInfoCollectListener {
    /**
     * Callback method triggered when BeanDefinitionInfo is collected.
     *
     * @param beanDefinitionInfo the collected bean definition metadata
     */
    void onBeanDefinitionInfoCollect(BeanDefinitionInfo beanDefinitionInfo);
}
