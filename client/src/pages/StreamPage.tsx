import { Link, useParams } from "react-router-dom";

export function StreamPage() {
  const { streamId } = useParams<{ streamId: string }>();

  return (
    <main>
      <Link to="/">← К списку трансляций</Link>

      <h1>Страница трансляции</h1>

      <p>Stream ID: {streamId ?? "не указан"}</p>
    </main>
  );
}
