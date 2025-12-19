# Use a base image with Go and Node.js
FROM golang:1.23-bullseye

# Install system dependencies
RUN apt-get update && apt-get install -y \
  build-essential \
  libgtk-3-dev \
  libwebkit2gtk-4.0-dev \
  rpm \
  curl \
  && rm -rf /var/lib/apt/lists/*

# Install Node.js 22.x (LTS) to support modern TypeScript features
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
  && apt-get install -y nodejs

# Install TypeScript globally
RUN npm install -g typescript

# Ensure global npm binaries are in PATH
ENV PATH="/usr/local/bin:${PATH}"

# Install Wails
RUN go install github.com/wailsapp/wails/v2/cmd/wails@latest

# Install nfpm for packaging
RUN echo 'deb [trusted=yes] https://repo.goreleaser.com/apt/ /' | tee /etc/apt/sources.list.d/goreleaser.list \
  && apt-get update \
  && apt-get install -y nfpm

# Set working directory
WORKDIR /app

# Default command (can be overridden by docker-compose)
CMD ["wails", "build", "-platform", "linux/amd64"]
