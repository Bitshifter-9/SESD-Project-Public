# StreamCore — Use Case Diagram

```mermaid
flowchart LR

    %% Actors
    Viewer([Viewer])
    Admin([Admin])
    Worker([Background Worker])

    %% System Boundary
    subgraph StreamCore

        %% Viewer Use Cases
        UC1((Register))
        UC2((Login))
        UC3((Manage Profiles))
        UC4((Browse Content))
        UC5((Search Content))
        UC6((Play Content))
        UC7((Resume Playback))
        UC8((View Recommendations))
        UC9((Manage Subscription))
        UC10((Manage Devices))

        %% Internal Includes
        UC11((Validate Subscription))
        UC12((Generate Stream Token))
        UC13((Run Hybrid Recommendation Engine))
        UC14((Update Watch Progress))

        %% Admin Use Cases
        UC15((Add / Update Content))
        UC16((Manage Genres))
        UC17((Manage Plans))
        UC18((Manage Users))
        UC19((View Analytics Dashboard))
        UC20((Monitor System Health))

        %% Background Jobs
        UC21((Recalculate Recommendations))
        UC22((Process Subscription Renewals))
        UC23((Clean Expired Sessions))
    end

    %% Viewer Connections
    Viewer --> UC1
    Viewer --> UC2
    Viewer --> UC3
    Viewer --> UC4
    Viewer --> UC5
    Viewer --> UC6
    Viewer --> UC7
    Viewer --> UC8
    Viewer --> UC9
    Viewer --> UC10

    %% Includes
    UC6 --> UC11
    UC6 --> UC12
    UC8 --> UC13
    UC7 --> UC14

    %% Admin Connections
    Admin --> UC15
    Admin --> UC16
    Admin --> UC17
    Admin --> UC18
    Admin --> UC19
    Admin --> UC20

    %% Background Worker
    Worker --> UC21
    Worker --> UC22
    Worker --> UC23
