import { build, emptyDir } from "@deno/dnt";

await emptyDir("./npm");

await build({
  entryPoints: ["./mod.ts"],
  outDir: "./npm",
  shims: {
    // see JS docs for overview and more options
    deno: true,
  },
  package: {
    // package.json properties
    name: "@cowboysandwitches/paypal-utils",
    version: Deno.args[0],
    description: "",
    license: "GPLv3",
    repository: {
      type: "git",
      url: "git+https://github.com/cowboysandwitches/paypal-utils",
    },
    bugs: {
      url: "https://github.com/cowboysandwitches/paypal-utils/issues",
    },
  },
  postBuild() {
    // steps to run after building and before running the tests
    Deno.copyFileSync("LICENSE", "npm/LICENSE");
    Deno.copyFileSync("README.md", "npm/README.md");
  },
});
