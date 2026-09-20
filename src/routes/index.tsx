import { createFileRoute } from "@tanstack/react-router";
import { Gallery } from "@/components/gallery";
import { optionsToSearch, readSearch, searchToOptions, type SpriteOptions } from "@/lib/sprite";

export const Route = createFileRoute("/")({
  // Every generator setting lives in the URL, so a set can be shared,
  // bookmarked and reloaded — and the server renders exactly what the browser
  // will hydrate. All of them stay optional: a bare `/` must not redirect.
  validateSearch: (search: Record<string, unknown>) => readSearch(search),
  component: Home,
});

function Home() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const options = searchToOptions(search);

  return (
    <main>
      <Gallery
        options={options}
        // `replace` on purpose: the number fields write on every keystroke,
        // and that must not flood the back button.
        onOptionsChange={(patch: Partial<SpriteOptions>) =>
          void navigate({
            search: optionsToSearch({ ...options, ...patch }),
            replace: true,
          })
        }
      />
    </main>
  );
}
