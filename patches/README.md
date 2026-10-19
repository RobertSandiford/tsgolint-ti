# Patches

These patches apply to the TightScript fork of TypeScript (`tsc/` in
`RobertSandiford/TypeScript`, branch `tightscript`), not to `microsoft/typescript-go`.

`0005-feat-project-expose-tsconfig-resolution-to-tsgolint.patch` adds one file to
the `project` package with exported wrappers for the config file registry's tsconfig
lookup. It replaces upstream tsgolint's patch that renamed the package's private
identifiers, which no longer applied.

Upstream tsgolint's opt-in `OXLINT_TSGOLINT_CHECKER_SCHEDULING=sorted` patch is
dropped: typescript-go now assigns files to checkers by weight itself.

These patches do not change the behavior of typescript-go.
The main purpose of the patches is to tune tsgo performance a bit.

Module resolution caching is tracked [here](https://github.com/microsoft/typescript-go/issues/673).

TODO: propose upstreaming other patches

TODO: right now patches are created via `git format-patch` and applied via `git am`.
We should probably use something like [this](https://github.com/pulumi/ci-mgmt/blob/d98489a822ebd290978a238d54c1d32e4aaca208/provider-ci/internal/pkg/templates/base/scripts/upstream.sh) or [this](https://github.com/microsoft/go-infra/tree/9ac588cb17d2f3713c37efe33babe37f2f4d625f/cmd/git-go-patch).
