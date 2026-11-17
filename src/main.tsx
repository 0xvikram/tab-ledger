import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

// The marketing pages load without Firebase; the app bundle loads only on /app.
const Landing = lazy(() => import("./site/Landing"));
const Privacy = lazy(() => import("./site/Legal").then((m) => ({ default: m.Privacy })));
const Terms = lazy(() => import("./site/Legal").then((m) => ({ default: m.Terms })));
const App = lazy(() => import("./App"));

function route() {
  const p = location.pathname.replace(/\/+$/, "") || "/";
  if (p === "/app/demo") return <App demo />;
  if (p === "/app" || p.startsWith("/app/")) return <App />;
  if (p === "/privacy") return <Privacy />;
  if (p === "/terms") return <Terms />;
  return <Landing />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Suspense fallback={<div className="boot" />}>{route()}</Suspense>
  </StrictMode>,
);
