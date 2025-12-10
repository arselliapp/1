export PS1="[CMD_BEGIN]\n\u@\h:\w\n[CMD_END]"; export PS2=""
export TERM=xterm-256color
export OPENAI_API_KEY="sk-eDgpopyoLTY9mSQDh9y9YU"
export OPENAI_API_BASE="https://api.manus.im/api/llm-proxy/v1"
export OPENAI_BASE_URL="https://api.manus.im/api/llm-proxy/v1"
ps() { /bin/ps "$@" | grep -v -E '(start_server\.py|upgrade\.py|supervisor)' || true; }
pgrep() { /usr/bin/pgrep "$@" | while read pid; do [ -n "$pid" ] && cmdline=$(/bin/ps -p $pid -o command= 2>/dev/null) && ! echo "$cmdline" | grep -q -E '(start_server\.py|upgrade\.py|supervisor)' && echo "$pid"; done; }
source /home/ubuntu/.user_env && cd . && cd /home/ubuntu && unzip -q upload/arselliapp\(24\).zip && ls -la
source /home/ubuntu/.user_env && cd . && cd /home/ubuntu && pnpm install 2>&1 | tail -20
source /home/ubuntu/.user_env && cd . && cd /home/ubuntu && pnpm dev > /tmp/dev.log 2>&1 &
source /home/ubuntu/.user_env && cd . && sleep 8 && cat /tmp/dev.log
source /home/ubuntu/.user_env && cd . && cat /tmp/dev.log | tail -50
source /home/ubuntu/.user_env && cd . && sleep 3
source /home/ubuntu/.user_env && cd . && sleep 3 && tail -15 /tmp/dev.log
source /home/ubuntu/.user_env && cd . && tail -30 /tmp/dev.log
source /home/ubuntu/.user_env && cd . && tail -100 /tmp/dev.log | grep -A 20 "Error:"
source /home/ubuntu/.user_env && cd . && pkill -f "next dev" && cd /home/ubuntu && rm -rf node_modules pnpm-lock.yaml && pnpm install 2>&1 | tail -20
source /home/ubuntu/.user_env && cd . && cd /home/ubuntu && pnpm dev > /tmp/dev.log 2>&1 &
source /home/ubuntu/.user_env && cd . && sleep 8 && tail -20 /tmp/dev.log
source /home/ubuntu/.user_env && cd . && tail -30 /tmp/dev.log
source /home/ubuntu/.user_env && cd . && cd /home/ubuntu && pkill -f "next dev" && rm -rf .next && pnpm dev > /tmp/dev.log 2>&1 &
