package com.maeum.gohyang.confession.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;

import java.time.LocalDateTime;
import java.util.Optional;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.maeum.gohyang.confession.application.port.in.CreateConfessionUseCase;
import com.maeum.gohyang.confession.application.port.in.ReportConfessionUseCase;
import com.maeum.gohyang.confession.application.port.out.AddConfessionReportPort;
import com.maeum.gohyang.confession.application.port.out.AssessConfessionRiskPort;
import com.maeum.gohyang.confession.application.port.out.LoadConfessionRecordPort;
import com.maeum.gohyang.confession.application.port.out.SaveConfessionRecordPort;
import com.maeum.gohyang.confession.domain.ConfessionBookshelf;
import com.maeum.gohyang.confession.domain.ConfessionRecord;
import com.maeum.gohyang.confession.domain.ConfessionReport;
import com.maeum.gohyang.confession.domain.ConfessionReportReason;
import com.maeum.gohyang.confession.domain.ConfessionRiskLevel;
import com.maeum.gohyang.confession.domain.ConfessionStatus;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings("NullAway")
class ConfessionSafetyServiceTest {

    private static final long AUTHOR_USER_ID = 1L;
    private static final long REPORTER_USER_ID = 2L;
    private static final long CONFESSION_ID = 10L;
    private static final LocalDateTime NOW = LocalDateTime.of(2026, 5, 30, 3, 0);

    @Mock SaveConfessionRecordPort saveConfessionRecordPort;
    @Mock AssessConfessionRiskPort assessConfessionRiskPort;
    @Mock LoadConfessionRecordPort loadConfessionRecordPort;
    @Mock AddConfessionReportPort addConfessionReportPort;

    @InjectMocks CreateConfessionService createConfessionService;
    @InjectMocks ReportConfessionService reportConfessionService;

    @Test
    @DisplayName("고백 생성 시 위험도를 산정해서 저장한다")
    void 고백_생성_시_위험도를_산정해서_저장한다() {
        given(assessConfessionRiskPort.assess("제목", "위험한 본문")).willReturn(ConfessionRiskLevel.HIGH);
        given(saveConfessionRecordPort.save(org.mockito.ArgumentMatchers.any(ConfessionRecord.class)))
                .willAnswer(inv -> inv.getArgument(0));

        ConfessionRecord result = createConfessionService.execute(
                new CreateConfessionUseCase.Command(
                        AUTHOR_USER_ID,
                        "제목",
                        "위험한 본문",
                        ConfessionBookshelf.GENERAL
                )
        );

        assertThat(result.getRiskLevel()).isEqualTo(ConfessionRiskLevel.HIGH);
        assertThat(result.canBeShownToNpc()).isFalse();
    }

    @Test
    @DisplayName("고백 신고는 중복 여부를 결과로 반환한다")
    void 고백_신고는_중복_여부를_결과로_반환한다() {
        given(loadConfessionRecordPort.load(CONFESSION_ID)).willReturn(Optional.of(visibleRecord()));
        given(addConfessionReportPort.addIfAbsent(org.mockito.ArgumentMatchers.any(ConfessionReport.class)))
                .willReturn(true);

        ReportConfessionUseCase.Result result = reportConfessionService.execute(
                new ReportConfessionUseCase.Command(
                        REPORTER_USER_ID,
                        CONFESSION_ID,
                        ConfessionReportReason.HARMFUL_CONTENT
                )
        );

        assertThat(result.added()).isTrue();
    }

    private ConfessionRecord visibleRecord() {
        return ConfessionRecord.restore(
                CONFESSION_ID,
                AUTHOR_USER_ID,
                "제목",
                "본문",
                ConfessionBookshelf.GENERAL,
                ConfessionStatus.VISIBLE,
                ConfessionRiskLevel.LOW,
                NOW,
                NOW
        );
    }
}
