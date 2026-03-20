declare module "*.css?url" {
  const href: string;
  export default href;
}

declare module "./build/server" {
  import type { ServerBuild } from "react-router";

  const build: ServerBuild;
  export = build;
}
