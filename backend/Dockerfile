# Banglar Voice backend — PocketBase in production behind Caddy.
#
# Build:  docker build -t banglar-voice-backend .
# Run:    docker run -d --name bv-backend --restart unless-stopped \
#           -p 8090:8090 -v bv_pb_data:/pb_data \
#           -e GROQ_API_KEY=... -e GEMINI_API_KEY=... -e CF_API_KEY=account:token \
#           banglar-voice-backend

FROM alpine:3.20

ARG PB_VERSION=0.22.21
ARG TARGETARCH=amd64

RUN apk add --no-cache ca-certificates tzdata \
 && adduser -D -h /pb pb

# Stock PocketBase binary (hooks auto-load from /pb/pb_hooks).
ADD https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_${TARGETARCH}.zip /tmp/pb.zip
RUN unzip /tmp/pb.zip -d /pb && chmod +x /pb/pocketbase && rm /tmp/pb.zip

WORKDIR /pb
COPY pb_migrations /pb/pb_migrations
COPY pb_hooks /pb/pb_hooks

USER pb
EXPOSE 8090

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://127.0.0.1:8090/api/health || exit 1

CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:8090", "--dir=/pb/pb_data"]
