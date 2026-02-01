FROM golang:1.21-alpine AS builder
WORKDIR /build
COPY api/go.mod api/
WORKDIR /build/api
RUN go mod download
COPY api/ .
RUN CGO_ENABLED=0 GOOS=linux go build -o main .

FROM alpine:latest
WORKDIR /app
COPY --from=builder /build/api/main .
COPY data/ ./data/
ENV PORT=8080
ENV DATA_DIR=/app/data
EXPOSE 8080
CMD ["./main"]
