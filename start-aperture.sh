#!/bin/bash
# start-aperture.sh - Simple script to start Aperture on TrueNAS

echo "Starting Aperture deployment..."

# Create necessary directories if they don't exist
mkdir -p /mnt/user/Media/ApertureLibraries
mkdir -p /mnt/user/appdata/aperture/backups

# Stop any existing containers
echo "Stopping existing containers..."
docker stop aperture aperture-db 2>/dev/null || true
docker rm aperture aperture-db 2>/dev/null || true

# Start the database first
echo "Starting database container..."
docker run -d \
  --name aperture-db \
  --restart unless-stopped \
  -e POSTGRES_USER=app \
  -e POSTGRES_PASSWORD=app \
  -e POSTGRES_DB=aperture \
  -v aperture_pgdata:/var/lib/postgresql/data \
  pgvector/pgvector:pg16

# Wait for database to be ready
echo "Waiting for database to be ready..."
until docker exec aperture-db pg_isready -U app -d aperture > /dev/null 2>&1; do
  sleep 1
done

echo "Database is ready!"

# Start the Aperture application
echo "Starting Aperture application..."
docker run -d \
  --name aperture \
  --restart unless-stopped \
  -e NODE_ENV=production \
  -e PORT=3456 \
  -e DATABASE_URL=postgres://app:app@aperture-db:5432/aperture \
  -e RUN_MIGRATIONS_ON_START=true \
  -e TZ=America/New_York \
  -e APP_BASE_URL=http://localhost:3456 \
  -e SESSION_SECRET="your-session-secret-here-at-least-32-chars" \
  -p 3456:3456 \
  -v /mnt/user/Media/ApertureLibraries:/aperture-libraries \
  -v /mnt/user/appdata/aperture/backups:/backups \
  -v /mnt/user/Media:/media:ro \
  ghcr.io/damienigg/aperture:latest

echo "Aperture deployment started!"
echo "Access the application at: http://localhost:3456"
echo "You may need to replace 'localhost' with your server's IP address."