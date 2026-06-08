package com.maeum.gohyang.global.config;

import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;

class FlywayConfigTest {

    @Test
    void repair_옵션이_켜지면_repair_후_migrate를_실행한다() {
        Flyway flyway = mock(Flyway.class);
        FlywayConfig.RepairableFlywayMigrationStrategy strategy =
                new FlywayConfig.RepairableFlywayMigrationStrategy(true);

        strategy.migrate(flyway);

        InOrder inOrder = inOrder(flyway);
        inOrder.verify(flyway).repair();
        inOrder.verify(flyway).migrate();
    }

    @Test
    void repair_옵션이_꺼지면_migrate만_실행한다() {
        Flyway flyway = mock(Flyway.class);
        FlywayConfig.RepairableFlywayMigrationStrategy strategy =
                new FlywayConfig.RepairableFlywayMigrationStrategy(false);

        strategy.migrate(flyway);

        verify(flyway, never()).repair();
        verify(flyway).migrate();
    }
}
