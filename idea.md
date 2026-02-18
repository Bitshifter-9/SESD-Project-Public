# StreamCore — Distributed Streaming Backend & Recommendation Engine

## Overview

**StreamCore** is a backend-focused, production-style streaming platform infrastructure.

Modern streaming platforms must handle millions of users, manage subscriptions, generate personalized recommendations, enforce access control, maintain watch history, and deliver low-latency real-time updates — all while ensuring scalability, consistency, and security.

StreamCore implements a clean-architecture, OOP-driven backend system that simulates a real-world streaming service core. The frontend is minimal and limited to visualization. The backend contains the primary complexity, focusing on system design, distributed systems concepts, algorithmic recommendation logic, caching strategies, and concurrency control.

---

## Problem Statement

1. **Scalable User Management** — Support multiple profiles per account with secure authentication.
2. **Subscription Lifecycle Management** — Enforce complex subscription states and billing logic.
3. **Efficient Recommendation System** — Generate personalized recommendations using explainable algorithms.
4. **Low-Latency Data Access** — Frequently accessed content must be cached efficiently.
5. **Concurrency Control** — Simultaneous watch updates and session management must not cause inconsistencies.
6. **Secure Content Access** — Unauthorized access to premium content must be prevented.
7. **Real-Time Updates** — Watch progress and recommendations should update dynamically.

---

## Scope

### In Scope
- Multi-profile account system
- Subscription state machine
- Content catalog management
- Hybrid recommendation engine
- Watch history tracking
- Continue Watching feature
- Device session management
- Distributed rate limiting
- Redis-based caching layer
- Background job processing system
- Signed URL token system
- RESTful APIs
- WebSocket notifications
- Role-based access control
- Admin monitoring dashboard

---

## Key Features

### 1. Account & Profile Management
- One account → Multiple user profiles
- Profile-level content restrictions
- Secure JWT authentication
- Device session tracking
- Concurrent session limit enforcement

---

### 2. Subscription State Machine

Subscription modeled as a finite state machine.

**States:**
- Active
- GracePeriod
- Suspended
- Cancelled
- Expired

Implements:
- State design pattern
- Automatic state transitions
- Subscription renewal logic
- Access validation middleware

---

### 3. Hybrid Recommendation Engine

Production-style recommendation system combining:

- Content-based filtering (cosine similarity on genre vectors)
- Item-based collaborative filtering
- Trending score with time decay
- Weighted hybrid scoring model

Features:
- Recommendation caching
- Batch computation jobs
- Similarity matrix generation
- Explainable recommendation scoring
- Algorithmic complexity analysis

---

### 4. Watch History & Continue Watching

- Timestamp-based watch tracking
- Resume playback logic
- Partial completion handling
- Recently watched prioritization
- Efficient indexing for large watch datasets

---

### 5. Distributed Rate Limiter

Implements:
- Token bucket algorithm
- Sliding window algorithm
- Redis-based distributed limiter
- Abuse prevention for streaming endpoints

---

### 6. Secure Content Access Control

- Signed URL generation
- HMAC signature verification
- Expiry-based access tokens
- Middleware-based validation
- Access logging and auditing

---

### 7. Background Job Processing Engine

Implements:
- Redis-backed queue
- Worker processes
- Retry logic
- Dead-letter queue
- Scheduled recommendation recalculation
- Async event-driven processing

---

### 8. Caching Strategy

- LRU-based local cache
- Redis distributed cache
- Write-through strategy
- TTL optimization
- Cache invalidation policies
- Cache stampede prevention

---

### 9. Real-Time Engine

- WebSocket updates for:
  - Watch progress
  - Subscription changes
  - Recommendation refresh
- Event-driven notifications
- Asynchronous event handling

---

### 10. Analytics & Monitoring

- Requests per second (RPS)
- Recommendation generation latency
- Cache hit/miss ratio
- Subscription distribution metrics
- Content popularity trends
- System health monitoring

---

## Tech Stack

| Layer          | Technology                                  |
|---------------|----------------------------------------------|
| **Frontend**  | React.js (Content visualization)             |
| **Backend**   | Node.js + TypeScript (NestJS / Express)      |
| **Database**  | PostgreSQL                                   |
| **Cache**     | Redis                                        |
| **Real-time** | WebSocket (Socket.io)                        |
| **Auth**      | JWT + RBAC                                   |
| **Container** | Docker(IF POSSIBLE)                          |

---

## Architecture Principles

- **Clean Architecture**: Controllers → Services → Domain → Repositories
- **Domain-Driven Design (DDD)**
- **OOP Principles**
  - Encapsulation of domain logic
  - Abstraction of recommendation strategies
  - Polymorphism in subscription states
  - Inheritance for content types
- **Design Patterns**
  - Strategy — Recommendation algorithms
  - State — Subscription lifecycle
  - Factory — Content & profile creation
  - Observer — Real-time notifications
  - Repository — Data abstraction
  - Singleton — Core streaming engine
- **SOLID Principles adherence**
- **Transactional consistency handling**
- **Scalability-first design**

---

## User Roles

| Role        | Description |
|------------|-------------|
| **Viewer** | Consumes content, manages profile and watch history |
| **Admin**  | Manages content, monitors analytics, oversees system health |
