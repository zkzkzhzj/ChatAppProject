package com.maeum.gohyang.communication.adapter.in.websocket.v2.protocol;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

@DisplayName("InboundFrame Jackson polymorphic 역직렬화")
class InboundFrameJsonTest {

    private final ObjectMapper objectMapper = JsonMapper.builder().build();

    @Test
    void SUBSCRIBE_타입은_SubscribeFrame으로_파싱된다() throws Exception {
        // Given
        String json = """
                {"type":"SUBSCRIBE","roomId":42}
                """;

        // When
        InboundFrame frame = objectMapper.readValue(json, InboundFrame.class);

        // Then
        assertThat(frame).isInstanceOf(SubscribeFrame.class);
        assertThat(((SubscribeFrame) frame).roomId()).isEqualTo(42L);
    }

    @Test
    void UNSUBSCRIBE_타입은_UnsubscribeFrame으로_파싱된다() throws Exception {
        // Given
        String json = """
                {"type":"UNSUBSCRIBE","roomId":7}
                """;

        // When
        InboundFrame frame = objectMapper.readValue(json, InboundFrame.class);

        // Then
        assertThat(frame).isInstanceOf(UnsubscribeFrame.class);
        assertThat(((UnsubscribeFrame) frame).roomId()).isEqualTo(7L);
    }

    @Test
    void PUBLISH_타입은_PublishFrame으로_본문과_함께_파싱된다() throws Exception {
        // Given
        String json = """
                {"type":"PUBLISH","roomId":1,"body":"안녕하세요"}
                """;

        // When
        InboundFrame frame = objectMapper.readValue(json, InboundFrame.class);

        // Then
        assertThat(frame).isInstanceOf(PublishFrame.class);
        PublishFrame publish = (PublishFrame) frame;
        assertThat(publish.roomId()).isEqualTo(1L);
        assertThat(publish.body()).isEqualTo("안녕하세요");
    }

    @Test
    void POSITION_타입은_PositionFrame으로_파싱된다() throws Exception {
        // Given
        String json = """
                {"type":"POSITION","roomId":1,"x":100.5,"y":200.0}
                """;

        // When
        InboundFrame frame = objectMapper.readValue(json, InboundFrame.class);

        // Then
        assertThat(frame).isInstanceOf(PositionFrame.class);
        PositionFrame position = (PositionFrame) frame;
        assertThat(position.roomId()).isEqualTo(1L);
        assertThat(position.x()).isEqualTo(100.5);
        assertThat(position.y()).isEqualTo(200.0);
    }

    @Test
    void TYPING_타입은_TypingFrame으로_파싱된다() throws Exception {
        // Given
        String json = """
                {"type":"TYPING","roomId":1,"typing":true}
                """;

        // When
        InboundFrame frame = objectMapper.readValue(json, InboundFrame.class);

        // Then
        assertThat(frame).isInstanceOf(TypingFrame.class);
        TypingFrame typing = (TypingFrame) frame;
        assertThat(typing.roomId()).isEqualTo(1L);
        assertThat(typing.typing()).isTrue();
    }

    @Test
    void PING_타입은_본문_없이_PingFrame으로_파싱된다() throws Exception {
        // Given
        String json = """
                {"type":"PING"}
                """;

        // When
        InboundFrame frame = objectMapper.readValue(json, InboundFrame.class);

        // Then
        assertThat(frame).isInstanceOf(PingFrame.class);
    }

    @Test
    void 알_수_없는_타입은_역직렬화에_실패한다() {
        // Given — 클라이언트가 outbound 전용 타입을 보내거나 오타가 났을 때
        String json = """
                {"type":"MESSAGE","roomId":1}
                """;

        // When & Then
        assertThatThrownBy(() -> objectMapper.readValue(json, InboundFrame.class))
                .isInstanceOf(JacksonException.class);
    }

    @Test
    void type_필드가_누락되면_역직렬화에_실패한다() {
        // Given
        String json = """
                {"roomId":1,"body":"hi"}
                """;

        // When & Then
        assertThatThrownBy(() -> objectMapper.readValue(json, InboundFrame.class))
                .isInstanceOf(JacksonException.class);
    }
}
