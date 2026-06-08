---
title: Deprecated general chat AI conversation
tags: [communication, deprecated, ai]
related: [communication/chat-architecture.md, infra/outbox-pattern.md]
last-verified: 2026-06-08
status: deprecated
deprecated-note: General chat mentions, automated replies, summaries, embeddings, and conversation memory storage were removed. Librarian RAG is a separate follow-up track.
---

# Deprecated General Chat AI Conversation

This page is a historical note only.

General communication chat now stores and broadcasts user messages only. It no longer has automated reply generation, mention target lookup, conversation summarization, embedding generation, or vector memory storage.

Current chat behavior is documented in [chat-architecture.md](./chat-architecture.md).

Existing databases are cleaned by the deprecated conversation memory cleanup migration. New databases do not create the old memory table.
