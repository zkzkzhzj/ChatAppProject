package com.maeum.gohyang.confession.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;

import java.time.LocalDateTime;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.maeum.gohyang.confession.application.port.in.ListNpcSimilarConfessionsUseCase;
import com.maeum.gohyang.confession.application.port.out.LoadConfessionRecordPort;
import com.maeum.gohyang.confession.domain.ConfessionBookshelf;
import com.maeum.gohyang.confession.domain.ConfessionRecord;
import com.maeum.gohyang.confession.domain.ConfessionRiskLevel;
import com.maeum.gohyang.confession.domain.ConfessionStatus;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings("NullAway")
class LibraryNpcServiceTest {

    private static final LocalDateTime NOW = LocalDateTime.of(2026, 5, 30, 4, 0);

    @Mock LoadConfessionRecordPort loadConfessionRecordPort;

    @InjectMocks ListNpcSimilarConfessionsService listNpcSimilarConfessionsService;

    @Test
    @DisplayName("NPC는 책장 기준으로 안내 가능한 고백 기록만 조회한다")
    void NPC는_책장_기준으로_안내_가능한_고백_기록만_조회한다() {
        ConfessionRecord record = record(10L, ConfessionRiskLevel.MEDIUM);
        given(loadConfessionRecordPort.loadForNpc(ConfessionBookshelf.LONELINESS, 3))
                .willReturn(List.of(record));

        List<ConfessionRecord> result = listNpcSimilarConfessionsService.execute(
                new ListNpcSimilarConfessionsUseCase.Query(ConfessionBookshelf.LONELINESS, 3)
        );

        assertThat(result).hasSize(1);
        assertThat(result.get(0).canBeShownToNpc()).isTrue();
    }

    @Test
    @DisplayName("NPC 조회 제한값이 비정상이면 기본 제한값으로 조회한다")
    void NPC_조회_제한값이_비정상이면_기본_제한값으로_조회한다() {
        given(loadConfessionRecordPort.loadForNpc(null, 5)).willReturn(List.of());

        List<ConfessionRecord> result = listNpcSimilarConfessionsService.execute(
                new ListNpcSimilarConfessionsUseCase.Query(null, 0)
        );

        assertThat(result).isEmpty();
    }

    private ConfessionRecord record(long id, ConfessionRiskLevel riskLevel) {
        return ConfessionRecord.restore(
                id,
                1L,
                "제목",
                "본문",
                ConfessionBookshelf.LONELINESS,
                ConfessionStatus.VISIBLE,
                riskLevel,
                NOW,
                NOW
        );
    }
}
