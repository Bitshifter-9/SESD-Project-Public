import { useEffect, useMemo, useState } from "react";

type AuthResponse = {
  token: string;
  user: { id: string; email: string; role: string };
};

type ContentItem = {
  id: string;
  title: string;
  description: string;
  type: string;
  rating: number;
  releaseYear: number;
  contentGenres?: Array<{
    genre: {
      name: string;
    };
  }>;
};

type PlaybackResult = {
  status: "success" | "error";
  contentId: string;
  streamUrl?: string;
  expiresAt?: string;
  error?: string;
};

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8080/api";
const API_ORIGIN = API_BASE.replace(/\/api\/?$/, "");

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }

  return data;
}

export function App() {
  const [email, setEmail] = useState("admin@streamcore.local");
  const [password, setPassword] = useState("admin123");
  const [profileId, setProfileId] = useState("");
  const [token, setToken] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [message, setMessage] = useState("Ready");
  const [content, setContent] = useState<ContentItem[]>([]);
  const [recommendations, setRecommendations] = useState<Array<{ score: number; reason: string; content: ContentItem }>>([]);
  const [playbackResult, setPlaybackResult] = useState<PlaybackResult | null>(null);

  const loggedIn = useMemo(() => token.length > 0, [token]);

  useEffect(() => {
    void fetchContent();
  }, []);

  const register = async () => {
    try {
      await request<{ id: string; email: string }>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      setMode("login");
      setMessage("Account created with starter plan. You can now login.");
    } catch (error) {
      setMessage((error as Error).message);
    }
  };

  const login = async () => {
    try {
      const data = await request<AuthResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password, deviceInfo: "web-client" })
      });
      setToken(data.token);
      setMessage(`Logged in as ${data.user.email}`);
      await fetchContent();
    } catch (error) {
      setMessage((error as Error).message);
    }
  };

  const fetchContent = async () => {
    try {
      const data = await request<ContentItem[]>("/content");
      setContent(data);
      setMessage(`Catalog loaded from backend DB: ${data.length} items`);
    } catch (error) {
      setMessage((error as Error).message);
    }
  };

  const createProfile = async (): Promise<string | null> => {
    if (!loggedIn) {
      setMessage("Login first");
      return null;
    }

    try {
      const data = await request<{ id: string }>(
        "/profiles",
        {
          method: "POST",
          body: JSON.stringify({ name: "Main Profile", isChild: false })
        },
        token
      );
      setProfileId(data.id);
      setMessage(`Profile ready: ${data.id}`);
      return data.id;
    } catch (error) {
      setMessage((error as Error).message);
      return null;
    }
  };

  const play = async (contentId: string) => {
    if (!token) {
      setMessage("Login first before playback");
      return;
    }

    try {
      setPlaybackResult(null);
      let activeProfileId = profileId;
      if (!activeProfileId) {
        const createdProfileId = await createProfile();
        if (!createdProfileId) {
          setMessage("Could not create profile for playback");
          return;
        }
        activeProfileId = createdProfileId;
      }

      const data = await request<{ streamUrl: string }>(
        `/content/play/${contentId}`,
        {
          method: "POST",
          body: JSON.stringify({ profileId: activeProfileId })
        },
        token
      );

      const absoluteStreamUrl = `${API_ORIGIN}${data.streamUrl}`;
      const verifyResponse = await fetch(absoluteStreamUrl);
      const verifyData = await verifyResponse.json();

      if (!verifyResponse.ok) {
        throw new Error(verifyData.error || "Stream authorization failed");
      }

      setMessage(
        `Playback authorized for ${contentId}. Expires at ${new Date(verifyData.expiresAt).toLocaleString()}`
      );
      setPlaybackResult({
        status: "success",
        contentId,
        streamUrl: absoluteStreamUrl,
        expiresAt: verifyData.expiresAt
      });
    } catch (error) {
      const errorMessage = (error as Error).message;
      setMessage(errorMessage);
      setPlaybackResult({
        status: "error",
        contentId,
        error: errorMessage
      });
    }
  };

  const getRecommendations = async () => {
    if (!token || !profileId) {
      setMessage("Need login + profile before recommendations");
      return;
    }

    try {
      const data = await request<Array<{ score: number; reason: string; content: ContentItem }>>(
        `/content/recommendations/${profileId}`,
        { method: "GET" },
        token
      );
      setRecommendations(data);
      setMessage(`Generated ${data.length} recommendations`);
    } catch (error) {
      setMessage((error as Error).message);
    }
  };

  return (
    <main className="page">
      <section className="hero card">
        <p className="kicker">StreamCore</p>
        <h1>Control Room</h1>
        <p className="subtitle">Backend-heavy streaming platform with recommendations, subscriptions, playback security, and admin analytics.</p>
      </section>

      <section className="grid">
        <article className="card">
          <h2>{mode === "login" ? "Login" : "Create Account"}</h2>
          <div className="form-row">
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
            <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" />
          </div>
          {mode === "login" ? (
            <button onClick={login}>Login</button>
          ) : (
            <button onClick={register}>Create Account</button>
          )}
          <button onClick={() => setMode(mode === "login" ? "register" : "login")} className="ghost">
            {mode === "login" ? "Switch to Register" : "Switch to Login"}
          </button>
          <button onClick={createProfile} className="ghost">Create Profile</button>
          <p className="tiny">Profile: {profileId || "not created"}</p>
        </article>

        <article className="card">
          <h2>Catalog</h2>
          <button onClick={fetchContent}>Load Content</button>
          <p className="tiny">This catalog is loaded from the backend content table seeded in PostgreSQL.</p>
          <p className="tiny">Play now performs token generation and stream authorization check.</p>
          <ul className="content-list">
            {content.map((item) => (
              <li key={item.id}>
                <div>
                  <strong>{item.title}</strong>
                  <span>{item.type} · {item.releaseYear} · {item.rating.toFixed(1)}</span>
                  <p className="catalog-desc">{item.description}</p>
                  <small className="catalog-tags">
                    Genres: {(item.contentGenres ?? []).map((entry) => entry.genre.name).join(", ") || "Uncategorized"}
                  </small>
                </div>
                <button onClick={() => play(item.id)}>Play</button>
              </li>
            ))}
          </ul>
        </article>

        <article className="card full">
          <h2>Recommendations</h2>
          <button onClick={getRecommendations}>Generate</button>
          <div className="reco-grid">
            {recommendations.map((item) => (
              <div className="reco" key={item.content.id}>
                <h3>{item.content.title}</h3>
                <p>{item.reason}</p>
                <small>Score: {item.score.toFixed(3)}</small>
              </div>
            ))}
          </div>
        </article>

        <article className="card full">
          <h2>Playback Result</h2>
          {!playbackResult ? (
            <p className="tiny">No playback attempt yet. Click Play on any catalog item.</p>
          ) : playbackResult.status === "success" ? (
            <div className="playback-result success">
              <p><strong>Status:</strong> Authorized</p>
              <p><strong>Content:</strong> {playbackResult.contentId}</p>
              <p><strong>Expires:</strong> {new Date(playbackResult.expiresAt ?? "").toLocaleString()}</p>
              <p><strong>Stream URL:</strong> {playbackResult.streamUrl}</p>
            </div>
          ) : (
            <div className="playback-result error">
              <p><strong>Status:</strong> Failed</p>
              <p><strong>Content:</strong> {playbackResult.contentId}</p>
              <p><strong>Reason:</strong> {playbackResult.error}</p>
            </div>
          )}
        </article>
      </section>

      <footer className="status card">
        <p>{message}</p>
      </footer>
    </main>
  );
}
