# Stage 1: Build React SPA
FROM node:22-alpine AS frontend
WORKDIR /app/web
COPY web/package*.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

# Stage 2: Build Go binary
FROM golang:1.25-alpine AS backend
WORKDIR /app
COPY go.mod go.sum* ./
RUN go mod download
COPY . .
COPY --from=frontend /app/web/dist ./internal/web/dist/
RUN CGO_ENABLED=0 go build -o /gallery ./cmd/gallery/

# Stage 3: Final image
FROM alpine:3.20
RUN apk add --no-cache ffmpeg curl
COPY --from=backend /gallery /gallery
EXPOSE 8080
ENTRYPOINT ["/gallery"]
