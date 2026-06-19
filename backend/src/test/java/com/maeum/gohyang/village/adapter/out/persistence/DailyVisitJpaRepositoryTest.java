package com.maeum.gohyang.village.adapter.out.persistence;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.transaction.annotation.Transactional;

import com.maeum.gohyang.support.BaseTestContainers;
import com.maeum.gohyang.village.domain.DailyVisitType;

@SpringBootTest
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@Transactional
class DailyVisitJpaRepositoryTest extends BaseTestContainers {

    @Autowired DailyVisitJpaRepository repository;

    @Test
    @DisplayName("native insert 방문 타입은 타입별 집계와 같은 문자열 값으로 저장된다")
    void native_insert_방문_타입은_타입별_집계와_같은_문자열_값으로_저장된다() {
        LocalDate visitDate = LocalDate.of(2026, 6, 20);

        int guestInserted = repository.insertIfAbsent(visitDate, "guest-1", DailyVisitType.GUEST);
        int memberInserted = repository.insertIfAbsent(visitDate, "member-1", DailyVisitType.MEMBER);

        assertThat(guestInserted).isOne();
        assertThat(memberInserted).isOne();
        assertThat(repository.countByVisitDate(visitDate)).isEqualTo(2);
        assertThat(repository.countByVisitDateAndVisitorType(visitDate, DailyVisitType.GUEST)).isOne();
        assertThat(repository.countByVisitDateAndVisitorType(visitDate, DailyVisitType.MEMBER)).isOne();
    }
}
