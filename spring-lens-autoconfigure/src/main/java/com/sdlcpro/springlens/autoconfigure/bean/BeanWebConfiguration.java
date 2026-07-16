package com.sdlcpro.springlens.autoconfigure.bean;

import com.sdlcpro.springlens.annotation.SpringLensInternalComponent;
import com.sdlcpro.springlens.exposure.bean.BeanDetailsRestController;
import com.sdlcpro.springlens.repository.bean.BeanDefinitionInfoRepository;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication.Type;
import org.springframework.context.annotation.Bean;


@SpringLensInternalComponent
@ConditionalOnWebApplication(type = Type.SERVLET)
public class BeanWebConfiguration {

    /**
     * Registers the REST controller that exposes paginated bean metadata.
     *
     * @param springLensBeanDefinitionInfoRepository the repository holding the collected
     *                                               bean metadata
     * @return the configured {@link BeanDetailsRestController} bean
     */
    @Bean("springLensBeanDetailsRestController")
    public BeanDetailsRestController beanDetailsRestController(
            BeanDefinitionInfoRepository springLensBeanDefinitionInfoRepository) {
        return new BeanDetailsRestController(springLensBeanDefinitionInfoRepository);
    }
}
