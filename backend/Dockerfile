# Banglar Voice backend — PocketBase custom Go app in production.
#
# IMPORTANT (fixed v5.0.1): this MUST build the custom binary from main.go —
# the /api/public/* endpoints, seeding, AI-ingest cron and key hot-swap all
# live in Go, NOT in the stock PocketBase binary. The old Dockerfile shipped
# the stock binary, which would 404 on every /api/public route.
#
# Build:  docker build -t banglar-voice-backend .
# Run:    docker run -d --name bv-backend --restart unless-stopped \
#           -p 8090:8090 -v bv_pb_data:/pb_data \
#           -e SITE_ORIGIN=https://banglarvoice24news.com \
#           -e GROQ_API_KEY=... -e GEMINI_API_KEY=... -e CF_API_KEY=account:token \
#           banglar-voice-backend
#
# Health: GET http://127.0.0.1:8090/api/bv/health

# ---------- Stage 1: build the custom binary ----------
FROM golang:1.27-alpine AS builder

RUN apk add --no-cache ca-certificates tzdata git

WORKDIR /src

# Cache module downloads first (layer caching).
COPY go.mod go.sum ./
RUN go mod download

# Build the whole source tree.
COPY . .
# CGO_ENABLED=0 -> static binary; -trimpath keeps the image small.
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/bv-pocketbase .

# ---------- Stage 2: minimal runtime ----------
FROM alpine:3.20

RUN apk add --no-cache ca-certificates tzdata \
 && adduser -D -h /pb pb

WORKDIR /pb

# Custom binary (all Go routes, cron, seeding).
COPY --from=builder /out/bv-pocketbase /pb/bv-pocketbase
# JS hooks + Go migrations are loaded from the working dir at boot.
COPY pb_hooks /pb/pb_hooks
COPY pb_migrations /pb/pb_migrations

USER pb
EXPOSE 8090

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s \
  CMD wget -qO- http://127.0.0.1:8090/api/bv/health || exit 1

# Flags match the custom app (serve subcommand comes from PocketBase cobra root).
CMD ["/pb/bv-pocketbase", "serve", "--http=0.0.0.0:8090", "--dir=/pb/pb_data"]
