#!/usr/bin/env bash
# =============================================================================
# Magic Frame — one-click installer
# =============================================================================
#
# Usage (in a fresh directory):
#   curl -fsSL https://raw.githubusercontent.com/jeremiaa/magic-frame/main/deploy/install.sh | bash
#
# Or locally after git clone:
#   ./deploy/install.sh
#
# What it does:
#   1) Checks prerequisites (docker, docker-compose)
#   2) Clones the repo if we aren't already inside it
#   3) Generates SESSION_SECRET automatically (openssl if available,
#      otherwise /dev/urandom)
#   4) Writes .env from .env.example (all optional fields empty)
#   5) Pulls pre-built images (or builds from source with --build) + starts the stack
#   6) Waits until the app responds, prints the URL for admin setup
#
# Idempotent: re-running only updates what changed. An existing
# SESSION_SECRET is NOT overwritten (would invalidate all sessions).
# =============================================================================

set -euo pipefail

REPO_URL="https://github.com/jeremiaa/magic-frame.git"
# Backwards compat: old MAGIC_DASHBOARD_* variables are still read in case
# someone has scripts that set them.
REPO_DIR="${MAGIC_FRAME_DIR:-${MAGIC_DASHBOARD_DIR:-magic-frame}}"
HOST_BIND="${MAGIC_FRAME_HOST:-${MAGIC_DASHBOARD_HOST:-0.0.0.0}}"

# Default: pull pre-built images from ghcr.io (fast — no local compile).
# Pass --build (or MAGIC_FRAME_BUILD=1) to build from source instead, e.g.
# for forks or local changes. (#9)
BUILD_FROM_SOURCE="${MAGIC_FRAME_BUILD:-0}"
for arg in "$@"; do
  case "$arg" in
    --build) BUILD_FROM_SOURCE=1 ;;
  esac
done

c_red()    { printf "\033[31m%s\033[0m" "$*"; }
c_green()  { printf "\033[32m%s\033[0m" "$*"; }
c_yellow() { printf "\033[33m%s\033[0m" "$*"; }
c_cyan()   { printf "\033[36m%s\033[0m" "$*"; }
c_dim()    { printf "\033[2m%s\033[0m" "$*"; }

step() { echo; echo "$(c_cyan "==>") $(c_green "$*")"; }
warn() { echo "$(c_yellow "WARN:") $*" >&2; }
die()  { echo "$(c_red "ERROR:") $*" >&2; exit 1; }

# -----------------------------------------------------------------------------
# 1) Prerequisites
# -----------------------------------------------------------------------------
step "Checking prerequisites"

command -v docker >/dev/null || die "docker not installed. See https://docs.docker.com/engine/install/"
docker compose version >/dev/null 2>&1 || die "docker compose plugin missing (not docker-compose). Update Docker to >= 20.10."

if ! docker info >/dev/null 2>&1; then
  die "docker is not running or you don't have permissions. Tip: 'sudo usermod -aG docker \$USER' and log in again."
fi

echo "  docker:         $(docker --version | head -c 80)"
echo "  docker compose: $(docker compose version | head -c 80)"

# Soft disk-space check: the xcaddy Caddy build + Next.js production build +
# image export need ~5 GB of free space. df -P/-k is portable across
# GNU/BSD coreutils; the value is in 1K-blocks.
FREE_KB=$(df -Pk . 2>/dev/null | awk 'NR==2 {print $4}')
if [ -n "$FREE_KB" ] && [ "$FREE_KB" -lt 5242880 ]; then
  FREE_GB=$(( FREE_KB / 1024 / 1024 ))
  warn "only ~${FREE_GB} GB free on this volume. Pulled images need ~2-3 GB, a from-source build (--build) ~5 GB. Free up disk or 'docker builder prune -af' before continuing."
fi

# Random secret generator: openssl if available, otherwise POSIX fallback
# /dev/urandom + od (available everywhere), last resort via Docker itself.
gen_secret() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 32
  elif [ -r /dev/urandom ]; then
    head -c 32 /dev/urandom | od -An -tx1 -v | tr -d ' \n'
  else
    docker run --rm alpine:latest sh -c 'head -c 32 /dev/urandom | od -An -tx1 -v | tr -d " \n"'
  fi
}

# -----------------------------------------------------------------------------
# 2) Clone or update repo
# -----------------------------------------------------------------------------
# update_repo handles three cases:
#   1. up-to-date → no-op
#   2. local is behind remote (clean fast-forward) → pull
#   3. local has diverged → hard-reset to remote
#
# Case 3 is what bit the early v1.0.x adopters: the upstream history got
# rewritten a few times during launch (Co-Author scrub, CLAUDE.md scrub,
# v1.0.1 retag), so anyone who cloned during that window has commits that
# no longer exist on GitHub. A plain `git pull` then fails with the
# "divergent branches" error. Hard-resetting is safe because no user data
# lives in git — DB, .env, secrets are all in volumes / on disk.
update_repo() {
  # --force on the tag fetch: early v1.0.x adopters have tags that point at
  # rewritten commits from the launch-week force-pushes. Without --force
  # `git fetch` would refuse to update those tags with a "would clobber
  # existing tag" error and abort the whole update.
  git fetch --force --tags origin 2>/dev/null || git fetch --force --tags
  local LOCAL REMOTE BASE
  LOCAL=$(git rev-parse HEAD)
  REMOTE=$(git rev-parse '@{u}' 2>/dev/null || git rev-parse origin/main 2>/dev/null || echo "")
  if [ -z "$REMOTE" ]; then
    echo "  → no upstream tracking branch, skipping update"
    return 0
  fi
  if [ "$LOCAL" = "$REMOTE" ]; then
    echo "  → already up to date"
    return 0
  fi
  BASE=$(git merge-base HEAD "$REMOTE" 2>/dev/null || echo "")
  if [ "$LOCAL" = "$BASE" ]; then
    # clean fast-forward
    git pull --ff-only
    return 0
  fi
  # Diverged. Reset to upstream — preserves your .env, DB volumes and
  # any custom-module uploads (those live outside the repo). Anything
  # you've hand-edited inside the repo will be replaced with the
  # upstream version.
  echo "  ⚠  Local repo diverges from upstream. This usually means upstream"
  echo "     history was rewritten between your clone and now. Resetting your"
  echo "     working copy to match the published version (your .env, DB and"
  echo "     uploaded custom modules stay untouched)."
  git reset --hard "$REMOTE"
}

if [ -f docker-compose.yml ] && [ -d src ]; then
  step "Already inside the repo — pulling latest"
  REPO_DIR="."
  ( update_repo )
elif [ -d "$REPO_DIR/.git" ]; then
  step "Updating existing repo $REPO_DIR"
  ( cd "$REPO_DIR" && update_repo )
else
  step "Cloning repo into ./$REPO_DIR"
  git clone "$REPO_URL" "$REPO_DIR"
fi

cd "$REPO_DIR"

# -----------------------------------------------------------------------------
# 3) Create / update .env
# -----------------------------------------------------------------------------
step "Writing .env (secrets are generated)"

if [ ! -f .env.example ]; then
  die ".env.example missing — repo incomplete?"
fi

if [ -f .env ]; then
  echo "  .env already exists. Reading existing values, only filling in missing ones."
  # Don't overwrite SESSION_SECRET if already set — would invalidate sessions
  # NOTE: portable on both GNU and BSD sed (macOS). The previous version used
  # a `("?)…\1$` backreference that BSD sed evaluates differently and left the
  # prefix in place, which then short-circuited the auto-generation below.
  EXISTING_SESSION_SECRET=$(grep -E '^SESSION_SECRET=' .env | head -1 | cut -d= -f2- | sed 's/^"//;s/"$//' || true)
else
  EXISTING_SESSION_SECRET=""
  cp .env.example .env
fi

# Generate SESSION_SECRET if empty
if [ -z "$EXISTING_SESSION_SECRET" ]; then
  NEW_SECRET=$(gen_secret)
  echo "  → SESSION_SECRET generated (64 chars hex)"
  # In-place edit — macOS-compatible sed (BSD)
  if sed --version >/dev/null 2>&1; then
    sed -i "s|^SESSION_SECRET=.*|SESSION_SECRET=\"$NEW_SECRET\"|" .env
  else
    sed -i '' "s|^SESSION_SECRET=.*|SESSION_SECRET=\"$NEW_SECRET\"|" .env
  fi
else
  echo "  → SESSION_SECRET kept (existing sessions stay valid)"
fi

chmod 600 .env

# -----------------------------------------------------------------------------
# 4) Build + start docker stack
# -----------------------------------------------------------------------------
if [ "$BUILD_FROM_SOURCE" = "1" ]; then
  step "Building + starting containers from source (first build can take a while, 15-25 min on a Pi)"
  docker compose up -d --build
else
  step "Pulling pre-built images + starting containers"
  # If the pull fails (e.g. a fork without published images, or offline),
  # fall back to building from source so the install still succeeds.
  if docker compose pull; then
    docker compose up -d
  else
    warn "Image pull failed — falling back to building from source"
    docker compose up -d --build
  fi
fi

# -----------------------------------------------------------------------------
# 5) Wait for app
# -----------------------------------------------------------------------------
step "Waiting for app"

URL="http://${HOST_BIND}:80"
if [ "$HOST_BIND" = "0.0.0.0" ]; then URL="http://localhost"; fi

for i in $(seq 1 60); do
  code=$(curl -fsS -o /dev/null -w "%{http_code}" --max-time 3 "$URL/login" 2>/dev/null || echo "000")
  if [ "$code" = "200" ]; then
    echo "  → ready (HTTP $code) after $i attempt(s)"
    break
  fi
  printf "."
  sleep 2
done

if [ "$code" != "200" ]; then
  warn "App not responding yet — check logs: docker compose logs -f app"
fi

# -----------------------------------------------------------------------------
# 6) Done — onboarding instructions
# -----------------------------------------------------------------------------
echo
echo "$(c_green "============================================================")"
echo "$(c_green "  Magic Frame is running!")"
echo "$(c_green "============================================================")"
echo
echo "  $(c_cyan "Open in browser:")  $URL"
echo
echo "  On first visit you land in the $(c_yellow "setup flow") and create"
echo "  your admin user (email + password). After that you can enable"
echo "  2FA in Settings, connect HA/Todoist/Calendar in Integrations,"
echo "  and set up DDNS + HTTPS under Hosting & Network."
echo
echo "  $(c_dim "Logs:")    docker compose logs -f app"
echo "  $(c_dim "Stop:")    docker compose down"
echo "  $(c_dim "Update:")  git pull && ./deploy/install.sh"
echo "  $(c_dim "Backup:")  docker compose exec db pg_dump -U postgres magicdashboard | gzip > backup-\$(date +%F).sql.gz"
echo
