#!/usr/bin/env bash
# Watches every file in this folder and publishes a PubNub message to the
# dev reload channel once changes have been saved and have stopped for QUIET seconds.
# Usage: ./watch-reload.sh
cd "$(dirname "$0")" || exit 1

CHANNEL="cookie-clicker-dev-reload"
PUB_KEY="demo"
SUB_KEY="demo"
QUIET=1     # seconds with no further changes before we call it "finished"
POLL=0.5

snapshot() {
    # path + mtime + size for every file, ignoring .git
    find . -path ./.git -prune -o -type f -exec stat -f '%N %m %z' {} + 2>/dev/null | sort | cksum
}

publish() {
    # payload {"reload":<ms timestamp>} so pages can ignore replayed old messages
    curl -s "https://ps.pndsn.com/publish/${PUB_KEY}/${SUB_KEY}/0/${CHANNEL}/0/%7B%22reload%22%3A$(python3 -c 'import time;print(int(time.time()*1000))')%7D" >/dev/null \
        && echo "$(date +%T) published reload" \
        || echo "$(date +%T) publish failed"
}

echo "Watching $(pwd) -> channel '${CHANNEL}' (Ctrl-C to stop)"
last=$(snapshot)
while true; do
    sleep "$POLL"
    now=$(snapshot)
    [ "$now" = "$last" ] && continue
    # changes detected: wait until the folder is quiet
    while true; do
        sleep "$QUIET"
        next=$(snapshot)
        [ "$next" = "$now" ] && break
        now=$next
    done
    last=$now
    publish
done
