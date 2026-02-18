# StreamCore — Class Diagram

```mermaid
classDiagram

    class User {
        -id: string
        -email: string
        -passwordHash: string
        -role: string
        -createdAt: Date
        +createProfile(name: string, isChild: boolean): Profile
        +startSubscription(plan: Plan): Subscription
        +validatePassword(password: string): boolean
    }

    class Profile {
        -id: string
        -name: string
        -isChild: boolean
        -createdAt: Date
        +watch(content: Content, duration: number): void
        +generateRecommendations(): Recommendation[]
    }

    class Plan {
        -id: string
        -name: string
        -price: number
        -maxDevices: number
        -billingCycle: string
    }

    class Subscription {
        -id: string
        -state: string
        -startDate: Date
        -endDate: Date
        +activate(): void
        +cancel(): void
        +suspend(): void
        +renew(): void
        +isActive(): boolean
    }

    class SubscriptionState {
        <<abstract>>
        +handle(context: Subscription): void
    }

    class ActiveState
    class GracePeriodState
    class SuspendedState
    class CancelledState
    class ExpiredState

    SubscriptionState <|-- ActiveState
    SubscriptionState <|-- GracePeriodState
    SubscriptionState <|-- SuspendedState
    SubscriptionState <|-- CancelledState
    SubscriptionState <|-- ExpiredState

    class Content {
        -id: string
        -title: string
        -description: string
        -type: string
        -releaseYear: number
        -durationMinutes: number
        -rating: number
        +addGenre(genre: Genre): void
    }

    class Genre {
        -id: string
        -name: string
    }

    class WatchHistory {
        -id: string
        -watchedDuration: number
        -completed: boolean
        -lastWatchedAt: Date
        +updateProgress(seconds: number): void
    }

    class Recommendation {
        -id: string
        -score: number
        -generatedAt: Date
    }

    class RecommendationStrategy {
        <<interface>>
        +generate(profile: Profile): Recommendation[]
    }

    class ContentBasedStrategy
    class CollaborativeFilteringStrategy
    class TrendingStrategy

    RecommendationStrategy <|.. ContentBasedStrategy
    RecommendationStrategy <|.. CollaborativeFilteringStrategy
    RecommendationStrategy <|.. TrendingStrategy

    class RecommendationEngine {
        -strategies: RecommendationStrategy[]
        +generate(profile: Profile): Recommendation[]
    }

    class Session {
        -id: string
        -deviceInfo: string
        -ipAddress: string
        -createdAt: Date
        -expiresAt: Date
        +isValid(): boolean
    }

    class StreamToken {
        -id: string
        -token: string
        -expiresAt: Date
        +isExpired(): boolean
    }

    class Job {
        -id: string
        -type: string
        -status: string
        -payload: object
        -attempts: number
        +process(): void
        +retry(): void
    }

    User "1" --> "*" Profile : owns
    User "1" --> "1" Subscription : has
    Subscription --> Plan : based_on

    Profile --> "*" WatchHistory : tracks
    Profile --> "*" Recommendation : receives
    Profile --> "*" StreamToken : generates

    Content --> "*" Genre : categorized_as
    WatchHistory --> Content : references
    Recommendation --> Content : suggests

    RecommendationEngine --> RecommendationStrategy : uses
    User --> "*" Session : creates
