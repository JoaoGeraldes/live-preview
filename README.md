# @contentful/live-preview

Preview SDK for both the field tagging connection + live content updates by [Contentful](https://www.contentful.com/).

It uses [Typescript](https://www.typescriptlang.org/), [React](https://reactjs.org/) and is bundled using [Vite](https://vitejs.dev/guide/build.html#library-mode).

## Getting started

### Requirements

- Node.js: `>=16.15.1`

To install live preview simply run one of the following commands.

```bash
yarn add @contentful/live-preview
```

or

```bash
npm install @contentful/live-preview
```

## Documentation

- [Developer Documentation](https://www.contentful.com/developers/docs/tutorials/general/live-preview/)

### Initializing the SDK

To establish a communication between your preview frontend and Contentful, you simply need to initialize the live preview SDK. This can be done by executing the following command:

```jsx
import { ContentfulLivePreview } from '@contentful/live-preview';

...

ContentfulLivePreview.init({ locale: 'en-US'});
```

#### Init Configuration

The init command also accepts a configuration object that allows you to customize your live preview SDK experience. The following options are available:

```jsx
import { ContentfulLivePreview } from '@contentful/live-preview';

...

ContentfulLivePreview.init({
  locale: 'set-your-locale-here' // This is required and allows you to set the locale once and have it reused throughout the preview
  enableInspectorMode: false, // This allows you to toggle the inspector mode which is on by default
  enableLiveUpdates: false, // This allows you to toggle the live updates which is on by default
  debugMode: false, // This allows you to toggle the debug mode which is off by default
});
```

#### Overriding Locale

It is possible to override the locale you set in the init command for a more flexible workflow. If you need to override the locale you can do so either in the getProps command like below:

```jsx
ContentfulLivePreview.getProps({ entryId: id, fieldId: 'title', locale: 'fr' });
```

You can also override it when using our useContentfulLiveUpdates hook like below:

```tsx
import { useContentfulLiveUpdates } from '@contentful/live-preview/react';

// ...
const updated = useContentfulLiveUpdates(originalData, locale);
// ...
```

### Inspector Mode (field tagging)

To use the inspector mode, you need to tag fields by adding the live preview data-attributes (`data-contentful-entry-id`, `data-contentful-field-id`) to the rendered HTML element output.

You can do this in React via our helper function.

The necessary styles for the live edit tags can be found in the `@contentful/live-preview/style.css` file.

```jsx
import { ContentfulLivePreview } from '@contentful/live-preview';
import '@contentful/live-preview/style.css';
...

<h1 {...ContentfulLivePreview.getProps({ entryId: id, fieldId: 'title' })}>
  {title}
</h1>
```

### Live Updates

Live Updates from the editor to your applications are out of the box only supported for [React.js](https://reactjs.org/) at the moment.
The updates are only happening on the **client-side** and in the Live preview environment of [contentful](https://app.contentful.com).

```tsx
import { useContentfulLiveUpdates } from '@contentful/live-preview/react';

// ...
const updated = useContentfulLiveUpdates(originalData);
// ...
```

#### Integration with Next.js

To use the Contentful LivePreivew SDK with [Next.js](https://nextjs.org), you can either use one of the contentful starter templates, or do the following steps to add it to an existing project.

1. Add the @contentful/live-preview package to your project

```bash
yarn add @contentful/live-preview
```

or

```bash
npm install @contentful/live-preview
```

2. Initialize the SDK with the `ContentfulLivePreviewProvider` and add the stylesheet for field tagging inside `_app.tsx` or `_app.js`.
   The `ContentfulLivePreviewProvider` accepts the same arguments as the [init function](#init-configuration).

```tsx
import '@contentful/live-preview/style.css';
import { ContentfulLivePreview } from '@contentful/live-preview/react';

const CustomApp = ({ Component, pageProps }) => (
  <ContentfulLivePreviewProvider>
    <Component {...pageProps}>
  </ContentfulLivePreviewProvider>
)
```

This provides the posibility to only enable live updates and the inspector mode inside the preview mode:

```tsx
import '@contentful/live-preview/style.css';
import { ContentfulLivePreview } from '@contentful/live-preview/react';

const CustomApp = ({ Component, pageProps }) => (
  <ContentfulLivePreviewProvider enableInspectorMode={pageProps.previewActive} enableLiveUpdates={pageProps.previewActive}>
    <Component {...pageProps}>
  </ContentfulLivePreviewProvider>
)
```

3. Add field tagging and live updates to your component

```tsx
export default function BlogPost: ({ blogPost }) {
  const inspectorProps = useContentfulInspectorMode()
  // Live updates for this component
  const data = useContentfulLiveUpdates(
    blogPost
  );

  return (
    <Section>
      <Heading as="h1">{data.heading}</Heading>
      {/* Text is tagged and can be clicked to open the editor */}
      <Text
        as="p"
        {...inspectorProps({
          entryId: data.sys.id,
          fieldId: 'text',
        })}>
        {data.text}
      </Text>
    </Section>
  );
}
```

> It doesn't matter if the data is loaded with getServerSideProps, getStaticProps or if you load it in any other way.<br>It's necessary that the provided information to `useContentfulLiveUpdate` contains the `sys.id` for identifation and only non-transformed fields can be updated.<br>(For GraphQL also the `__typename` needs to be provided)

**Tip:** If you want to tag multiple fields of an entry, you can also provide initial arguments to the hook:

```tsx
export default function BlogPost: ({ blogPost }) {
  const inspectorProps = useContentfulInspectorMode({ entryId: data.sys.id, locale })

  return (
    <Section>
      <Heading as="h1" {...inspectorProps({ fieldId: 'heading' })}>{data.heading}</Heading>
      <Text as="p" {...inspectorProps({ fieldId: 'text' })}>
        {data.text}
      </Text>
    </Section>
  )
```

4. Enable preview mode

We suggest using the [preview mode](https://nextjs.org/docs/advanced-features/preview-mode) and the [Content Preview API](https://www.contentful.com/developers/docs/references/content-preview-api/) for the best experience.

For a full guide checkout this [free course](https://www.contentful.com/nextjs-starter-guide/)

5. In Contentful, define the preview environment and configure the preview URL for your Next.js application. Once you open an entry with a configured preview URL, you can use the Live Preview and all its features.

That's it! You should now be able to use the Contentful Live Preview SDK with Next.js.

#### Integrating with Gatsby

To use the Contentful Live Preview SDK with Gatsby, you can start with the [gatsby starter contentful homepage](https://www.gatsbyjs.com/starters/gatsbyjs/gatsby-starter-contentful-homepage)

1. Add the @contentful/live-preview package to your Gatsby project by running one of the following commands:

```bash
yarn add @contentful/live-preview
```

or

```bash
npm install @contentful/live-preview
```

2. In your gatsby-browser.js file, import the live preview styles and initialize the SDK:

```tsx
import '@contentful/live-preview/style.css';

import React from 'react';
import { ContentfulLivePreview } from '@contentful/live-preview/react';

export const wrapRootElement = ({ element }) => (
  <ContentfulLivePreviewProvider>{element}</ContentfulLivePreviewProvider>
);
```

3. In order to tag fields and use live updates, you need to add the contentful_id property to the GraphQL schema. For example, to extend the HomepageHero interface:

```graphql
interface HomepageHero implements Node & HomepageBlock {
  id: ID!
  contentful_id: String! # add this property
  heading: String!
  text: String
}

type ContentfulHomepageHero implements Node & HomepageHero & HomepageBlock @dontInfer {
  id: ID!
  contentful_id: String! # and also here
  heading: String!
  text: String
}
```

4. Update the corresponding component to load the contentful_id property:

```jsx
export const query = graphql`
  fragment HomepageHeroContent on HomepageHero {
    __typename
    id
    contentful_id # add this property
    heading
    text
  }
`;
```

5. Add tagging and live updates to your component:

```jsx
export default function Hero({ contentful_id, ...props }) {
  const inspectorProps = useContentfulInspectorMode();
  // Live updates for this component
  const data = useContentfulLiveUpdates({
    ...props,
    sys: { id: props.contentful_id },
  });

  return (
    <Section>
      <Heading as="h1">{data.heading}</Heading>
      {/* Text is tagged and can be clicked to open the editor */}
      <Text
        as="p"
        {...inspectorProps({
          entryId: contentful_id,
          fieldId: 'text',
        })}>
        {data.text}
      </Text>
    </Section>
  );
}
```

6. In Contentful, define the preview environment and configure the preview URL for your Gatsby site. Once you open an entry with a configured preview URL, you can use the Live Preview and all its features.

That's it! You should now be able to use the Contentful Live Preview SDK with Gatsby.

## Code of Conduct

We want to provide a safe, inclusive, welcoming, and harassment-free space and experience for all participants, regardless of gender identity and expression, sexual orientation, disability, physical appearance, socioeconomic status, body size, ethnicity, nationality, level of experience, age, religion (or lack thereof), or other identity markers.

[Read our full Code of Conduct](https://github.com/contentful-developer-relations/community-code-of-conduct).

## License

The live preview package is open source software [licensed as MIT](./LICENSE).

[contentful]: https://www.contentful.com
[github-issues]: https://github.com/contentful/live-preview/issues
[typescript]: https://www.typescriptlang.org/
[react]: https://reactjs.org/
[prettier]: https://prettier.io/
[eslint]: https://eslint.org/
[vite]: https://vitejs.dev/
