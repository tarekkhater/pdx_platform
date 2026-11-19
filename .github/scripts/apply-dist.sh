#!/bin/bash
# Replaces one static site root with the tarball in $2. Keeps .well-known.
set -euo pipefail

root=$1
tarfile=$2

if [ ! -d "${root}" ]; then
  echo "missing ${root}" >&2
  exit 1
fi
if [ -f "${root}/artisan" ] || [ -f "${root}/.env" ] || [ -f "${root}/index.php" ]; then
  echo "refusing to replace ${root} (looks like the backend)" >&2
  exit 1
fi

stage=$(mktemp -d)
trap 'rm -rf "${stage}"' EXIT
tar -xf "${tarfile}" -C "${stage}"
test -f "${stage}/index.html"

owner=$(stat -c '%U:%G' "${root}")
bak="${root}.prev"
rm -rf "${bak}"
cp -a "${root}" "${bak}"
find "${root}" -mindepth 1 -maxdepth 1 ! -name '.well-known' -exec rm -rf {} +
if ! cp -a "${stage}"/. "${root}/"; then
  find "${root}" -mindepth 1 -maxdepth 1 ! -name '.well-known' -exec rm -rf {} +
  cp -a "${bak}"/. "${root}/"
  echo "publish failed, restored ${bak}" >&2
  exit 1
fi
chown -R "${owner}" "${root}"
echo "published ${root}"
