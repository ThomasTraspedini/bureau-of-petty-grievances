import { fallbackCatalog } from "@/i18n/catalogs";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

export default function NotFound() {
  const copy = fallbackCatalog.NotFound;

  return (
    <main className="not-found" id="main-content">
      <div>
        <p className="eyebrow">{copy.eyebrow}</p>
        <h1>{copy.title}</h1>
        <p>{copy.body}</p>
        <Link
          className="button button-primary"
          href="/"
          locale={routing.defaultLocale}
        >
          {copy.action}
        </Link>
      </div>
    </main>
  );
}
