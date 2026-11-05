# Kiro Project Steering Document

## Overview
This project is built for **Kiroween 2026 ($100k Hackathon)**.
It showcases an **Autonomous Multimodal Video Agent** that analyzes real-time video streams, interacts with viewers via contextual natural language queries, and triggers instantaneous in-stream execution actions.

## Architecture
- **Framework**: React 18, TypeScript, Tailwind CSS, Vite
- **Agent Intelligence**: Kiro Spec-driven agentic framework
- **Execution Engine**: In-stream real-time action dispatcher & transaction pipeline

## Critical Rules & Regression Prevention
- **OpenAI Realtime WebRTC Calls Endpoint (`/v1/realtime/calls`)**:
  - NEVER send raw SDP text via `Content-Type: application/sdp` body.
  - MUST ALWAYS send `multipart/form-data` containing the `"sdp"` field (Blob of type `application/sdp`) and `"session"` JSON.
  - Retain automatic model fallback between `gpt-realtime` and `gpt-4o-realtime-preview`.
