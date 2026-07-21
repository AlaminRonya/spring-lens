package com.sdlcpro.springlens.autoconfigure.bean;

import com.sdlcpro.springlens.annotation.SpringLensInternalComponent;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Import;

@AutoConfiguration
@SpringLensInternalComponent
@EnableConfigurationProperties(SpringLensBeanProperties.class)
@ConditionalOnProperty(
        prefix = "spring.lens.bean",
        name = "enabled",
        havingValue = "true",
        matchIfMissing = true)
@Import({
        BeanStorageConfiguration.class,
        BeanInfoCollectorConfiguration.class,
        BeanWebConfiguration.class
})
public class SpringLensBeanAutoConfiguration {
}
