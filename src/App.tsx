import { useEffect } from "react";
import { Layout } from "./components/Layout";
import { Empty } from "./components/ui";
import { applyAppearance } from "./lib/appearance";
import { CONTENT, isContentType } from "./lib/content";
import { Link, useRoute } from "./lib/router";
import { settingsStore } from "./lib/store";
import { Browse } from "./pages/Browse";
import { CollectionPage, Collections } from "./pages/Collections";
import { Home } from "./pages/Home";
import { ProfilePage } from "./pages/Profile";
import { ProfileEdit } from "./pages/ProfileEdit";
import { ProjectPage } from "./pages/ProjectPage";
import { Download } from "./pages/Download";
import { Publish } from "./pages/Publish";
import { ResetPassword, SignIn } from "./pages/SignIn";
import { SettingsPage } from "./pages/Settings";
import { Stats } from "./pages/Stats";

function useTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} · Neptune` : "Neptune";
  }, [title]);
}

function Routes() {
  const { segments } = useRoute();
  const [a, b, c] = segments;

  let title = "";
  let page: React.ReactNode;
  if (!a) page = <Home />;
  else if (a === "browse" && b && isContentType(b)) {
    title = CONTENT[b].label;
    page = <Browse key={b} type={b} />;
  } else if (a === "project" && (b === "neptune" || b === "modrinth" || b === "curseforge") && c) {
    page = <ProjectPage key={`${b}/${c}`} source={b} id={c} />;
  } else if (a === "publish") [title, page] = ["Publish", <Publish />];
  else if (a === "download") [title, page] = ["Download the launcher", <Download />];
  else if (a === "signin") [title, page] = ["Sign in", <SignIn />];
  else if (a === "reset-password") [title, page] = ["Reset password", <ResetPassword />];
  else if (a === "collections" && !b) [title, page] = ["Collections", <Collections />];
  else if (a === "collections" && b) [title, page] = ["Collection", <CollectionPage id={b} />];
  else if (a === "profile" && b === "edit") [title, page] = ["Customize profile", <ProfileEdit />];
  else if (a === "profile") [title, page] = ["Profile", <ProfilePage />];
  else if (a === "stats") [title, page] = ["Creator stats", <Stats />];
  else if (a === "settings") [title, page] = ["Settings", <SettingsPage />];
  else {
    title = "Not found";
    page = (
      <Empty title="Page not found">
        <Link to="/" className="text-accent underline underline-offset-2">
          Go home
        </Link>
      </Empty>
    );
  }
  useTitle(title);
  return <>{page}</>;
}

export function App() {
  const settings = settingsStore.use();
  useEffect(() => {
    applyAppearance(settings);
  }, [settings]);
  return (
    <Layout>
      <Routes />
    </Layout>
  );
}
