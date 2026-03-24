import { useRouteError } from "react-router-dom";

export default function RouteError() {
  const err = useRouteError();
  const message = err instanceof Error ? err.message : String(err);

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>Route crashed</h1>
      <pre style={{ marginTop: 12, whiteSpace: "pre-wrap" }}>
        {message}
      </pre>
    </div>
  );
}
