package com.maeum.gohyang.confession.adapter.in.web;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.maeum.gohyang.confession.application.port.in.ListNpcSimilarConfessionsUseCase;
import com.maeum.gohyang.confession.domain.ConfessionBookshelf;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/library/npc")
@RequiredArgsConstructor
public class LibraryNpcController {

    private final ListNpcSimilarConfessionsUseCase listNpcSimilarConfessionsUseCase;

    @GetMapping("/similar-confessions")
    public List<ConfessionSummaryResponse> listSimilarConfessions(
            @RequestParam(required = false) ConfessionBookshelf bookshelf,
            @RequestParam(defaultValue = "5") int limit) {
        return listNpcSimilarConfessionsUseCase.execute(
                        new ListNpcSimilarConfessionsUseCase.Query(bookshelf, limit)
                )
                .stream()
                .map(ConfessionSummaryResponse::from)
                .toList();
    }
}
