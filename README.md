# Harper Next.js Example

A [Next.js](https://nextjs.org) app running on Harper with [`@harperfast/nextjs`](https://github.com/HarperFast/nextjs): a small "Doggy Management System" that lists, adds and deletes dogs stored in a Harper table.

Because the app runs _inside_ Harper, its server-side code reads and writes the database directly through the [Resource API](https://docs.harperdb.io/reference/v5/resources/overview), with no separate API server and no network round-trip.

## Get Started

1. Clone this repository.
2. Run `npm install`. This also installs the `harper` CLI the scripts use, as a dev dependency.
3. Run `npm run dev`. It runs `next build`, then starts Harper with this app (`harper dev .`).
4. Open [http://localhost:9926](http://localhost:9926) 🎉

## How It Works

This app is a [Harper component](https://docs.harperdb.io/reference/v5/components/overview). [`config.yaml`](./config.yaml) loads two things:

- `graphqlSchema` reads [`schema.graphql`](./schema.graphql), which defines the `Dog` table.
- The `@harperfast/nextjs` plugin runs the Next.js app inside Harper and serves it.

**Server actions use Harper's globals.** Harper injects `tables` and `transaction` globals into server-side code, so the [server actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations) in [`app/actions.js`](./app/actions.js) use `tables.Dog` directly, with no import. Don't add `import 'harper'` to server code: that import runs during `next build`, where it conflicts with the database, and it does not survive a build made in CI. The globals exist only on the server, and only while Harper runs the app, so each action checks for the table first.

Putting the data access in server actions lets server _and_ client components share it: the server component [`app/dogs/page.js`](./app/dogs/page.js) calls `listDogs` and submits its form to `createDog`, and the client component [`app/ui/DeleteButton.js`](./app/ui/DeleteButton.js) calls `deleteDog`. Any server action a client can reach is a public endpoint, and this example lets anyone add or delete a dog; add your own authorization checks before shipping mutations that matter.

**Visitors' dogs don't last.** Because anyone can add a dog, [`app/dogInput.js`](./app/dogInput.js) accepts only names, breeds and colors made of words, never links, and the form's inputs carry the same patterns. The `Dog` table also declares `@table(expiration: 3600)`, so each dog expires an hour after it was written and Harper's periodic eviction sweep deletes it, with no cleanup job of the app's own. Until that sweep runs, `/dogs` can still list an expired dog, and changing or dropping the value affects only dogs written afterwards. See [table expiration](https://docs.harper.fast/reference/v5/database/schema) in Harper's docs.

**The app is prebuilt.** `config.yaml` sets `prebuilt: true`, so the plugin serves the `.next` that `next build` produced instead of building when Harper starts. Building on a Harper cluster currently fails ([HarperFast/nextjs#57](https://github.com/HarperFast/nextjs/issues/57), [HarperFast/nextjs#58](https://github.com/HarperFast/nextjs/issues/58)), so every script that starts or deploys the app (`dev`, `start`, `deploy`, `test:integration`) runs `next build` first, and the workflows build in CI and deploy the result.

## Scripts

| Script                          | What it does                                                                                                 |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `npm run dev`                   | Builds, then runs the app in Harper. Run it again after an edit: it serves the build, without hot reloading. |
| `npm start`                     | Builds, then runs the app in Harper.                                                                         |
| `npm run build`                 | Runs `next build`.                                                                                           |
| `npm run lint`                  | Runs ESLint.                                                                                                 |
| `npm run deploy`                | Builds, then deploys this directory to your cluster as the user you logged in with.                          |
| `npm run deploy:setup-ci`       | One-time setup for [deploying from GitHub Actions](#deploying-from-github-actions).                          |
| `npm run deploy:setup-previews` | One-time setup for [pull request previews](#pull-request-previews).                                          |
| `npm run test:integration`      | Builds, then boots the app in a throwaway Harper and runs [`integrationTests/`](./integrationTests).         |

## Deploying From GitHub Actions

[`.github/workflows/deploy.yaml`](./.github/workflows/deploy.yaml) lints and builds every pull request, and deploys to your Harper cluster when a change merges to `main`. It stores no Harper password or token in GitHub: the deploy job uses [`HarperFast/deploy-action`](https://github.com/HarperFast/deploy-action), which authenticates with the run's GitHub OIDC identity token, under a trust policy on the cluster. The build runs in the test job, and the deploy job uploads it, so your dependencies' install and build scripts never run where that token can be requested.

To set it up, push the project to GitHub, create a cluster (for example on [Harper Fabric](https://fabric.harper.fast/)), and log the CLI in to it as a super user:

```sh
npx harper login
```

Then, from this directory, run the one-time setup. It needs the Harper 5.4 or later CLI, which `npm install` installed here as a dev dependency:

```sh
npm run deploy:setup-ci
```

It creates a deploy-only role and user, and a trust policy that accepts tokens from `deploy.yaml` on `main` in the `production` environment. With the [`gh` CLI](https://cli.github.com) signed in, it also sets the `HARPER_CLI_TARGET` repository variable. Then merge to `main`, or run the workflow from the **Actions** tab. [Deploying from CI](https://docs.harper.fast/learn/developers/deploying-from-ci) explains how the workflow authenticates and what the setup creates.

This workflow replaces the earlier `build-and-deploy.yml`, which deployed with a username and password. Once the new workflow has deployed, delete its `HDB_TARGET`, `HDB_USERNAME` and `HDB_PASSWORD` secrets under **Settings → Secrets and variables → Actions**.

## Pull Request Previews

Each pull request from a branch of this repository can get its own copy of the app on the cluster, at its own URL. The URL is posted as a comment on the pull request, and the preview is dropped when the pull request closes. Pull requests from forks get no preview.

Previews use two workflows, because building runs the pull request's code and its dependencies' scripts, which must not happen in a job that can request the cluster's identity token:

- [`preview-build.yaml`](./.github/workflows/preview-build.yaml) runs on `pull_request` with a read-only token. It installs the dependencies, runs `next build`, and uploads the app directory, `.next` included, as an artifact.
- [`preview.yaml`](./.github/workflows/preview.yaml) runs on `pull_request_target`, so it always runs as it is on `main`, and it holds the identity token. It never checks out or runs the pull request's code: it waits for that commit's build, downloads it, and deploys the directory with `HarperFast/deploy-action`. When the pull request closes, its cleanup job drops the preview.

The app is uploaded rather than fetched by the cluster, because the commit has no `.next` in it and Next.js can't build on the cluster.

Previews need every node of the cluster on Harper 5.4 or later, and a cluster that can run isolated applications; see [Per-PR previews](https://docs.harper.fast/learn/developers/deploying-from-ci#per-pr-previews) for the requirements. To set them up:

1. Have both workflow files on `main`. GitHub runs a `pull_request_target` workflow as it is on the default branch, never as a pull request changes it.
2. Under **Settings → Environments**, create a `preview` environment for the deploy job and a `preview-cleanup` environment for the cleanup job, and allow `main` under each one's deployment branches. Add required reviewers to `preview` if you want to approve each preview deploy; keep them off `preview-cleanup`, so a closed pull request's preview is never left waiting for an approval.
3. Log the CLI in to the cluster as a super user with `npx harper login`, sign in to the [`gh` CLI](https://cli.github.com), and run this once from this directory:

   ```sh
   npm run deploy:setup-previews
   ```

   It checks `preview.yaml` and refuses a workflow that would give a fork or a pull request's code the preview identity. It then enables previews on the cluster and sets the `HARPER_PREVIEW_TARGET` repository variable. Until that variable is set, the preview workflow does nothing.

This repository is public. From December 2, 2026, GitHub blocks `pull_request_target` in public repositories unless a policy allows it, so allow it for `preview.yaml`; see [Allowing `pull_request_target`](https://github.com/HarperFast/deploy-action#allowing-pull_request_target).

For what a Next.js app needs on top of Harper's previews, such as how previews share or branch the cluster's data and Next.js caches, see [Pull request previews](https://github.com/HarperFast/nextjs#pull-request-previews) in the plugin's README.

## Keep Going

- [`@harperfast/nextjs`](https://github.com/HarperFast/nextjs) for the plugin's options.
- [Harper documentation](https://docs.harper.fast) for building and deploying Harper applications.
