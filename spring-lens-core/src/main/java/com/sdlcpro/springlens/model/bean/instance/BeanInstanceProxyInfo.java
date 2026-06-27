package com.sdlcpro.springlens.model.bean.instance;

import java.util.List;

/**
 * Captures structural runtime information regarding AOP and CGLIB proxies 
 * wrapping a Spring bean instance.
 */
public record BeanInstanceProxyInfo(
        String targetClass,
        List<String> advices,
        List<String> proxiedInterfaces,
        boolean adviceFrozen
) {
}
