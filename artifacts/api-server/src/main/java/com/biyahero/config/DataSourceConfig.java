package com.biyahero.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import javax.sql.DataSource;
import java.net.URI;

@Configuration
public class DataSourceConfig {

    private static final Logger log = LoggerFactory.getLogger(DataSourceConfig.class);

    @Bean
    public DataSource dataSource() {
        String rawUrl = System.getenv("DATABASE_URL");
        if (rawUrl == null || rawUrl.isBlank()) {
            throw new IllegalStateException("DATABASE_URL environment variable is required but not set.");
        }

        HikariConfig config = new HikariConfig();

        try {
            String normalized = rawUrl.replaceFirst("^postgres://", "postgresql://");
            URI uri = URI.create(normalized);

            String host = uri.getHost();
            int port = uri.getPort() > 0 ? uri.getPort() : 5432;
            String path = uri.getPath();
            String database = path.startsWith("/") ? path.substring(1) : path;

            config.setJdbcUrl("jdbc:postgresql://" + host + ":" + port + "/" + database);

            String userInfo = uri.getUserInfo();
            if (userInfo != null) {
                int sep = userInfo.indexOf(':');
                if (sep >= 0) {
                    config.setUsername(userInfo.substring(0, sep));
                    config.setPassword(userInfo.substring(sep + 1));
                } else {
                    config.setUsername(userInfo);
                }
            }
        } catch (Exception e) {
            log.warn("Could not parse DATABASE_URL as URI, using as JDBC URL directly: {}", e.getMessage());
            config.setJdbcUrl(rawUrl);
        }

        config.setMaximumPoolSize(10);
        config.setConnectionTimeout(30000);
        config.setDriverClassName("org.postgresql.Driver");

        log.info("DataSource configured with JDBC URL: {}", config.getJdbcUrl());
        return new HikariDataSource(config);
    }
}
