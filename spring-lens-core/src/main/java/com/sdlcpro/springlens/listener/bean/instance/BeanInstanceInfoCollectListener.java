package com.sdlcpro.springlens.listener.bean.instance;

import com.sdlcpro.springlens.model.bean.instance.BeanInstanceInfo;

@FunctionalInterface
public interface BeanInstanceInfoCollectListener {

    void onBeanInstanceInfoCollect(BeanInstanceInfo beanInstanceInfo);
}
