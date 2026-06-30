package com.sdlcpro.springlens.repository.bean.definition;

import com.sdlcpro.springlens.model.bean.BeanInfoCompositeKey;
import com.sdlcpro.springlens.model.bean.definition.BeanDefinitionInfo;
import com.sdlcpro.springlens.repository.PageableRepository;

public interface BeanDefinitionInfoRepository extends PageableRepository<BeanDefinitionInfo, BeanInfoCompositeKey> {
    // Custom query methods can be added here as needed later
}
