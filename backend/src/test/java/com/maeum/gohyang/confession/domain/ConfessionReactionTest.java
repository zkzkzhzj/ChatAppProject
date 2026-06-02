package com.maeum.gohyang.confession.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.jspecify.annotations.Nullable;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.maeum.gohyang.confession.error.InvalidConfessionReactionException;

class ConfessionReactionTest {

    @Test
    @DisplayName("공감은 고백과 사용자와 이모지 타입을 가진다")
    void 공감은_고백과_사용자와_이모지_타입을_가진다() {
        ConfessionReaction reaction = ConfessionReaction.newReaction(10L, 2L, ConfessionReactionType.CANDLE);

        assertThat(reaction.getId()).isNull();
        assertThat(reaction.getConfessionId()).isEqualTo(10L);
        assertThat(reaction.getUserId()).isEqualTo(2L);
        assertThat(reaction.getReactionType()).isEqualTo(ConfessionReactionType.CANDLE);
    }

    @Test
    @DisplayName("이모지 타입이 없으면 예외가 발생한다")
    void 이모지_타입이_없으면_예외가_발생한다() {
        @Nullable ConfessionReactionType reactionType = null;

        assertThatThrownBy(() -> ConfessionReaction.newReaction(10L, 2L, reactionType))
                .isInstanceOf(InvalidConfessionReactionException.class);
    }
}
