#!/bin/bash
# start-aperture.sh - Fixed script to start Aperture on TrueNAS with proper networking

echo "Starting Aperture deployment..."

# Create necessary directories if they don't exist (adjust paths as needed for your TrueNAS setup)
# You may need to create these manually with proper permissions on TrueNAS
echo "Note: Make sure these directories exist with proper permissions:"
echo "  - /mnt/user/Media/ApertureLibraries"
echo "  - /mnt/user/appdata/aperture/backups"
echo "  - /mnt/user/Media (read-only access)"

# Create a custom network for the containers to communicate
echo "Creating custom network..."
docker network create aperture-network 2>/dev/null || true

# Stop any existing containers
echo "Stopping existing containers..."
docker stop aperture aperture-db 2>/dev/null || true
docker rm aperture aperture-db 2>/dev/null || true

# Start the database first with the custom network
echo "Starting database container..."
docker run -d \
  --name aperture-db \
  --network aperture-network \
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

# Start the Aperture application with the same network and proper user
echo "Starting Aperture application..."
docker run -d \
  --name aperture \
  --network aperture-network \
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
  --user root \
  ghcr.io/damienigg/aperture:latest

echo "Aperture deployment started!"
echo "Access the application at: http://localhost:3456"
echo "You may need to replace 'localhost' with your server's IP address."
echo ""
echo "If you get permission errors, you may need to run:"
echo "  sudo chown -R 1001:1001 /mnt/user/Media/ApertureLibraries"
echo "  sudo chmod -R 777 /mnt/user/Media/ApertureLibraries"