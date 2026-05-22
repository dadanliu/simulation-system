#!/usr/bin/env bash

# 用 curl 测试 BFF QueueModule / BullMQ 异步任务的最小闭环。
#
# 默认测试商品批量导入 dryRun：
#   1. 获取 CSRF token
#   2. 登录并保存 Cookie
#   3. 提交 /api/tasks/commodity-imports
#   4. 轮询 /api/tasks/:taskId，直到 completed / failed / 超时
#
# 使用方式：
#   bash scripts/test-bullmq-queue-curl.sh
#
# 可选覆盖：
#   BFF_URL=http://127.0.0.1:3001 \
#   COOKIE_FILE=/tmp/next-bff-auth.cookie \
#   USERNAME=admin \
#   PASSWORD=admin123 \
#   bash scripts/test-bullmq-queue-curl.sh

set -Eeuo pipefail

# BFF 任务接口当前没有走 Next client rewrite，直接打 BFF 端口最明确。
BFF_URL="${BFF_URL:-http://127.0.0.1:3001}"

# curl 没有浏览器 Cookie Jar，所以用这个文件模拟浏览器保存 Cookie。
# 这里会保存 next_bff_session 和 next_bff_csrf。
COOKIE_FILE="${COOKIE_FILE:-/tmp/next-bff-auth.cookie}"

# 本地 mock seed 账号。
USERNAME="${USERNAME:-admin}"
PASSWORD="${PASSWORD:-admin123}"

# 轮询任务状态的参数。
POLL_INTERVAL_SECONDS="${POLL_INTERVAL_SECONDS:-1}"
POLL_MAX_ATTEMPTS="${POLL_MAX_ATTEMPTS:-10}"

TMP_DIR="$(mktemp -d)"
CSRF_TOKEN=""
SUBMITTED_TASK_ID=""

cleanup() {
  # 只清理脚本自己创建的临时响应文件；Cookie 文件保留，方便你手动复查。
  rm -f "$TMP_DIR"/*.json 2>/dev/null || true
  rmdir "$TMP_DIR" 2>/dev/null || true
}

trap cleanup EXIT

require_command() {
  local command_name="$1"

  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Missing required command: $command_name" >&2
    exit 1
  fi
}

json_get() {
  # 从 JSON stdin 中按点路径取值。
  # 例：json_get data.csrfToken < response.json
  local path="$1"

  node -e '
const fs = require("node:fs");
const path = process.argv[1].split(".");
const input = fs.readFileSync(0, "utf8");
const root = JSON.parse(input);
let value = root;

for (const key of path) {
  value = value?.[key];
}

if (value === undefined || value === null) {
  process.exit(1);
}

if (typeof value === "object") {
  console.log(JSON.stringify(value));
} else {
  console.log(String(value));
}
' "$path"
}

pretty_json() {
  node -e '
const fs = require("node:fs");
const input = fs.readFileSync(0, "utf8");
console.log(JSON.stringify(JSON.parse(input), null, 2));
'
}

assert_success_status() {
  local status="$1"
  local body_file="$2"
  local label="$3"

  if [[ "$status" =~ ^2[0-9][0-9]$ ]]; then
    return
  fi

  echo "Request failed: $label, HTTP $status" >&2
  echo "Response body:" >&2
  cat "$body_file" >&2
  exit 1
}

new_body_file() {
  mktemp "$TMP_DIR/response.XXXXXX.json"
}

fetch_csrf() {
  local body_file
  local status

  body_file="$(new_body_file)"

  status="$(
    curl -sS \
      -b "$COOKIE_FILE" \
      -c "$COOKIE_FILE" \
      -o "$body_file" \
      -w "%{http_code}" \
      "$BFF_URL/api/auth/csrf"
  )"

  assert_success_status "$status" "$body_file" "GET /api/auth/csrf"

  CSRF_TOKEN="$(json_get data.csrfToken < "$body_file")"
  echo "CSRF token refreshed."
}

login() {
  local body_file
  local payload
  local status

  body_file="$(new_body_file)"

  # 用 Node 生成 JSON，避免用户名或密码里出现特殊字符时破坏 JSON 字符串。
  payload="$(
    USERNAME="$USERNAME" PASSWORD="$PASSWORD" node -e '
console.log(JSON.stringify({
  username: process.env.USERNAME,
  password: process.env.PASSWORD
}));
'
  )"

  status="$(
    curl -sS \
      -b "$COOKIE_FILE" \
      -c "$COOKIE_FILE" \
      -H "Content-Type: application/json" \
      -H "x-csrf-token: $CSRF_TOKEN" \
      -d "$payload" \
      -o "$body_file" \
      -w "%{http_code}" \
      "$BFF_URL/api/auth/login"
  )"

  assert_success_status "$status" "$body_file" "POST /api/auth/login"

  echo "Login succeeded as $USERNAME."
}

assert_logged_in() {
  local body_file
  local status

  body_file="$(new_body_file)"

  status="$(
    curl -sS \
      -b "$COOKIE_FILE" \
      -o "$body_file" \
      -w "%{http_code}" \
      "$BFF_URL/api/auth/me"
  )"

  assert_success_status "$status" "$body_file" "GET /api/auth/me"

  echo "Current user:"
  pretty_json < "$body_file"
}

submit_commodity_dry_run_task() {
  local body_file
  local payload
  local status
  local task_id

  body_file="$(new_body_file)"

  payload="$(
    node -e '
console.log(JSON.stringify({
  dryRun: true,
  items: [
    {
      name: `curl BullMQ 测试商品 ${new Date().toISOString()}`,
      price: 99.9,
      stock: 10,
      status: "pending",
      description: "用 Bash 脚本模拟商品批量导入 dryRun 任务"
    }
  ]
}));
'
  )"

  status="$(
    curl -sS \
      -b "$COOKIE_FILE" \
      -H "Content-Type: application/json" \
      -H "x-csrf-token: $CSRF_TOKEN" \
      -d "$payload" \
      -o "$body_file" \
      -w "%{http_code}" \
      "$BFF_URL/api/tasks/commodity-imports"
  )"

  assert_success_status "$status" "$body_file" "POST /api/tasks/commodity-imports"

  task_id="$(json_get data.taskId < "$body_file")"
  SUBMITTED_TASK_ID="$task_id"

  echo "Task submitted: $task_id"
  echo "Initial task response:"
  pretty_json < "$body_file"
}

poll_task_until_done() {
  local task_id="$1"
  local attempt
  local body_file
  local status
  local state

  for ((attempt = 1; attempt <= POLL_MAX_ATTEMPTS; attempt += 1)); do
    body_file="$(new_body_file)"

    status="$(
      curl -sS \
        -b "$COOKIE_FILE" \
        -o "$body_file" \
        -w "%{http_code}" \
        "$BFF_URL/api/tasks/$task_id"
    )"

    assert_success_status "$status" "$body_file" "GET /api/tasks/$task_id"

    state="$(json_get data.state < "$body_file")"

    echo "Poll $attempt/$POLL_MAX_ATTEMPTS: state=$state"
    pretty_json < "$body_file"

    if [[ "$state" == "completed" ]]; then
      echo "Task completed."
      return 0
    fi

    if [[ "$state" == "failed" ]]; then
      echo "Task failed. Check data.failedReason above." >&2
      return 1
    fi

    sleep "$POLL_INTERVAL_SECONDS"
  done

  echo "Task did not finish after $POLL_MAX_ATTEMPTS polls." >&2
  return 1
}

main() {
  require_command curl
  require_command node

  mkdir -p "$(dirname "$COOKIE_FILE")"
  touch "$COOKIE_FILE"

  echo "BFF_URL=$BFF_URL"
  echo "COOKIE_FILE=$COOKIE_FILE"
  echo

  # 第一次 CSRF 用来通过登录这个写请求。
  fetch_csrf
  login

  # 登录会重新下发 Cookie；这里再取一次 CSRF，保证后续任务提交 header 和 cookie 匹配。
  fetch_csrf
  assert_logged_in

  echo
  echo "Submitting commodity import dryRun task..."
  local task_id
  submit_commodity_dry_run_task
  task_id="$SUBMITTED_TASK_ID"

  echo
  echo "Polling task: $task_id"
  poll_task_until_done "$task_id"

  echo
  echo "Done. Cookie file kept at: $COOKIE_FILE"
}

main "$@"
