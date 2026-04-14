package com.maeum.gohyang.communication.application.service;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.maeum.gohyang.communication.application.port.in.SendMessageUseCase;
import com.maeum.gohyang.communication.application.port.out.LoadParticipantPort;
import com.maeum.gohyang.communication.application.port.out.PublishConversationSummaryEventPort;
import com.maeum.gohyang.communication.application.port.out.SaveMessagePort;
import com.maeum.gohyang.communication.application.port.out.SaveParticipantPort;
import com.maeum.gohyang.communication.domain.Message;
import com.maeum.gohyang.communication.domain.MessageType;
import com.maeum.gohyang.communication.domain.NpcConversationContext;
import com.maeum.gohyang.communication.domain.Participant;
import com.maeum.gohyang.communication.error.ChatRoomNotFoundException;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class SendMessageService implements SendMessageUseCase {

    private static final int SUMMARY_TRIGGER_COUNT = 3;

    private final LoadParticipantPort loadParticipantPort;
    private final SaveParticipantPort saveParticipantPort;
    private final SaveMessagePort saveMessagePort;
    private final NpcReplyService npcReplyService;
    private final PublishConversationSummaryEventPort publishConversationSummaryEventPort;

    /** 유저별 메시지 카운터 (서버 재시작 시 초기화 — 허용 가능). */
    private final ConcurrentHashMap<Long, AtomicInteger> messageCounters = new ConcurrentHashMap<>();

    /**
     * 메시지 전송.
     *
     * 유저 메시지를 저장하고 즉시 반환한다.
     * NPC 응답은 {@link NpcReplyService#replyAsync}에서 비동기로 생성되어
     * WebSocket으로 별도 브로드캐스트된다.
     *
     * 유저별 3회 메시지 누적 시 대화 요약 이벤트를 Outbox에 발행한다.
     *
     * PostgreSQL(participant + outbox) 작업을 트랜잭션으로 묶는다.
     * Cassandra(message 저장)는 별도 저장소이므로 PostgreSQL 트랜잭션과 무관하게 동작한다.
     */
    @Override
    @Transactional
    public Result execute(Command command) {
        Participant userParticipant = getOrCreateParticipant(command.userId(), command.chatRoomId());

        Participant npcParticipant = loadParticipantPort
                .loadNpc(command.chatRoomId())
                .orElseThrow(ChatRoomNotFoundException::new);

        Message userMessage = saveMessagePort.saveWithUser(
                Message.newMessage(command.chatRoomId(), userParticipant.getId(), command.body(), MessageType.TEXT),
                command.userId()
        );

        publishSummaryEventIfNeeded(command.userId(), command.chatRoomId());

        npcReplyService.replyAsync(
                new NpcConversationContext(command.chatRoomId(), npcParticipant.getId(),
                        command.userId(), command.body()));

        return new Result(userMessage);
    }

    private void publishSummaryEventIfNeeded(long userId, long chatRoomId) {
        AtomicInteger counter = messageCounters.computeIfAbsent(userId, k -> new AtomicInteger(0));
        int count = counter.incrementAndGet();
        if (count >= SUMMARY_TRIGGER_COUNT) {
            counter.set(0);
            publishConversationSummaryEventPort.publish(userId, chatRoomId);
            log.info("대화 요약 이벤트 발행 — userId={}, messageCount={}", userId, SUMMARY_TRIGGER_COUNT);
        }
    }

    /**
     * 공개 채팅방에서는 참여자가 없으면 자동 생성한다.
     * 동시 요청 시 UNIQUE(user_id, chat_room_id) 제약조건으로 중복 방지.
     * DataIntegrityViolationException 발생 시 재조회하여 반환한다.
     */
    private Participant getOrCreateParticipant(long userId, long chatRoomId) {
        return loadParticipantPort.load(userId, chatRoomId)
                .orElseGet(() -> {
                    try {
                        return saveParticipantPort.save(Participant.newMember(userId, chatRoomId));
                    } catch (DataIntegrityViolationException e) {
                        return loadParticipantPort.load(userId, chatRoomId)
                                .orElseThrow(ChatRoomNotFoundException::new);
                    }
                });
    }
}
