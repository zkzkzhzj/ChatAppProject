package com.maeum.gohyang.confession.adapter.in.web;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.maeum.gohyang.confession.application.port.in.AddConfessionReactionUseCase;
import com.maeum.gohyang.confession.application.port.in.CreateConfessionUseCase;
import com.maeum.gohyang.confession.application.port.in.DeleteConfessionUseCase;
import com.maeum.gohyang.confession.application.port.in.GetConfessionDetailUseCase;
import com.maeum.gohyang.confession.application.port.in.GetThankReplyUseCase;
import com.maeum.gohyang.confession.application.port.in.ListConfessionReactionSummaryUseCase;
import com.maeum.gohyang.confession.application.port.in.ListConfessionsUseCase;
import com.maeum.gohyang.confession.application.port.in.ListReceivedLettersUseCase;
import com.maeum.gohyang.confession.application.port.in.ListSentLettersUseCase;
import com.maeum.gohyang.confession.application.port.in.RemoveConfessionReactionUseCase;
import com.maeum.gohyang.confession.application.port.in.ReportConfessionUseCase;
import com.maeum.gohyang.confession.application.port.in.SendConfessionLetterUseCase;
import com.maeum.gohyang.confession.application.port.in.SendThankReplyUseCase;
import com.maeum.gohyang.confession.domain.ConfessionBookshelf;
import com.maeum.gohyang.confession.domain.ConfessionLetter;
import com.maeum.gohyang.confession.domain.ConfessionReactionType;
import com.maeum.gohyang.confession.domain.ConfessionRecord;
import com.maeum.gohyang.confession.domain.ConfessionThankReply;
import com.maeum.gohyang.confession.error.ConfessionAccessDeniedException;
import com.maeum.gohyang.global.security.AuthenticatedUser;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/confessions")
@RequiredArgsConstructor
@Validated
public class ConfessionController {

    private static final String DEFAULT_LIMIT_VALUE = "20";
    private static final int MAX_LIMIT = 100;

    private final CreateConfessionUseCase createConfessionUseCase;
    private final ListConfessionsUseCase listConfessionsUseCase;
    private final GetConfessionDetailUseCase getConfessionDetailUseCase;
    private final DeleteConfessionUseCase deleteConfessionUseCase;
    private final SendConfessionLetterUseCase sendConfessionLetterUseCase;
    private final ListReceivedLettersUseCase listReceivedLettersUseCase;
    private final ListSentLettersUseCase listSentLettersUseCase;
    private final SendThankReplyUseCase sendThankReplyUseCase;
    private final GetThankReplyUseCase getThankReplyUseCase;
    private final AddConfessionReactionUseCase addConfessionReactionUseCase;
    private final RemoveConfessionReactionUseCase removeConfessionReactionUseCase;
    private final ListConfessionReactionSummaryUseCase listConfessionReactionSummaryUseCase;
    private final ReportConfessionUseCase reportConfessionUseCase;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ConfessionResponse create(
            @Valid @RequestBody CreateConfessionRequest request,
            @AuthenticationPrincipal AuthenticatedUser user) {
        requireMember(user);
        ConfessionRecord record = createConfessionUseCase.execute(request.toCommand(user.userId()));
        return ConfessionResponse.from(record);
    }

    @GetMapping
    public List<ConfessionSummaryResponse> list(
            @RequestParam(required = false) ConfessionBookshelf bookshelf,
            @RequestParam(defaultValue = DEFAULT_LIMIT_VALUE)
            @Min(1)
            @Max(MAX_LIMIT)
            int limit) {
        return listConfessionsUseCase.execute(new ListConfessionsUseCase.Query(bookshelf, limit))
                .stream()
                .map(ConfessionSummaryResponse::from)
                .toList();
    }

    @GetMapping("/{confessionId}")
    public ConfessionResponse get(@PathVariable long confessionId) {
        return ConfessionResponse.from(getConfessionDetailUseCase.execute(confessionId));
    }

    @DeleteMapping("/{confessionId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
            @PathVariable long confessionId,
            @AuthenticationPrincipal AuthenticatedUser user) {
        requireMember(user);
        deleteConfessionUseCase.execute(new DeleteConfessionUseCase.Command(user.userId(), confessionId));
    }

    @PostMapping("/{confessionId}/reactions")
    public ConfessionReactionResponse addReaction(
            @PathVariable long confessionId,
            @Valid @RequestBody ConfessionReactionRequest request,
            @AuthenticationPrincipal AuthenticatedUser user) {
        requireMember(user);
        AddConfessionReactionUseCase.Result result = addConfessionReactionUseCase.execute(
                request.toCommand(user.userId(), confessionId)
        );
        return ConfessionReactionResponse.from(result);
    }

    @DeleteMapping("/{confessionId}/reactions/{reactionType}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeReaction(
            @PathVariable long confessionId,
            @PathVariable ConfessionReactionType reactionType,
            @AuthenticationPrincipal AuthenticatedUser user) {
        requireMember(user);
        removeConfessionReactionUseCase.execute(
                new RemoveConfessionReactionUseCase.Command(user.userId(), confessionId, reactionType)
        );
    }

    @GetMapping("/{confessionId}/reactions")
    public List<ConfessionReactionSummaryResponse> listReactions(@PathVariable long confessionId) {
        return listConfessionReactionSummaryUseCase.execute(confessionId)
                .stream()
                .map(ConfessionReactionSummaryResponse::from)
                .toList();
    }

    @PostMapping("/{confessionId}/reports")
    public ReportConfessionResponse report(
            @PathVariable long confessionId,
            @Valid @RequestBody ReportConfessionRequest request,
            @AuthenticationPrincipal AuthenticatedUser user) {
        requireMember(user);
        return ReportConfessionResponse.from(
                reportConfessionUseCase.execute(request.toCommand(user.userId(), confessionId))
        );
    }

    @PostMapping("/{confessionId}/letters")
    @ResponseStatus(HttpStatus.CREATED)
    public ConfessionLetterResponse sendLetter(
            @PathVariable long confessionId,
            @Valid @RequestBody SendConfessionLetterRequest request,
            @AuthenticationPrincipal AuthenticatedUser user) {
        requireMember(user);
        ConfessionLetter letter = sendConfessionLetterUseCase.execute(request.toCommand(user.userId(), confessionId));
        return ConfessionLetterResponse.from(letter);
    }

    @GetMapping("/me/letters")
    public List<ConfessionLetterResponse> listSentLetters(@AuthenticationPrincipal AuthenticatedUser user) {
        requireMember(user);
        return listSentLettersUseCase.execute(user.userId())
                .stream()
                .map(ConfessionLetterResponse::from)
                .toList();
    }

    @GetMapping("/me/received-letters")
    public List<ConfessionLetterResponse> listAllReceivedLetters(@AuthenticationPrincipal AuthenticatedUser user) {
        requireMember(user);
        return listReceivedLettersUseCase.execute(user.userId())
                .stream()
                .map(ConfessionLetterResponse::from)
                .toList();
    }

    @GetMapping("/me/received-letters/unread-count")
    public UnreadLetterCountResponse countUnreadReceivedLetters(@AuthenticationPrincipal AuthenticatedUser user) {
        requireMember(user);
        return new UnreadLetterCountResponse(listReceivedLettersUseCase.countUnread(user.userId()));
    }

    @PostMapping("/me/received-letters/read")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void markAllReceivedLettersRead(@AuthenticationPrincipal AuthenticatedUser user) {
        requireMember(user);
        listReceivedLettersUseCase.markAllRead(user.userId());
    }

    @GetMapping("/me/{confessionId}/letters")
    public List<ConfessionLetterResponse> listReceivedLetters(
            @PathVariable long confessionId,
            @AuthenticationPrincipal AuthenticatedUser user) {
        requireMember(user);
        return listReceivedLettersUseCase.execute(
                        new ListReceivedLettersUseCase.Query(user.userId(), confessionId)
                )
                .stream()
                .map(ConfessionLetterResponse::from)
                .toList();
    }

    @PostMapping("/me/letters/{letterId}/thank-reply")
    @ResponseStatus(HttpStatus.CREATED)
    public ThankReplyResponse sendThankReply(
            @PathVariable long letterId,
            @Valid @RequestBody SendThankReplyRequest request,
            @AuthenticationPrincipal AuthenticatedUser user) {
        requireMember(user);
        ConfessionThankReply reply = sendThankReplyUseCase.execute(request.toCommand(user.userId(), letterId));
        return ThankReplyResponse.from(reply);
    }

    @GetMapping("/me/letters/{letterId}/thank-reply")
    public ResponseEntity<ThankReplyResponse> getThankReply(
            @PathVariable long letterId,
            @AuthenticationPrincipal AuthenticatedUser user) {
        requireMember(user);
        return getThankReplyUseCase.execute(new GetThankReplyUseCase.Query(user.userId(), letterId))
                .map(ThankReplyResponse::from)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    private void requireMember(AuthenticatedUser user) {
        if (user == null || user.isGuest()) {
            throw new ConfessionAccessDeniedException();
        }
    }
}
