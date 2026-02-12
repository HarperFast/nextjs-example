# Harper Next.js Example

This is an example of how to use [`@harperdb/nextjs`](https://github.com/HarperDB/nextjs) to develop a Next.js application with Harper.

The Next.js application can interact with the database through the [Resource API](https://docs.harperdb.io/docs/technical-details/reference/resource) directly instead of relying on network operations. This is significantly more efficient and enables a better application development experience.

<!--
TODO: Re-record video with new application steps
> [!TIP]
> Watch a walkthrough of this example here: [Next.js on HarperDB | Step-by-Step Guide for Next Level Next.js Performance](https://youtu.be/GqLEwteFJYY)
-->

## Get Started

1. Clone this repo locally
2. Run `npm install`
3. Run `npm run dev`
4. Open [http://localhost:9926](http://localhost:9926) 🎉

### Remote Deployment

The easiest way to demonstrate this application remotely is to use the `prebuilt: true` option and the [Harper CLI](https://docs.harperdb.io/docs/deployments/harper-cli#operations-api-through-the-cli).

1. Locally or in a CI environment, create a build using `npm run build`
2. Modify `config.yaml` to include `prebuilt: true` under the `@harperdb/nextjs` component
3. Then deploy the prebuilt application using the Harper CLI:

```bash
harperdb deploy \
	target="<operations api url>" \
	username="<username>" \
	password='<password>' \
	project=nextjs-example \
	skip_node_modules=false \
	replicated=true \
	restart=true
```

Check out the included [build and deploy workflow](./.github/workflows/build-and-deploy.yml) for an example of how to automate this process.

## How does it work?

This example in and of itself is a [HarperDB Component](https://docs.harperdb.io/docs/developers/components), and is reliant on the `@harperdb/nextjs` extension in order to access the [Harper Resource API](https://docs.harperdb.io/docs/technical-details/reference/resources). The globals are only available on server-side code paths such as [server actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations) and [server components](https://nextjs.org/docs/app/building-your-application/rendering/server-components). Any code paths using HarperDB globals must first import the `harperdb` package (i.e. `import('harperdb')`).

> [!TIP]
> Use the `harperdb-nextjs` CLI (part of the `@harperdb/nextjs` package) to replace the Next.js CLI. For example, `next dev` becomes `harperdb-nextjs dev`. This CLI handles running HarperDB and providing sensible configuration values for the `@harperdb/nextjs` component.

Based on Next.js best practices, it is recommended to use this in **server actions** so that server _and client_ components can both access the same functions. This example demonstrates this pattern by defining two server actions, `listDogs` and `getDog` (located in [./app/actions.js](./app/actions.js)). These are then used throughout the application, in both [Client](./app/client-component.js) and [Server](./app/dogs/[id]/page.js) components!
