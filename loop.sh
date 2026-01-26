#!/bin/bash

# Ralph Wiggum Build Loop (Claude)
# Usage:
#   ./loop.sh           # Auto mode: plan first, then build (default)
#   ./loop.sh plan      # Planning mode only
#   ./loop.sh build     # Build mode only
#   ./loop.sh 10        # Auto mode, max 10 build iterations
#   ./loop.sh build 5   # Build mode, max 5 iterations

set -e

MODE="plan"
AUTO_MODE=true
PLAN_MAX_ITERATIONS=5
MAX_ITERATIONS=0
ITERATION=0
CONSECUTIVE_FAILURES=0

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

for arg in "$@"; do
  if [[ "$arg" == "plan" ]]; then
    MODE="plan"
    AUTO_MODE=false
  elif [[ "$arg" == "build" ]]; then
    MODE="build"
    AUTO_MODE=false
  elif [[ "$arg" =~ ^[0-9]+$ ]]; then
    MAX_ITERATIONS=$arg
  fi
done

PROMPT_FILE="PROMPT_${MODE}.md"

if [[ ! -f "$PROMPT_FILE" ]]; then
  echo -e "${RED}Error: $PROMPT_FILE not found${NC}"
  echo "Run the ralph-claude skill first to generate the required files."
  exit 1
fi

switch_to_build_mode() {
  echo ""
  echo -e "${CYAN}=== Switching to Build Mode ===${NC}"
  echo ""
  MODE="build"
  PROMPT_FILE="PROMPT_${MODE}.md"
  ITERATION=0
}

seconds_until_next_hour() {
  local now=$(date +%s)
  local current_minute=$(date +%M)
  local current_second=$(date +%S)
  local seconds_past_hour=$((10#$current_minute * 60 + 10#$current_second))
  local seconds_until=$((3600 - seconds_past_hour))
  echo $seconds_until
}

seconds_until_daily_reset() {
  local reset_hour=5
  local now=$(date +%s)
  local today_reset=$(date -v${reset_hour}H -v0M -v0S +%s 2>/dev/null || date -d "today ${reset_hour}:00:00" +%s)

  if [[ $now -ge $today_reset ]]; then
    local tomorrow_reset=$((today_reset + 86400))
    echo $((tomorrow_reset - now))
  else
    echo $((today_reset - now))
  fi
}

countdown() {
  local seconds=$1
  local message=$2

  while [[ $seconds -gt 0 ]]; do
    local hours=$((seconds / 3600))
    local minutes=$(((seconds % 3600) / 60))
    local secs=$((seconds % 60))
    printf "\r${CYAN}%s${NC} Time remaining: %02d:%02d:%02d " "$message" $hours $minutes $secs
    sleep 1
    ((seconds--))
  done
  printf "\r%-80s\r" " "
}

is_usage_limit_error() {
  local output="$1"
  local exit_code="$2"

  # Only check for usage limits if there was an error
  [[ "$exit_code" -eq 0 ]] && return 1

  # Check the result JSON for error subtypes first (most reliable)
  if echo "$output" | grep '^{' | jq -e 'select(.type == "result") | select(.subtype | test("error.*limit|rate_limit"))' &>/dev/null; then
    return 0
  fi

  # Fallback to text patterns in stderr/error messages (not in assistant text)
  local error_text
  error_text=$(echo "$output" | grep -v '^{' || true)
  error_text+=$(echo "$output" | grep '^{' | jq -r 'select(.type == "result" and .is_error == true) | .result // empty' 2>/dev/null || true)

  if [[ "$error_text" =~ "You've hit your limit" ]] || [[ "$error_text" =~ "You have hit your limit" ]]; then
    return 0
  fi
  if [[ "$error_text" =~ Error:\ 429 ]] || [[ "$error_text" =~ Error:\ 529 ]]; then
    return 0
  fi
  if [[ "$error_text" =~ rate.?limit ]] || [[ "$error_text" =~ usage.?limit ]]; then
    return 0
  fi
  return 1
}

get_sleep_duration() {
  local output="$1"

  if [[ "$output" =~ "try again in "([0-9]+)" minute" ]]; then
    echo $(( ${BASH_REMATCH[1]} * 60 + 60 ))
    return
  fi

  if [[ "$output" =~ "try again in "([0-9]+)" hour" ]]; then
    echo $(( ${BASH_REMATCH[1]} * 3600 + 60 ))
    return
  fi

  if [[ "$output" =~ (daily|day|24.?hour) ]]; then
    seconds_until_daily_reset
    return
  fi

  if [[ "$output" =~ resets[[:space:]]+([0-9]+)(am|pm) ]]; then
    local reset_hour="${BASH_REMATCH[1]}"
    local ampm="${BASH_REMATCH[2]}"
    local tz="UTC"
    if [[ "$output" =~ \(([A-Za-z_/]+)\) ]]; then
      tz="${BASH_REMATCH[1]}"
    fi

    if [[ "$ampm" == "pm" && "$reset_hour" -ne 12 ]]; then
      reset_hour=$((reset_hour + 12))
    elif [[ "$ampm" == "am" && "$reset_hour" -eq 12 ]]; then
      reset_hour=0
    fi

    local now=$(date +%s)
    local target=$(TZ="$tz" date -v${reset_hour}H -v0M -v0S +%s 2>/dev/null || TZ="$tz" date -d "today ${reset_hour}:00:00" +%s)

    if [[ $now -ge $target ]]; then
      target=$((target + 86400))
    fi

    echo $((target - now + 60))
    return
  fi

  local wait_time=$(seconds_until_next_hour)
  echo $((wait_time + 60))
}

handle_usage_limit() {
  local output="$1"
  local sleep_duration=$(get_sleep_duration "$output")

  echo ""
  echo -e "${YELLOW}=== Usage Limit Detected ===${NC}"
  echo -e "${YELLOW}Waiting for reset...${NC}"
  echo ""

  local tz="UTC"
  if [[ "$output" =~ \(([A-Za-z_/]+)\) ]]; then
    tz="${BASH_REMATCH[1]}"
  fi
  local resume_time=$(TZ="$tz" date -v+${sleep_duration}S "+%Y-%m-%d %H:%M:%S" 2>/dev/null || TZ="$tz" date -d "+${sleep_duration} seconds" "+%Y-%m-%d %H:%M:%S")
  echo -e "Expected resume: ${CYAN}${resume_time}${NC}"
  echo ""

  countdown $sleep_duration "Waiting..."

  echo ""
  echo -e "${GREEN}Resuming...${NC}"
  echo ""

  CONSECUTIVE_FAILURES=0
}

if [[ "$AUTO_MODE" == true ]]; then
  echo -e "${GREEN}Ralph loop: AUTO mode (plan ×${PLAN_MAX_ITERATIONS} → build)${NC}"
  [[ $MAX_ITERATIONS -gt 0 ]] && echo "Max build iterations: $MAX_ITERATIONS"
else
  echo -e "${GREEN}Ralph loop: $(echo "$MODE" | tr '[:lower:]' '[:upper:]') mode${NC}"
  [[ $MAX_ITERATIONS -gt 0 ]] && echo "Max iterations: $MAX_ITERATIONS"
fi
echo "Press Ctrl+C to stop"
echo "---"

while true; do
  ITERATION=$((ITERATION + 1))
  echo ""
  MODE_DISPLAY=$(echo "$MODE" | tr '[:lower:]' '[:upper:]')
  if [[ "$AUTO_MODE" == true ]]; then
    echo -e "${GREEN}=== ${MODE_DISPLAY} Iteration $ITERATION ===${NC}"
  else
    echo -e "${GREEN}=== Iteration $ITERATION ===${NC}"
  fi
  echo ""

  TEMP_OUTPUT=$(mktemp)
  set +e

  claude --print \
    --verbose \
    --output-format stream-json \
    --dangerously-skip-permissions \
    < "$PROMPT_FILE" 2>&1 | tee "$TEMP_OUTPUT" | sed 's/\x1b\[[0-9;]*m//g' | grep --line-buffered '^{' | jq --unbuffered -r '
      def tool_info:
        if .name == "Edit" or .name == "Write" or .name == "Read" then
          (.input.file_path // .input.path | split("/") | last | .[0:60])
        elif .name == "TodoWrite" then
          ((.input.todos // []) | map(.content) | join(", ") | if contains("\n") then .[0:60] else . end)
        elif .name == "Bash" then
          (.input.command // .input.cmd | if contains("\n") then split("\n") | first | .[0:50] else .[0:80] end)
        elif .name == "Grep" then
          (.input.pattern | .[0:40])
        elif .name == "Glob" then
          (.input.pattern // .input.filePattern | .[0:40])
        elif .name == "WebFetch" then
          (.input.url | .[0:60])
        elif .name == "Task" then
          (.input.description // .input.prompt | if contains("\n") then .[0:40] else .[0:80] end)
        else null end;
      if .type == "assistant" then
        .message.content[] |
        if .type == "text" then
          if (.text | split("\n") | length) <= 3 then .text else empty end
        elif .type == "tool_use" then
          "    [" + .name + "]" + (tool_info | if . then " " + . else "" end)
        else empty end
      elif .type == "result" then
        "--- " + ((.duration_ms / 1000 * 10 | floor / 10) | tostring) + "s, " + (.num_turns | tostring) + " turns ---"
      else empty end
    ' 2>/dev/null

  EXIT_CODE=${PIPESTATUS[0]}
  OUTPUT=$(cat "$TEMP_OUTPUT")
  RESULT_MSG=$(sed 's/\x1b\[[0-9;]*m//g' "$TEMP_OUTPUT" | grep '^{' | jq -r 'select(.type == "result") | .result // empty' 2>/dev/null | tail -1)
  rm -f "$TEMP_OUTPUT"
  set -e

  if is_usage_limit_error "$OUTPUT" "$EXIT_CODE"; then
    handle_usage_limit "$OUTPUT"
    ITERATION=$((ITERATION - 1))
    continue
  fi

  if [[ $EXIT_CODE -ne 0 ]]; then
    CONSECUTIVE_FAILURES=$((CONSECUTIVE_FAILURES + 1))
    echo ""
    echo -e "${RED}=== Error (exit code: $EXIT_CODE) ===${NC}"
    echo -e "${RED}Output:${NC}"
    echo "$OUTPUT" | tail -20
    echo ""

    BACKOFF=$((30 * (2 ** (CONSECUTIVE_FAILURES - 1))))
    [[ $BACKOFF -gt 300 ]] && BACKOFF=300

    echo -e "${YELLOW}Retrying in ${BACKOFF}s... (consecutive failures: $CONSECUTIVE_FAILURES)${NC}"
    countdown $BACKOFF "Waiting..."
    ITERATION=$((ITERATION - 1))
    continue
  fi

  CONSECUTIVE_FAILURES=0

  # In auto mode, switch from plan to build after hitting plan cap
  if [[ "$AUTO_MODE" == true && "$MODE" == "plan" && $ITERATION -ge $PLAN_MAX_ITERATIONS ]]; then
    switch_to_build_mode
    continue
  fi

  if [[ "$RESULT_MSG" =~ "RALPH_COMPLETE" ]] || [[ "$OUTPUT" =~ "RALPH_COMPLETE" ]]; then
    echo ""
    echo -e "${GREEN}=== Ralph Complete ===${NC}"
    echo -e "${GREEN}All tasks finished.${NC}"
    break
  fi

  if [[ $MAX_ITERATIONS -gt 0 && $ITERATION -ge $MAX_ITERATIONS ]]; then
    echo ""
    echo -e "${GREEN}Reached max iterations ($MAX_ITERATIONS).${NC}"
    break
  fi

  sleep 2
done

echo ""
echo -e "${GREEN}Ralph loop complete. Iterations: $ITERATION${NC}"
