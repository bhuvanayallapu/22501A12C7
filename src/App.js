import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useParams, Link } from "react-router-dom";
import { Logger } from "./loggerMiddleware";
import { isValidShortcode, generateShortcode } from "./utils/shortcode";

const DEFAULT_VALIDITY_MINUTES = 30;

function ShortenUrlPage({ urls, setUrls }) {
  const [originalUrl, setOriginalUrl] = useState("");
  const [customCode, setCustomCode] = useState("");
  const [validity, setValidity] = useState("");
  const [error, setError] = useState(null);
  const [shortened, setShortened] = useState(null);

  const existingCodes = new Set(urls.map((u) => u.shortcode));

  function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!originalUrl.trim()) {
      setError("Original URL is required.");
      Logger.log("error", { message: "Empty original URL submitted" });
      return;
    }

    try {
      new URL(originalUrl);
    } catch {
      setError("Invalid URL format.");
      Logger.log("error", { message: "Invalid URL format submitted", url: originalUrl });
      return;
    }

    let codeToUse = customCode.trim();

    if (codeToUse) {
      if (!isValidShortcode(codeToUse)) {
        setError("Custom shortcode must be alphanumeric and 4-10 characters long.");
        Logger.log("error", { message: "Invalid custom shortcode", shortcode: codeToUse });
        return;
      }
      if (existingCodes.has(codeToUse)) {
        setError("Custom shortcode already in use.");
        Logger.log("error", { message: "Duplicate custom shortcode", shortcode: codeToUse });
        return;
      }
    } else {
      codeToUse = generateShortcode(existingCodes);
    }

    let validityMinutes = parseInt(validity);
    if (isNaN(validityMinutes) || validityMinutes <= 0) {
      validityMinutes = DEFAULT_VALIDITY_MINUTES;
    }

    const now = Date.now();
    const expiresAt = now + validityMinutes * 60 * 1000;

    const newUrlObj = {
      originalUrl,
      shortcode: codeToUse,
      createdAt: now,
      expiresAt,
      clicks: 0,
    };

    setUrls((prev) => [...prev, newUrlObj]);
    setShortened(newUrlObj);
    Logger.log("url_created", newUrlObj);
  }

  return (
    <div className="container">
      <h2>URL Shortener</h2>
      <form onSubmit={handleSubmit} className="form">
        <label>
          Original URL:
          <input
            type="text"
            value={originalUrl}
            onChange={(e) => setOriginalUrl(e.target.value)}
            placeholder="https://example.com"
            required
          />
        </label>

        <label>
          Custom Shortcode (optional):
          <input
            type="text"
            value={customCode}
            onChange={(e) => setCustomCode(e.target.value)}
            placeholder="4-10 alphanumeric chars"
          />
        </label>

        <label>
          Validity (minutes, optional):
          <input
            type="number"
            value={validity}
            onChange={(e) => setValidity(e.target.value)}
            placeholder={`${DEFAULT_VALIDITY_MINUTES}`}
            min="1"
          />
        </label>

        <button type="submit">Shorten URL</button>
      </form>

      {error && <p className="error">{error}</p>}

      {shortened && (
        <div className="result">
          <p>
            Shortened URL:{" "}
            <Link to={`/${shortened.shortcode}`}>
              {window.location.origin}/{shortened.shortcode}
            </Link>
          </p>
          <p>Valid until: {new Date(shortened.expiresAt).toLocaleString()}</p>
          <p>
            <Link to={`/stats/${shortened.shortcode}`}>View Statistics</Link>
          </p>
        </div>
      )}
    </div>
  );
}

function RedirectPage({ urls, setUrls }) {
  const { shortcode } = useParams();

  useEffect(() => {
    const urlObj = urls.find((u) => u.shortcode === shortcode);

    if (!urlObj) {
      Logger.log("redirect_fail", { shortcode, reason: "Not found" });
      return;
    }

    const now = Date.now();
    if (urlObj.expiresAt < now) {
      Logger.log("redirect_fail", { shortcode, reason: "Expired" });
      return;
    }

    setUrls((prev) =>
      prev.map((u) =>
        u.shortcode === shortcode ? { ...u, clicks: u.clicks + 1 } : u
      )
    );

    Logger.log("redirect_success", { shortcode, originalUrl: urlObj.originalUrl });

    setTimeout(() => {
      window.location.href = urlObj.originalUrl;
    }, 500);
  }, [shortcode, urls, setUrls]);

  const urlObj = urls.find((u) => u.shortcode === shortcode);

  if (!urlObj) return <p>Short URL not found.</p>;
  if (urlObj.expiresAt < Date.now()) return <p>Short URL has expired.</p>;

  return <p>Redirecting...</p>;
}

function StatsPage({ urls }) {
  const { shortcode } = useParams();
  const urlObj = urls.find((u) => u.shortcode === shortcode);

  if (!urlObj) return <p>No statistics found for this shortcode.</p>;

  return (
    <div className="container">
      <h2>Statistics for {shortcode}</h2>
      <p><strong>Original URL:</strong> {urlObj.originalUrl}</p>
      <p><strong>Created At:</strong> {new Date(urlObj.createdAt).toLocaleString()}</p>
      <p><strong>Expires At:</strong> {new Date(urlObj.expiresAt).toLocaleString()}</p>
      <p><strong>Clicks:</strong> {urlObj.clicks}</p>
      <p>
        Short URL:{" "}
        <a href={`/${shortcode}`}>
          {window.location.origin}/{shortcode}
        </a>
      </p>
      <p><Link to="/">Back to Shortener</Link></p>
    </div>
  );
}

function App() {
  const [urls, setUrls] = useState([]);

  // Periodically remove expired URLs
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setUrls((prev) => prev.filter((u) => u.expiresAt > now));
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<ShortenUrlPage urls={urls} setUrls={setUrls} />} />
        <Route path="/stats/:shortcode" element={<StatsPage urls={urls} />} />
        <Route path="/:shortcode" element={<RedirectPage urls={urls} setUrls={setUrls} />} />
      </Routes>
    </Router>
  );
}

export default App;
