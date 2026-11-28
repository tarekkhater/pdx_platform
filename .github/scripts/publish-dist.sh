#!/bin/bash
# Runs on GitHub Actions. Uploads dist/ to each domain's nginx root.
set -euo pipefail

cd "$(dirname "$0")/../.."
test -f dist/index.html

umask 077
mkdir -p "$HOME/.ssh"
printf '%s\n' "$SSH_KEY" > "$HOME/.ssh/pdx_deploy"
chmod 600 "$HOME/.ssh/pdx_deploy"
cat > "$HOME/.ssh/known_hosts" << 'EOF'
72.61.94.165 ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIGKNRNEHOKr5lS3pcPBz/MNYCfyy4X1DDfOgwsur7R1I
EOF

ssh_opts=(
  -i "$HOME/.ssh/pdx_deploy"
  -o BatchMode=yes
  -o IdentitiesOnly=yes
  -o StrictHostKeyChecking=yes
  -o UserKnownHostsFile="$HOME/.ssh/known_hosts"
)
target="${SSH_USER}@${SSH_HOST}"

discover() {
  local domain=$1
  ssh "${ssh_opts[@]}" "${target}" "bash -s" -- "${domain}" << 'EOS'
set -euo pipefail
domain=$1
escaped=$(printf '%s' "$domain" | sed 's/[.[\*^$()+?{|]/\\&/g')
conf=$(grep -RslE "server_name[[:space:]]+([^;]*[[:space:]])?${escaped}(;|[[:space:]]|$)" \
  /etc/nginx /home/*/conf 2>/dev/null | head -1 || true)
if [ -z "${conf}" ]; then
  echo "No nginx vhost for ${domain}" >&2
  exit 1
fi
webroot=$(awk '/^[[:space:]]*root[[:space:]]+/{gsub(/[;\r]/,"",$2); print $2; exit}' "${conf}")
if [ -z "${webroot}" ] || [ ! -d "${webroot}" ]; then
  echo "Bad web root '${webroot}' in ${conf}" >&2
  exit 1
fi
printf '%s\n' "${webroot}"
EOS
}

tar -C dist -cf /tmp/pdx-dist.tar .
ssh "${ssh_opts[@]}" "${target}" "mkdir -p /tmp/pdx-deploy && chmod 700 /tmp/pdx-deploy"
scp "${ssh_opts[@]}" /tmp/pdx-dist.tar .github/scripts/apply-dist.sh "${target}:/tmp/pdx-deploy/"

found=0
for domain in ${DEPLOY_DOMAINS}; do
  webroot=$(discover "${domain}")
  echo "${domain} -> ${webroot}"
  ssh "${ssh_opts[@]}" "${target}" "bash /tmp/pdx-deploy/apply-dist.sh $(printf '%q' "${webroot}") /tmp/pdx-deploy/pdx-dist.tar"
  found=1
done

ssh "${ssh_opts[@]}" "${target}" "rm -rf /tmp/pdx-deploy"
if [ "${found}" -ne 1 ]; then
  echo "DEPLOY_DOMAINS is empty" >&2
  exit 1
fi
