package com.biyahero.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.Arrays;
import java.util.List;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        String replitDomain = System.getenv("REPLIT_DEV_DOMAIN");
        String configuredOrigins = System.getenv("ALLOWED_ORIGINS");
        String nodeEnv = System.getenv("NODE_ENV");
        boolean isProduction = "production".equals(nodeEnv);

        registry.addMapping("/**")
            .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH")
            .allowedHeaders("*")
            .allowCredentials(true)
            .allowedOriginPatterns(buildOriginPatterns(replitDomain, configuredOrigins, isProduction));
    }

    private String[] buildOriginPatterns(String replitDomain, String configuredOrigins, boolean isProduction) {
        if (!isProduction) {
            return new String[]{"*"};
        }
        if (configuredOrigins != null && !configuredOrigins.isBlank()) {
            return Arrays.stream(configuredOrigins.split(","))
                .map(String::trim)
                .toArray(String[]::new);
        }
        if (replitDomain != null) {
            return new String[]{"https://" + replitDomain};
        }
        return new String[]{"*"};
    }
}
