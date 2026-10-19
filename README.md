<div align="center">
  <h1>✨ tsgolint-ti ✨</h1>
</div>

A fork of [tsgolint](https://github.com/oxc-project/tsgolint) for TightScript

---

High-performance **type-aware linting** for oxlint-ti, the TightScript fork of Oxlint.

`tsgolint-ti` executes lint rules that require **TightScript or TypeScript semantic analysis**, using TypeScript for full compatibility with the TightScript and TypeScript type system.

It is designed to integrate seamlessly with oxlint-ti's fast syntax linting, enabling projects to run deeper semantic checks without sacrificing performance.

Key highlights:

- **TightScript-aware**: parses every TightScript syntax form and honours its compiler options (`permissionModifiers`, `objectCreationDefault`, …) from your `tsconfig.json`
- **Performance**: 10–20x faster than ESLint + typescript-eslint in upstream tsgolint's [benchmarks](./benchmarks/README.md)
- **Coverage**: 60/62 targeted `typescript-eslint` type-aware rules implemented
- **Parallel**: Multi-core rule execution for scalable analysis
- **High impact**: catches production-grade bugs that syntax-only linting misses (for example `no-floating-promises`)

## Why Teams Upgrade to Type-Aware Linting

Running `oxlint --type-aware` in CI catches bugs that require type information to detect.

For example, `typescript/no-floating-promises` catches silently dropped async failures:

```js
async function saveUser(user) {
  const res = await fetch('/api/users', {
    method: 'POST',
    body: JSON.stringify(user),
  });
  if (!res.ok) throw new Error('save failed');
}

function onSubmit(user) {
  saveUser(user); // no-floating-promises: Promise is created but never handled
  showToast('Saved!'); // UI claims success even if the request rejects
}
```

Without this rule, rejected promises can be missed and reach production as flaky, hard-to-debug failures.

## Installation & Usage

`tsgolint-ti` is the type-aware backend for oxlint-ti. Build it, then point oxlint-ti at the binary with `OXLINT_TSGOLINT_PATH`:

```shell
# Build (first time: `just init` fetches the TightScript compiler and applies patches/)
just init
just build

# Run oxlint-ti with type-aware rules
OXLINT_TSGOLINT_PATH=/path/to/tsgolint-ti/tsgolint oxlint --type-aware

# Optionally also run typechecking at the same time
OXLINT_TSGOLINT_PATH=/path/to/tsgolint-ti/tsgolint oxlint --type-aware --type-check
```

On Windows the binary is `tsgolint.exe`.

### What these flags do

- `--type-aware`: enables `typescript/*` rules that require TightScript/TypeScript semantic analysis via `tsgolint-ti`
- `--type-check`: includes type diagnostics from the TightScript compiler in type-aware runs

### TightScript projects

TightScript options are read from the project's `tsconfig.json`, as the compiler reads them:

```jsonc
{
  "compilerOptions": {
    "permissionModifiers": true,
    "objectCreationDefault": "exact",
  },
}
```

Rules follow TightScript's semantics where they differ from TypeScript's. For example, a marker on a new literal such as `{ ... } as owned` or `as exact` is an inference hint, like `as const`. It is not reported as an unsafe or unnecessary assertion.

### Configuration

Configure type-aware rules in `.oxlintrc.json`:

```jsonc
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  // alternatively, configure via options field
  "options": {
    "typeAware": true,
    "typeCheck": true,
  },
  "rules": {
    "typescript/no-floating-promises": "error",
    "typescript/no-misused-promises": "error",
  },
}
```

Over 50 TypeScript-specific type-aware rules are available. For detailed setup and configuration, see the [Oxlint Type-Aware Linting guide](https://oxc.rs/docs/guide/usage/linter/type-aware.html).

> [!NOTE]
> Non-type-aware TypeScript rules can be found in [Oxlint's TypeScript rules](https://oxc.rs/docs/guide/usage/linter/rules.html) under the TypeScript source.

## How it fits into oxlint-ti

oxlint-ti separates linting into two layers:

| Layer           | Purpose                      | Speed                  |
| --------------- | ---------------------------- | ---------------------- |
| **oxlint-ti**   | Syntax & structural analysis | Instant                |
| **tsgolint-ti** | Type-aware semantic rules    | Requires type analysis |

This architecture keeps the common case extremely fast while enabling powerful type-aware checks when needed.
oxlint-ti handles file discovery, configuration, and output formatting, while `tsgolint-ti` executes type-aware rules and emits semantic diagnostics.

## Why tsgolint exists

Traditional type-aware linting in the JavaScript ecosystem typically works by embedding TypeScript's type-analysis engine inside a JavaScript linter.

This approach introduces several bottlenecks:

- slow startup due to compiler initialization
- AST conversion between toolchains
- limited parallelism
- high memory overhead on large repositories

`tsgolint` takes a different approach: it runs directly on `typescript-go`, avoiding these bottlenecks and allowing semantic analysis to run efficiently alongside Oxlint. `tsgolint-ti` does the same on the TightScript compiler, the TightScript fork of `typescript-go`.

Upstream tsgolint's benchmarks on an Apple M4 Pro compare ESLint + typescript-eslint with `tsgolint`:

| Repository           | ESLint + typescript-eslint | tsgolint | Speedup |
| -------------------- | -------------------------- | -------- | ------- |
| microsoft/vscode     | 83.2s                      | 6.96s    | **12x** |
| microsoft/typescript | 27.2s                      | 1.94s    | **14x** |
| typeorm/typeorm      | 13.2s                      | 0.75s    | **18x** |
| vuejs/core           | 12.3s                      | 0.95s    | **13x** |

See [benchmarks](./benchmarks/README.md) for detailed performance comparisons.

## Implemented Rules

60 of the 62 targeted rules are implemented.

- [ ] [naming-convention](https://typescript-eslint.io/rules/naming-convention)
- [ ] [prefer-destructuring](https://typescript-eslint.io/rules/prefer-destructuring)
- [x] [await-thenable](https://typescript-eslint.io/rules/await-thenable)
- [x] [consistent-return](https://typescript-eslint.io/rules/consistent-return)
- [x] [consistent-type-exports](https://typescript-eslint.io/rules/consistent-type-exports)
- [x] [dot-notation](https://typescript-eslint.io/rules/dot-notation)
- [x] [no-array-delete](https://typescript-eslint.io/rules/no-array-delete)
- [x] [no-base-to-string](https://typescript-eslint.io/rules/no-base-to-string)
- [x] [no-confusing-void-expression](https://typescript-eslint.io/rules/no-confusing-void-expression)
- [x] [no-deprecated](https://typescript-eslint.io/rules/no-deprecated)
- [x] [no-duplicate-type-constituents](https://typescript-eslint.io/rules/no-duplicate-type-constituents)
- [x] [no-floating-promises](https://typescript-eslint.io/rules/no-floating-promises)
- [x] [no-for-in-array](https://typescript-eslint.io/rules/no-for-in-array)
- [x] [no-generated-empty-object-type](https://typescript-eslint.io/rules/no-generated-empty-object-type)
- [x] [no-implied-eval](https://typescript-eslint.io/rules/no-implied-eval)
- [x] [no-meaningless-void-operator](https://typescript-eslint.io/rules/no-meaningless-void-operator)
- [x] [no-misused-promises](https://typescript-eslint.io/rules/no-misused-promises)
- [x] [no-misused-spread](https://typescript-eslint.io/rules/no-misused-spread)
- [x] [no-mixed-enums](https://typescript-eslint.io/rules/no-mixed-enums)
- [x] [no-redundant-type-constituents](https://typescript-eslint.io/rules/no-redundant-type-constituents)
- [x] [no-unnecessary-boolean-literal-compare](https://typescript-eslint.io/rules/no-unnecessary-boolean-literal-compare)
- [x] [no-unnecessary-condition](https://typescript-eslint.io/rules/no-unnecessary-condition)
- [x] [no-unnecessary-qualifier](https://typescript-eslint.io/rules/no-unnecessary-qualifier)
- [x] [no-unnecessary-template-expression](https://typescript-eslint.io/rules/no-unnecessary-template-expression)
- [x] [no-unnecessary-type-arguments](https://typescript-eslint.io/rules/no-unnecessary-type-arguments)
- [x] [no-unnecessary-type-assertion](https://typescript-eslint.io/rules/no-unnecessary-type-assertion)
- [x] [no-unnecessary-type-conversion](https://typescript-eslint.io/rules/no-unnecessary-type-conversion)
- [x] [no-unnecessary-type-parameters](https://typescript-eslint.io/rules/no-unnecessary-type-parameters)
- [x] [no-unsafe-argument](https://typescript-eslint.io/rules/no-unsafe-argument)
- [x] [no-unsafe-assignment](https://typescript-eslint.io/rules/no-unsafe-assignment)
- [x] [no-unsafe-call](https://typescript-eslint.io/rules/no-unsafe-call)
- [x] [no-unsafe-enum-comparison](https://typescript-eslint.io/rules/no-unsafe-enum-comparison)
- [x] [no-unsafe-member-access](https://typescript-eslint.io/rules/no-unsafe-member-access)
- [x] [no-unsafe-return](https://typescript-eslint.io/rules/no-unsafe-return)
- [x] [no-unsafe-type-assertion](https://typescript-eslint.io/rules/no-unsafe-type-assertion)
- [x] [no-unsafe-unary-minus](https://typescript-eslint.io/rules/no-unsafe-unary-minus)
- [x] [no-useless-default-assignment](https://typescript-eslint.io/rules/no-useless-default-assignment)
- [x] [non-nullable-type-assertion-style](https://typescript-eslint.io/rules/non-nullable-type-assertion-style)
- [x] [only-throw-error](https://typescript-eslint.io/rules/only-throw-error)
- [x] [prefer-find](https://typescript-eslint.io/rules/prefer-find)
- [x] [prefer-includes](https://typescript-eslint.io/rules/prefer-includes)
- [x] [prefer-nullish-coalescing](https://typescript-eslint.io/rules/prefer-nullish-coalescing)
- [x] [prefer-optional-chain](https://typescript-eslint.io/rules/prefer-optional-chain)
- [x] [prefer-promise-reject-errors](https://typescript-eslint.io/rules/prefer-promise-reject-errors)
- [x] [prefer-readonly-parameter-types](https://typescript-eslint.io/rules/prefer-readonly-parameter-types)
- [x] [prefer-readonly](https://typescript-eslint.io/rules/prefer-readonly)
- [x] [prefer-reduce-type-parameter](https://typescript-eslint.io/rules/prefer-reduce-type-parameter)
- [x] [prefer-regexp-exec](https://typescript-eslint.io/rules/prefer-regexp-exec)
- [x] [prefer-return-this-type](https://typescript-eslint.io/rules/prefer-return-this-type)
- [x] [prefer-string-starts-ends-with](https://typescript-eslint.io/rules/prefer-string-starts-ends-with)
- [x] [promise-function-async](https://typescript-eslint.io/rules/promise-function-async)
- [x] [related-getter-setter-pairs](https://typescript-eslint.io/rules/related-getter-setter-pairs)
- [x] [require-array-sort-compare](https://typescript-eslint.io/rules/require-array-sort-compare)
- [x] [require-await](https://typescript-eslint.io/rules/require-await)
- [x] [restrict-plus-operands](https://typescript-eslint.io/rules/restrict-plus-operands)
- [x] [restrict-template-expressions](https://typescript-eslint.io/rules/restrict-template-expressions)
- [x] [return-await](https://typescript-eslint.io/rules/return-await)
- [x] [strict-boolean-expressions](https://typescript-eslint.io/rules/strict-boolean-expressions)
- [x] [strict-void-return](https://typescript-eslint.io/rules/strict-void-return)
- [x] [switch-exhaustiveness-check](https://typescript-eslint.io/rules/switch-exhaustiveness-check)
- [x] [unbound-method](https://typescript-eslint.io/rules/unbound-method)
- [x] [use-unknown-in-catch-callback-variable](https://typescript-eslint.io/rules/use-unknown-in-catch-callback-variable)

## Links

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Detailed technical documentation
- [Benchmarks](./benchmarks/README.md) - Performance comparison data
- [tsgolint](https://github.com/oxc-project/tsgolint) - The upstream project
- [Oxlint](https://oxc.rs/docs/guide/usage/linter.html) - Frontend linter integration
