# Harper Next.js Example

This is an example of how to use [`@harperfast/nextjs`](https://github.com/HarperFast/nextjs) to develop a Next.js application with Harper.

The Next.js application can interact with the database through the [Resource API](https://docs.harperdb.io/reference/v5/resources/overview) directly instead of relying on network operations. This is significantly more efficient and enables a better application development experience.

## Get Started

1. Clone this repo locally
2. Run `npm install`
3. Run `npm run dev`
4. Open [http://localhost:9926](http://localhost:9926) 🎉

### Remote Deployment

The easiest way to demonstrate this application remotely is to use the `prebuilt: true` option and the Harper [`deploy`](https://docs.harperdb.io/reference/v5/components/applications#remote-management) CLI command.

1. Locally or in a CI environment, create a build using `npm run build`
2. Modify `config.yaml` to include `prebuilt: true` under the `@harperfast/nextjs` component
3. Then deploy the prebuilt application using the Harper CLI:

```bash
harperdb deploy \
	target="<operations api url>" \
	username="<username>" \
	password='<password>' \
	project=nextjs-example \
	package=HarperFast/nextjs-example \
	skip_node_modules=false \
	replicated=true \
	restart=true
```

Check out the included [build and deploy workflow](./.github/workflows/deploy.yml) for an example of how to automate this process.

## How does it work?

This example in and of itself is a [Harper Component](https://docs.harperdb.io/reference/v5/components/overview), and is reliant on the `@harperfast/nextjs` plugin in order to access the [Harper Resource API](https://docs.harperdb.io/reference/v5/resources/overview). The globals are only available on server-side code paths such as [server actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations) and [server components](https://nextjs.org/docs/app/building-your-application/rendering/server-components). Any code paths using Harper globals must first import the `harper` package (i.e. `import('harper')`).

Based on Next.js best practices, it is recommended to use this in **server actions** so that server _and client_ components can both access the same functions. This example demonstrates this pattern by defining two server actions, `listDogs` and `getDog` (located in [./app/actions.js](./app/actions.js)). These are then used throughout the application, in both [Client](./app/client-component.js) and [Server](./app/dogs/[id]/page.js) components!
