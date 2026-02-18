# StreamCore — Combined Sequence Diagram

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant AuthService
    participant SubscriptionService
    participant Cache
    participant RecommendationEngine
    participant Strategy
    participant DB
    participant TokenService

    %% =========================
    %% CONTENT PLAYBACK FLOW
    %% =========================

    Client->>API: Play Content(contentId, profileId)
    API->>AuthService: Validate JWT
    AuthService-->>API: Valid

    API->>SubscriptionService: Check Active Subscription
    SubscriptionService->>DB: Fetch Subscription
    DB-->>SubscriptionService: Subscription Data
    SubscriptionService-->>API: Active

    API->>Cache: Check Content Metadata
    alt Cache Hit
        Cache-->>API: Metadata
    else Cache Miss
        API->>DB: Fetch Content
        DB-->>API: Content Data
        API->>Cache: Store Metadata
    end

    API->>TokenService: Generate Signed Stream Token
    TokenService-->>API: Signed URL
    API-->>Client: Return Stream URL

    %% =========================
    %% RECOMMENDATION FLOW
    %% =========================

    Client->>API: Get Recommendations(profileId)
    API->>Cache: Check Cached Recommendations

    alt Cache Hit
        Cache-->>API: Recommendation List
        API-->>Client: Return Cached Results
    else Cache Miss
        API->>RecommendationEngine: Generate(profileId)

        RecommendationEngine->>Strategy: Content-Based Strategy
        Strategy-->>RecommendationEngine: Scores

        RecommendationEngine->>Strategy: Collaborative Strategy
        Strategy-->>RecommendationEngine: Scores

        RecommendationEngine->>Strategy: Trending Strategy
        Strategy-->>RecommendationEngine: Scores

        RecommendationEngine->>RecommendationEngine: Combine & Normalize Scores
        RecommendationEngine-->>API: Ranked List

        API->>Cache: Store Recommendations (TTL)
        API-->>Client: Return Ranked Results
    end
