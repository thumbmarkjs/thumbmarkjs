# Contributing to ThumbmarkJS

Thank you for considering contributing to ThumbmarkJS\! Whether you're fixing a bug, improving documentation, or building a new fingerprint component, your help is appreciated.

## Ground rules

- Open an issue before starting any significant piece of work, so we can align before you invest time building it  
- All pull requests must include tests and pass the existing test suite  
- Keep pull requests focused — one feature or fix per PR  
- Be respectful and considerate in all interactions — see our [Code of Conduct](CODE_OF_CONDUCT.md)

## What we need most

The most valuable contributions are **new fingerprint components** — additional browser signals that improve uniqueness. Other welcome contributions include bug fixes, performance improvements, and documentation improvements.

## Suggesting and building a new component

Open an issue describing:

- What you want to add and why  
- What browser signal it measures and how it adds entropy to the fingerprint  
- How it should work

This gives us a chance to discuss before you invest time building.

New components live in `src/components/`, each in their own folder with an `index.ts`. A component is a function that returns a `Promise<componentInterface>` and optionally accepts an `optionsInterface` parameter:

```ts
import { componentInterface } from '../../factory';
import { optionsInterface } from '../../options';

export default function getMyComponent(options?: optionsInterface): Promise<componentInterface> {
    return new Promise((resolve) => {
        const result: componentInterface = {
            'my_signal': 'value'
        };
        resolve(result);
    });
}
```

Once written, register it in `factory.ts` by adding it to `tm_component_promises`:

```ts
export const tm_component_promises = {
    // existing components...
    'my_component': getMyComponent,
};
```

Each component should:

- Return a deterministic value for the same browser environment  
- Be self-contained and not depend on other components (though, you might want to use the getBrowser() if logic requires)   
- Include unit tests  
- Include a brief description of what it measures and why it adds entropy to the fingerprint

## Reporting a bug

Before opening an issue, check whether the bug has already been reported.

When filing a bug report, include:

- ThumbmarkJS version  
- Browser and OS  
- What you did  
- What you expected to happen  
- What actually happened

For general questions, the [Discord](https://discord.gg/PAqxQ3TnDA) is the best place to ask.

## Security vulnerabilities

Please do **not** open a public issue for security vulnerabilities. Email [contact@thumbmarkjs.com](mailto:contact@thumbmarkjs.com) instead.

## Getting started

### Prerequisites

- Node.js  
- npm

### Setup

```shell
git clone https://github.com/thumbmarkjs/thumbmarkjs.git
cd thumbmarkjs
npm install
```

### Building

```shell
npm run build
```

### Running tests

Unit tests (Jest):

```shell
npm test
```

End-to-end tests (Playwright):

```shell
npm run test:e2e
```

## Submitting a pull request

1. Fork the repository and create a branch from `main`  
2. Make your changes  
3. Add tests covering your changes  
4. Make sure all existing tests pass  
5. If contributing a new component, include a note on its performance impact — how much it adds to the total fingerprinting time  
6. Open a pull request with a clear description of what you've changed and why

Pull requests that don't include tests or break existing tests will not be merged.

Working on your first pull request? [How to Contribute to an Open Source Project on GitHub](https://egghead.io/courses/how-to-contribute-to-an-open-source-project-on-github) is a great free resource.

## Code review process

Pull requests are reviewed by the maintainers. You can expect an initial response within a reasonable timeframe. If changes are requested, please address them promptly — PRs with no activity may be closed after a while.

## Questions?

Join the [Discord](https://discord.gg/PAqxQ3TnDA) or email [contact@thumbmarkjs.com](mailto:contact@thumbmarkjs.com).  
