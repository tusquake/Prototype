package com.cloudkaptan.sop.config.security;

import java.lang.annotation.*;

/**
 * Custom annotation to mark service query methods for AOP Row Level Security (RLS) enforcement.
 */
@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface ApplyRowLevelSecurity {
    String entityCodeParam() default "entities";
}
