package com.maeum.gohyang.communication.domain;

import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 채팅 메시지에서 @멘션을 파싱한다.
 *
 * 멘션 형식: @[표시이름](npc:participantId)
 * 예: @[마을 주민](npc:1)
 *
 * 추후 유저 멘션이 추가되면 @[닉네임](user:userId) 형태로 확장 가능.
 */
public final class MentionParser {

    private static final Pattern NPC_MENTION = Pattern.compile("@\\[([^]]+)]\\(npc:(\\d+)\\)");

    private MentionParser() {
    }

    /**
     * 메시지에서 NPC 멘션을 찾아 participant ID를 반환한다.
     * 멘션이 없으면 빈 Optional.
     */
    public static Optional<Long> extractNpcMention(String body) {
        if (body == null) {
            return Optional.empty();
        }
        Matcher matcher = NPC_MENTION.matcher(body);
        if (matcher.find()) {
            return Optional.of(Long.parseLong(matcher.group(2)));
        }
        return Optional.empty();
    }

    /**
     * 멘션 마크업을 제거하고 순수 텍스트만 남긴다.
     * "@[마을 주민](npc:1) 안녕?" → "안녕?"
     */
    public static String stripMentionMarkup(String body) {
        if (body == null) {
            return "";
        }
        return NPC_MENTION.matcher(body).replaceAll("").trim();
    }
}
