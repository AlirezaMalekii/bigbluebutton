---
name: trace-bbb-realtime-feature
description: Traces BigBlueButton meeting features across React, GraphQL, actions, Redis/Akka, database views, subscriptions, permissions, and reconnect behavior. Use before changing synchronized UI, moderator/viewer behavior, presentation or whiteboard state, webcams, chat, polls, shared notes, layouts, or any feature that must update across clients.
paths:
  - bigbluebutton-html5/**
  - bbb-graphql-*/**
  - akka-bbb-apps/**
metadata:
  risk: realtime
---

# Trace BBB Realtime Feature

Produce evidence before implementation.

1. Identify the UI event and current component/container.
2. Locate the service/hook and mutation or plugin command.
3. Inspect GraphQL action/schema/metadata and backend handler when present.
4. Locate the database view/event source and client subscription.
5. Identify projection/filtering, deduplication, permission gates, and cleanup.
6. Check reconnect, late data, duplicate events, unchanged values, meeting end, and role changes.
7. Record existing throttles/debounces and every network write.

Report:

- flow with exact paths and symbols
- source of truth
- authority/permission owner
- current deduplication and skip conditions
- smallest compatible extension seam
- risks and verification across at least two clients

Never infer an undocumented payload or add polling because a subscription path was not yet found.
