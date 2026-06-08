package com.maeum.gohyang.global.config;

import org.flywaydb.core.Flyway;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.flyway.autoconfigure.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class FlywayConfig {

    @Bean
    public FlywayMigrationStrategy flywayMigrationStrategy(
            @Value("${app.flyway.repair-on-migrate:false}") boolean repairOnMigrate) {
        return new RepairableFlywayMigrationStrategy(repairOnMigrate);
    }

    static class RepairableFlywayMigrationStrategy implements FlywayMigrationStrategy {

        private final boolean repairOnMigrate;

        RepairableFlywayMigrationStrategy(boolean repairOnMigrate) {
            this.repairOnMigrate = repairOnMigrate;
        }

        @Override
        public void migrate(Flyway flyway) {
            if (repairOnMigrate) {
                flyway.repair();
            }
            flyway.migrate();
        }
    }
}
