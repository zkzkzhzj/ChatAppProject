package com.maeum.gohyang.confession.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.LocalDateTime;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import com.maeum.gohyang.confession.error.ConfessionAccessDeniedException;
import com.maeum.gohyang.confession.error.InvalidConfessionContentException;

class ConfessionRecordTest {

    private static final long AUTHOR_USER_ID = 1L;
    private static final long OTHER_USER_ID = 2L;

    @Nested
    @DisplayName("성공 케이스")
    class Success {

        @Test
        @DisplayName("새 고백 기록은 보이는 상태와 낮은 위험도로 생성된다")
        void 새_고백_기록은_보이는_상태와_낮은_위험도로_생성된다() {
            ConfessionRecord record = ConfessionRecord.newRecord(
                    AUTHOR_USER_ID,
                    "말하지 못한 마음",
                    "오늘은 조금 오래 숨기던 이야기를 남긴다.",
                    ConfessionBookshelf.LONELINESS,
                    null
            );

            assertThat(record.getId()).isNull();
            assertThat(record.getAuthorUserId()).isEqualTo(AUTHOR_USER_ID);
            assertThat(record.getBookshelf()).isEqualTo(ConfessionBookshelf.LONELINESS);
            assertThat(record.getStatus()).isEqualTo(ConfessionStatus.VISIBLE);
            assertThat(record.getRiskLevel()).isEqualTo(ConfessionRiskLevel.LOW);
            assertThat(record.isVisible()).isTrue();
            assertThat(record.isAuthor(AUTHOR_USER_ID)).isTrue();
        }

        @Test
        @DisplayName("책장을 선택하지 않으면 일반 책장으로 생성된다")
        void 책장을_선택하지_않으면_일반_책장으로_생성된다() {
            ConfessionRecord record = ConfessionRecord.newRecord(
                    AUTHOR_USER_ID,
                    "제목",
                    "본문",
                    null,
                    ConfessionRiskLevel.MEDIUM
            );

            assertThat(record.getBookshelf()).isEqualTo(ConfessionBookshelf.GENERAL);
            assertThat(record.getRiskLevel()).isEqualTo(ConfessionRiskLevel.MEDIUM);
        }

        @Test
        @DisplayName("작성자가 삭제하면 삭제 상태로 바뀐다")
        void 작성자가_삭제하면_삭제_상태로_바뀐다() {
            LocalDateTime now = LocalDateTime.now();
            ConfessionRecord record = ConfessionRecord.restore(
                    10L,
                    AUTHOR_USER_ID,
                    "제목",
                    "본문",
                    ConfessionBookshelf.GENERAL,
                    ConfessionStatus.VISIBLE,
                    ConfessionRiskLevel.LOW,
                    now,
                    now
            );

            ConfessionRecord deleted = record.deleteByAuthor(AUTHOR_USER_ID);

            assertThat(deleted.getStatus()).isEqualTo(ConfessionStatus.DELETED);
            assertThat(deleted.isVisible()).isFalse();
        }

        @Test
        @DisplayName("낮거나 중간 위험도인 공개 기록만 사서에게 노출할 수 있다")
        void 낮거나_중간_위험도인_공개_기록만_사서에게_노출할_수_있다() {
            ConfessionRecord record = ConfessionRecord.newRecord(
                    AUTHOR_USER_ID,
                    "제목",
                    "본문",
                    ConfessionBookshelf.GENERAL,
                    ConfessionRiskLevel.MEDIUM
            );

            assertThat(record.canBeShownToLibrarian()).isTrue();
        }

        @Test
        @DisplayName("높은 위험도 기록은 사서에게 노출하지 않는다")
        void 높은_위험도_기록은_사서에게_노출하지_않는다() {
            ConfessionRecord record = ConfessionRecord.newRecord(
                    AUTHOR_USER_ID,
                    "제목",
                    "본문",
                    ConfessionBookshelf.GENERAL,
                    ConfessionRiskLevel.HIGH
            );

            assertThat(record.canBeShownToLibrarian()).isFalse();
        }
    }

    @Nested
    @DisplayName("실패 케이스")
    class Failure {

        @Test
        @DisplayName("빈 제목은 예외가 발생한다")
        void 빈_제목은_예외가_발생한다() {
            assertThatThrownBy(() -> ConfessionRecord.newRecord(
                    AUTHOR_USER_ID,
                    " ",
                    "본문",
                    ConfessionBookshelf.GENERAL,
                    ConfessionRiskLevel.LOW
            )).isInstanceOf(InvalidConfessionContentException.class);
        }

        @Test
        @DisplayName("빈 본문은 예외가 발생한다")
        void 빈_본문은_예외가_발생한다() {
            assertThatThrownBy(() -> ConfessionRecord.newRecord(
                    AUTHOR_USER_ID,
                    "제목",
                    null,
                    ConfessionBookshelf.GENERAL,
                    ConfessionRiskLevel.LOW
            )).isInstanceOf(InvalidConfessionContentException.class);
        }

        @Test
        @DisplayName("제목이 길면 예외가 발생한다")
        void 제목이_길면_예외가_발생한다() {
            assertThatThrownBy(() -> ConfessionRecord.newRecord(
                    AUTHOR_USER_ID,
                    "가".repeat(ConfessionRecord.MAX_TITLE_LENGTH + 1),
                    "본문",
                    ConfessionBookshelf.GENERAL,
                    ConfessionRiskLevel.LOW
            )).isInstanceOf(InvalidConfessionContentException.class);
        }

        @Test
        @DisplayName("본문이 길면 예외가 발생한다")
        void 본문이_길면_예외가_발생한다() {
            assertThatThrownBy(() -> ConfessionRecord.newRecord(
                    AUTHOR_USER_ID,
                    "제목",
                    "가".repeat(ConfessionRecord.MAX_BODY_LENGTH + 1),
                    ConfessionBookshelf.GENERAL,
                    ConfessionRiskLevel.LOW
            )).isInstanceOf(InvalidConfessionContentException.class);
        }

        @Test
        @DisplayName("작성자가 아닌 사용자가 삭제하면 권한 예외가 발생한다")
        void 작성자가_아닌_사용자가_삭제하면_권한_예외가_발생한다() {
            ConfessionRecord record = ConfessionRecord.newRecord(
                    AUTHOR_USER_ID,
                    "제목",
                    "본문",
                    ConfessionBookshelf.GENERAL,
                    ConfessionRiskLevel.LOW
            );

            assertThatThrownBy(() -> record.deleteByAuthor(OTHER_USER_ID))
                    .isInstanceOf(ConfessionAccessDeniedException.class);
        }
    }
}
