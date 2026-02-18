# StreamCore — ER Diagram

```mermaid
erDiagram

    USERS {
        string id PK
        string email
        string password_hash
        string role
        datetime created_at
        datetime updated_at
    }

    PROFILES {
        string id PK
        string user_id FK
        string name
        boolean is_child
        datetime created_at
    }

    SUBSCRIPTIONS {
        string id PK
        string user_id FK
        string plan_id FK
        string state
        datetime start_date
        datetime end_date
        datetime created_at
        datetime updated_at
    }

    PLANS {
        string id PK
        string name
        decimal price
        int max_devices
        string billing_cycle
        datetime created_at
    }

    CONTENT {
        string id PK
        string title
        string description
        string type
        int release_year
        int duration_minutes
        float rating
        datetime created_at
    }

    GENRES {
        string id PK
        string name
    }

    CONTENT_GENRES {
        string content_id FK
        string genre_id FK
    }

    WATCH_HISTORY {
        string id PK
        string profile_id FK
        string content_id FK
        int watched_duration_seconds
        boolean completed
        datetime last_watched_at
    }

    RECOMMENDATIONS {
        string id PK
        string profile_id FK
        string content_id FK
        float score
        datetime generated_at
    }

    SESSIONS {
        string id PK
        string user_id FK
        string device_info
        string ip_address
        datetime created_at
        datetime expires_at
    }

    STREAM_TOKENS {
        string id PK
        string profile_id FK
        string content_id FK
        string token
        datetime expires_at
        datetime created_at
    }

    JOBS {
        string id PK
        string type
        string status
        json payload
        int attempts
        datetime scheduled_at
        datetime processed_at
    }

    USERS ||--o{ PROFILES : owns
    USERS ||--|| SUBSCRIPTIONS : subscribes
    USERS ||--o{ SESSIONS : creates

    SUBSCRIPTIONS }o--|| PLANS : based_on

    CONTENT ||--o{ CONTENT_GENRES : categorized_as
    GENRES ||--o{ CONTENT_GENRES : includes

    PROFILES ||--o{ WATCH_HISTORY : watches
    CONTENT ||--o{ WATCH_HISTORY : tracked_in

    PROFILES ||--o{ RECOMMENDATIONS : receives
    CONTENT ||--o{ RECOMMENDATIONS : suggested

    PROFILES ||--o{ STREAM_TOKENS : generates
    CONTENT ||--o{ STREAM_TOKENS : secured_by
